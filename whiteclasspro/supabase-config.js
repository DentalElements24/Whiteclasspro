// Supabase-Verbindung. Beide Werte sind öffentlich und dürfen im Browser-Code stehen.
// NIEMALS den "secret"/"service_role"-Key hier eintragen.
// "shop" ist die Kennung dieses Shops in der gemeinsamen Datenbank (Tabelle shops, shop-admin) —
// darüber trennen Kasse und Webhook Bestellungen von denen anderer Shops (z. B. Nightguard), die
// sich dasselbe Stripe-Konto teilen.
window.WCP_SUPABASE = {
  url: 'https://xjztqhhmjnpwnxkqmgif.supabase.co',
  key: 'sb_publishable_DiSIEhgdIEG6ZHHGd8Dwvw_sqfDlusC',
  shop: 'whiteclasspro'
};
