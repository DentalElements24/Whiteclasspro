// Vercel-Serverfunktion: erzeugt sitemap.xml live aus products.json, damit neue oder
// entfernte Produkte nie eine veraltete, von Hand gepflegte Sitemap hinterlassen.
// Seiten mit <meta name="robots" content="noindex"> (Konto, Login, Warenkorb,
// Bestellbestätigung) tauchen absichtlich nicht auf.
const products = require('../products.json');

const STATIC_PAGES = [
  { path: 'index.html', priority: '1.0', changefreq: 'weekly' },
  { path: 'zahnaufhellung.html', priority: '0.9', changefreq: 'weekly' },
  { path: 'zahnstaerkung.html', priority: '0.9', changefreq: 'weekly' },
  { path: 'zahnreinigung.html', priority: '0.5', changefreq: 'monthly' },
  { path: 'ueber-uns.html', priority: '0.6', changefreq: 'monthly' },
  { path: 'kontakt.html', priority: '0.5', changefreq: 'yearly' },
  { path: 'versand.html', priority: '0.4', changefreq: 'yearly' },
  { path: 'impressum.html', priority: '0.2', changefreq: 'yearly' },
  { path: 'agb.html', priority: '0.2', changefreq: 'yearly' },
  { path: 'datenschutz.html', priority: '0.2', changefreq: 'yearly' },
  { path: 'widerruf.html', priority: '0.2', changefreq: 'yearly' }
];

module.exports = async (req, res) => {
  const origin = process.env.SITE_URL || `https://${req.headers.host}`;

  const urls = STATIC_PAGES.map((p) =>
    `<url><loc>${origin}/${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );
  products.forEach((p) => {
    urls.push(`<url><loc>${origin}/produkt.html?id=${encodeURIComponent(p.id)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  });

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n</urlset>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(xml);
};
