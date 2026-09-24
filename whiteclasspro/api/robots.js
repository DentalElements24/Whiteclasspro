// Vercel-Serverfunktion statt statischer robots.txt: die Domain wird automatisch aus der
// Anfrage erkannt (wie schon in api/checkout.js), damit hier vor Live-Gang nichts von Hand
// eingetragen werden muss. Über die Vercel-Umgebungsvariable SITE_URL lässt sich die Domain
// bei Bedarf fest vorgeben.
module.exports = async (req, res) => {
  const origin = process.env.SITE_URL || `https://${req.headers.host}`;
  const body = 'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ' + origin + '/sitemap.xml\n';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(body);
};
