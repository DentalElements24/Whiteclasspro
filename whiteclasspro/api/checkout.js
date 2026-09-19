// Vercel-Serverfunktion: erzeugt eine Stripe-Checkout-Sitzung aus dem Warenkorb.
// Preise und Versand werden HIER aus products.json / shipping.json berechnet —
// vom Browser kommen nur Produkt-IDs und Mengen. Der Stripe-Schlüssel steht in der
// Vercel-Umgebungsvariable STRIPE_SECRET_KEY und nie im Code.
const products = require('../products.json');
const shipping = require('../shipping.json');

const MAX_QTY = 10;
const MAX_LINES = 20;

const fail = (res, status, error) => res.status(status).json({ error });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Nur POST erlaubt.');
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY ist nicht gesetzt');
    return fail(res, 500, 'Die Kasse ist noch nicht eingerichtet.');
  }

  // --- Warenkorb prüfen und Mengen je Produkt zusammenfassen ---
  const items = req.body && req.body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return fail(res, 400, 'Dein Warenkorb ist leer oder ungültig.');
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const qtyById = new Map();
  for (const item of items) {
    const qty = Number(item && item.qty);
    if (!item || typeof item.id !== 'string' || !byId.has(item.id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return fail(res, 400, 'Ein Produkt im Warenkorb ist nicht mehr verfügbar. Bitte prüfe deinen Warenkorb.');
    }
    qtyById.set(item.id, Math.min(MAX_QTY, (qtyById.get(item.id) || 0) + qty));
  }

  // --- Summen serverseitig berechnen ---
  let subtotal = 0;
  const lines = [];
  for (const [id, qty] of qtyById) {
    const p = byId.get(id);
    subtotal += p.price * qty;
    lines.push({ p, qty });
  }
  const shippingCost = subtotal >= shipping.freeFrom ? 0 : shipping.flat;

  // --- Stripe-Parameter (form-encoded) ---
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('locale', 'de');
  params.set('billing_address_collection', 'auto');
  shipping.countries.forEach((c, i) => params.set(`shipping_address_collection[allowed_countries][${i}]`, c));

  lines.forEach(({ p, qty }, i) => {
    params.set(`line_items[${i}][quantity]`, String(qty));
    params.set(`line_items[${i}][price_data][currency]`, 'eur');
    params.set(`line_items[${i}][price_data][unit_amount]`, String(p.price));
    params.set(`line_items[${i}][price_data][product_data][name]`, p.name);
    params.set(`line_items[${i}][price_data][product_data][description]`, p.short);
  });

  params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  params.set('shipping_options[0][shipping_rate_data][display_name]', shippingCost === 0 ? 'Versandkostenfrei' : 'Standardversand');
  params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shippingCost));
  params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');

  params.set('custom_text[submit][message]', 'Mit Klick auf „Bezahlen“ gibst du eine zahlungspflichtige Bestellung ab. Es gelten unsere AGB und die Widerrufsbelehrung.');
  params.set('metadata[cart]', lines.map(({ p, qty }) => `${p.id}:${qty}`).join(',').slice(0, 500));

  const origin = process.env.SITE_URL || `https://${req.headers.host}`;
  params.set('success_url', `${origin}/bestellung-erfolgreich.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/warenkorb.html`);

  const createSession = async (body) => {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    return { r, data: await r.json() };
  };

  try {
    // Nur Euro: Stripes automatische Umrechnung in Landeswährungen (Adaptive Pricing) abschalten.
    params.set('adaptive_pricing[enabled]', 'false');
    let { r, data } = await createSession(params);
    // Ältere Stripe-API-Versionen kennen den Parameter nicht — dann ohne ihn erneut versuchen
    // (Adaptive Pricing lässt sich zusätzlich im Stripe-Dashboard abschalten).
    if (r.status === 400 && data && data.error && /adaptive_pricing/.test(data.error.param || data.error.message || '')) {
      params.delete('adaptive_pricing[enabled]');
      ({ r, data } = await createSession(params));
    }
    if (!r.ok || !data.url) {
      console.error('Stripe-Fehler:', r.status, JSON.stringify(data && data.error));
      return fail(res, 502, 'Die Zahlung konnte gerade nicht gestartet werden. Bitte versuche es später erneut.');
    }
    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Stripe nicht erreichbar:', err && err.message);
    return fail(res, 502, 'Die Zahlung konnte gerade nicht gestartet werden. Bitte versuche es später erneut.');
  }
};
