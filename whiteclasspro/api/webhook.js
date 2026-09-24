// Vercel-Serverfunktion: Stripe-Webhook. Speichert bezahlte Bestellungen in der Supabase-Tabelle
// "orders" (siehe supabase/orders.sql), damit sie im Kundenkonto (konto.html, Tab
// "Meine Bestellungen") sichtbar werden. Prüft die Signatur selbst per HMAC-SHA256, weil dieses
// Projekt bewusst ohne Stripe-SDK auskommt (siehe api/checkout.js) — Stripe signiert jede
// Webhook-Anfrage mit dem im Dashboard erzeugten Signing Secret.
//
// Schreibt mit dem Supabase SERVICE-ROLE-Key (umgeht Row Level Security) — dieser Key darf
// NIEMALS im Browser-Code landen, nur hier als Vercel-Umgebungsvariable.
const crypto = require('crypto');

const loadSupabaseConfig = () => {
  const hadWindow = 'window' in global;
  if (!hadWindow) global.window = {};
  try {
    require('../supabase-config.js');
    return global.window.WCP_SUPABASE || {};
  } finally {
    if (!hadWindow) delete global.window;
  }
};
const supabase = loadSupabaseConfig();

const TOLERANCE_SECONDS = 300;

const getRawBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => resolve(data));
  req.on('error', reject);
});

// Stripes Signaturheader hat das Format "t=<Unix-Zeit>,v1=<HMAC-Hex>[,v0=...]".
const verifySignature = (rawBody, header, secret) => {
  if (!header) return false;
  const parts = {};
  header.split(',').forEach((kv) => {
    var i = kv.indexOf('=');
    if (i > -1) parts[kv.slice(0, i)] = kv.slice(i + 1);
  });
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(parts.v1, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !stripeSecret || !serviceRoleKey || !supabase.url) {
    console.error('Webhook: Konfiguration unvollständig (STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY prüfen)');
    return res.status(500).end();
  }

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    return res.status(400).end();
  }

  if (!verifySignature(rawBody, req.headers['stripe-signature'], webhookSecret)) {
    console.error('Webhook: ungültige oder fehlende Signatur');
    return res.status(400).end();
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).end();
  }

  // async_payment_succeeded deckt Zahlarten ab, die erst zeitverzögert bestätigt werden
  // (z. B. Lastschrift) — completed reicht bei Kartenzahlung meist schon.
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return res.status(200).end();
  }

  const session = event.data && event.data.object;
  if (!session || session.payment_status !== 'paid') {
    return res.status(200).end(); // z. B. noch offene asynchrone Zahlung
  }

  const userId = session.client_reference_id || (session.metadata && session.metadata.user_id);
  if (!userId) {
    console.error('Webhook: Session ohne user_id/client_reference_id:', session.id);
    return res.status(200).end();
  }

  // Positionen bei Stripe abfragen statt aus products.json zu rekonstruieren — hier zählt,
  // was zum Zeitpunkt des Kaufs tatsächlich berechnet wurde, auch wenn sich Preise später ändern.
  // Die Produkt-ID selbst steht nicht in den line_items (nur Name/Menge/Preis), sondern in
  // metadata.cart ("id:qty,id:qty,…", von api/checkout.js gesetzt) — beide Listen entstehen dort
  // aus demselben Array in derselben Reihenfolge, lassen sich also 1:1 zusammenführen. Die ID
  // braucht "Nochmal bestellen" im Kundenkonto, um den Artikel wieder in den Warenkorb zu legen.
  let items = [];
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?limit=100`, {
      headers: { Authorization: `Bearer ${stripeSecret}` }
    });
    const data = await r.json();
    if (r.ok && Array.isArray(data.data)) {
      const cartIds = ((session.metadata && session.metadata.cart) || '')
        .split(',').filter(Boolean).map((pair) => pair.split(':')[0]);
      items = data.data.map((li, i) => ({ id: cartIds[i] || null, name: li.description, qty: li.quantity, amount: li.amount_total }));
    }
  } catch (err) {
    console.error('Webhook: Positionen konnten nicht geladen werden:', err && err.message);
  }

  const order = {
    user_id: userId,
    stripe_session_id: session.id,
    status: 'paid',
    amount_total: session.amount_total,
    currency: session.currency,
    items
  };

  try {
    const r = await fetch(`${String(supabase.url).replace(/\/$/, '')}/rest/v1/orders?on_conflict=stripe_session_id`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(order)
    });
    if (!r.ok) {
      console.error('Webhook: Bestellung konnte nicht gespeichert werden:', r.status, await r.text());
      return res.status(500).end(); // Stripe soll die Zustellung erneut versuchen
    }
  } catch (err) {
    console.error('Webhook: Supabase nicht erreichbar:', err && err.message);
    return res.status(500).end();
  }

  res.status(200).end();
};

// Ohne diese Zeile würde Vercel den Body schon als JSON parsen, bevor wir die rohen Bytes für
// die Signaturprüfung sehen — Stripes Signatur passt dann nie.
module.exports.config = { api: { bodyParser: false } };
