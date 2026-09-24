// Vercel-Serverfunktion: prüft einen Rabattcode gegen Stripe und liefert nur die Angaben
// zurück, die der Warenkorb für die Anzeige braucht (Prozent/Betrag). Die eigentliche Anwendung
// beim Bezahlen prüft api/checkout.js den Code sicherheitshalber erneut — der Client kann den
// Rabatt also nicht selbst erfinden oder verändern.
// Rabattcodes werden im Stripe-Dashboard unter Produkte -> Gutscheincodes angelegt.
const fail = (res, status, error) => res.status(status).json({ error });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Nur POST erlaubt.');
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY ist nicht gesetzt');
    return fail(res, 500, 'Rabattcodes sind noch nicht eingerichtet.');
  }
  const code = String((req.body && req.body.code) || '').trim();
  if (!code) return fail(res, 400, 'Bitte einen Rabattcode eingeben.');

  try {
    const params = new URLSearchParams({ code, active: 'true', limit: '1' });
    const r = await fetch('https://api.stripe.com/v1/promotion_codes?' + params, {
      headers: { Authorization: 'Bearer ' + secret }
    });
    const data = await r.json();
    const promo = data && Array.isArray(data.data) && data.data[0];
    if (!r.ok || !promo || !promo.coupon || promo.coupon.valid === false) {
      return fail(res, 404, 'Dieser Rabattcode ist ungültig oder abgelaufen.');
    }
    res.status(200).json({
      code: promo.code,
      percentOff: promo.coupon.percent_off || null,
      amountOff: promo.coupon.amount_off || null
    });
  } catch (err) {
    console.error('Stripe nicht erreichbar:', err && err.message);
    return fail(res, 502, 'Der Rabattcode konnte gerade nicht geprüft werden. Bitte versuche es später erneut.');
  }
};
