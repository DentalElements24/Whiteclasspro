// Gemeinsame Helfer der Serverfunktionen für Supabase. Der Unterstrich im Dateinamen sorgt dafür,
// dass Vercel hieraus keinen eigenen Endpunkt /api/_supabase macht.
//
// Öffentliche Supabase-Werte (URL, Publishable Key, Shop-Kennung) kommen aus derselben Datei wie
// im Browser, damit sie nur an einer Stelle gepflegt werden. Die Datei setzt window.WCP_SUPABASE.
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
const config = loadSupabaseConfig();
const base = String(config.url || '').replace(/\/$/, '');

// Dieselben Spalten und dieselbe Umwandlung wie loadProducts() in shop.js, damit Browser und
// Server ein Produkt gleich sehen (dieselben Feldnamen wie früher in der mittlerweile entfernten products.json).
const PRODUCT_COLUMNS = 'slug,category,name,emoji,badge,badge_red,price,old_price,short,description,featured,supplement,image_url';
const toProduct = (r) => ({
  id: r.slug,
  category: r.category,
  name: r.name,
  emoji: r.emoji || '',
  badge: r.badge || '',
  badgeRed: !!r.badge_red,
  price: r.price,
  oldPrice: r.old_price || null,
  short: r.short || '',
  description: r.description || '',
  featured: !!r.featured,
  supplement: !!r.supplement,
  image: r.image_url || null
});

// Alle sichtbaren Produkte dieses Shops. Liest mit dem öffentlichen Key — Row Level Security
// liefert dabei ohnehin nur sichtbare (active) Produkte. Wirft bei Fehlern.
const fetchProducts = async () => {
  if (!base || !config.key || !config.shop) throw new Error('Supabase-Konfiguration unvollständig');
  const url = `${base}/rest/v1/products?select=${PRODUCT_COLUMNS}&shop_id=eq.${encodeURIComponent(config.shop)}` +
    '&active=is.true&order=sort_order.asc,created_at.asc';
  const r = await fetch(url, { headers: { apikey: config.key } });
  if (!r.ok) throw new Error(`Produkte nicht ladbar (HTTP ${r.status})`);
  return (await r.json()).map(toProduct);
};

module.exports = { config, base, fetchProducts };
