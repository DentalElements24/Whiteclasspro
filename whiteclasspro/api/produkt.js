// Vercel-Serverfunktion: liefert produkt.html mit pro-Produkt SEO-Tags aus.
// Notwendig, weil Social-Media-Vorschauen (WhatsApp, Facebook, …) und die meisten
// Suchmaschinen-Snippets kein JavaScript ausführen und sonst nur den generischen
// Platzhalter-Titel/Text sähen. Die eigentliche Seite bleibt clientseitig (shop.js);
// diese Funktion ersetzt nur die Meta-Tags im <head>, bevor die HTML-Datei ausgeliefert wird.
const fs = require('fs');
const path = require('path');
const products = require('../products.json');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const p = products.find((x) => x.id === id);
  const origin = process.env.SITE_URL || `https://${req.headers.host}`;

  const title = p ? `${p.name} — White Class Pro` : 'Produkt — White Class Pro';
  const description = p ? p.short : 'Zahnaufhellung und zahnstärkende Nahrungsergänzung von White Class Pro.';
  const url = `${origin}/produkt.html${id ? '?id=' + encodeURIComponent(id) : ''}`;
  const image = `${origin}/logo.jpg`;

  let seoTags = '<meta name="description" content="' + esc(description) + '">\n' +
    '<link rel="canonical" href="' + esc(url) + '">\n' +
    '<meta property="og:type" content="' + (p ? 'product' : 'website') + '">\n' +
    '<meta property="og:site_name" content="White Class Pro">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n' +
    '<meta property="og:description" content="' + esc(description) + '">\n' +
    '<meta property="og:url" content="' + esc(url) + '">\n' +
    '<meta property="og:image" content="' + esc(image) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">';

  if (p) {
    // Hinweis: aggregateRating bewusst weggelassen — rating/reviews in products.json sind
    // aktuell Platzhalterwerte ohne echtes Bewertungssystem dahinter. Google wertet erfundene
    // Bewertungssterne in Rich-Snippets als irreführend; erst ergänzen, wenn echte Reviews da sind.
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description || p.short,
      sku: p.id,
      image: image,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: (p.price / 100).toFixed(2),
        availability: 'https://schema.org/InStock',
        url: url
      }
    };
    seoTags += '\n<script type="application/ld+json">' + JSON.stringify(ld) + '</script>';
  }

  try {
    const filePath = path.join(__dirname, '..', 'produkt.html');
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('<title>Produkt — White Class Pro</title>', '<title>' + esc(title) + '</title>');
    html = html.replace('<!--SEO-->', seoTags);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('produkt.html konnte nicht ausgeliefert werden:', err && err.message);
    res.status(500).send('Diese Seite ist gerade nicht verfügbar.');
  }
};
