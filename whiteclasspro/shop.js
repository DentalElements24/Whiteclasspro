// White Class Pro — Produktdaten laden und Karten / Detailseite rendern
// Preise in products.json sind in Cent (2900 = 29,00 €).
(function () {
  var eur = function (cents) {
    return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var stars = function (rating) {
    var full = Math.round(rating);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  };

  var loadProducts = function () {
    return fetch('products.json').then(function (r) {
      if (!r.ok) throw new Error('products.json nicht ladbar');
      return r.json();
    });
  };

  var cardHtml = function (p) {
    var old = p.oldPrice ? '<span class="catalog-price-old">' + eur(p.oldPrice) + '</span>' : '';
    return '' +
      '<div class="catalog-card" id="' + esc(p.id) + '">' +
        '<a class="catalog-media" href="produkt.html?id=' + encodeURIComponent(p.id) + '" style="text-decoration:none;">' + p.emoji + '</a>' +
        '<div class="catalog-body">' +
          '<span class="catalog-badge' + (p.badgeRed ? ' red' : '') + '">' + esc(p.badge) + '</span>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p class="catalog-desc">' + esc(p.short) + '</p>' +
          '<div class="catalog-stars">' + stars(p.rating) + ' ' + String(p.rating).replace('.', ',') + ' · ' + p.reviews + ' Bewertungen</div>' +
          '<div class="catalog-price-row">' + old + '<span class="catalog-price">' + eur(p.price) + '</span></div>' +
          '<a href="produkt.html?id=' + encodeURIComponent(p.id) + '" class="btn btn-primary">Ansehen</a>' +
        '</div>' +
      '</div>';
  };

  // Kategorieseiten / Startseite: <div class="catalog-grid" data-category="zahnaufhellung">
  // data-featured="true" zeigt nur Produkte mit "featured": true.
  var renderGrids = function (products) {
    document.querySelectorAll('.catalog-grid[data-category], .catalog-grid[data-featured]').forEach(function (grid) {
      var cat = grid.getAttribute('data-category');
      var onlyFeatured = grid.getAttribute('data-featured') === 'true';
      var list = products.filter(function (p) {
        return (!cat || p.category === cat) && (!onlyFeatured || p.featured);
      });
      grid.innerHTML = list.map(cardHtml).join('');
    });
  };

  // Detailseite: produkt.html?id=...
  var renderDetail = function (products) {
    var root = document.getElementById('product-detail');
    if (!root) return;
    var id = new URLSearchParams(location.search).get('id');
    var p = products.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      root.innerHTML = '<h1>Produkt nicht gefunden</h1><p><a href="index.html">Zurück zur Startseite</a></p>';
      return;
    }
    document.title = p.name + ' — White Class Pro';
    var catName = p.category === 'zahnaufhellung' ? 'Zahnaufhellung' : 'Zahnstärkung';
    var old = p.oldPrice ? '<span class="catalog-price-old">' + eur(p.oldPrice) + '</span>' : '';
    var hint = p.supplement
      ? '<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-top:20px; font-size:13px; color:var(--text-secondary); line-height:1.6;">ℹ️ Nahrungsergänzungsmittel ersetzen keine ausgewogene Ernährung und keine zahnärztliche Behandlung. Bei bestehenden Erkrankungen, Medikamenteneinnahme, Schwangerschaft oder Stillzeit vor der Einnahme Rücksprache mit einem Arzt oder Apotheker halten.</div>'
      : '';
    root.innerHTML = '' +
      '<p style="font-size:13px; margin-bottom:18px;"><a href="' + p.category + '.html">← ' + catName + '</a></p>' +
      '<div class="catalog-card" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); overflow:hidden;">' +
        '<div class="catalog-media" style="min-height:280px; font-size:96px;">' + p.emoji + '</div>' +
        '<div class="catalog-body" style="padding:28px;">' +
          '<span class="catalog-badge' + (p.badgeRed ? ' red' : '') + '">' + esc(p.badge) + '</span>' +
          '<h1 style="font-size:26px; margin:10px 0;">' + esc(p.name) + '</h1>' +
          '<div class="catalog-stars">' + stars(p.rating) + ' ' + String(p.rating).replace('.', ',') + ' · ' + p.reviews + ' Bewertungen</div>' +
          '<div class="catalog-price-row" style="margin:14px 0;">' + old + '<span class="catalog-price">' + eur(p.price) + '</span></div>' +
          '<p style="font-size:12px; color:var(--text-secondary); margin:-6px 0 14px;">inkl. MwSt., zzgl. <a href="versand.html">Versand</a></p>' +
          '<p class="catalog-desc">' + esc(p.description) + '</p>' +
          '<button type="button" class="btn btn-primary" data-add-to-cart="' + esc(p.id) + '" style="width:100%;">In den Warenkorb</button>' +
          hint +
        '</div>' +
      '</div>';
  };

  window.WCP = window.WCP || {};
  window.WCP.eur = eur;
  window.WCP.loadProducts = loadProducts;

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('.catalog-grid[data-category], .catalog-grid[data-featured], #product-detail')) return;
    loadProducts().then(function (products) {
      renderGrids(products);
      renderDetail(products);
    }).catch(function () {
      document.querySelectorAll('.catalog-grid[data-category], .catalog-grid[data-featured]').forEach(function (g) {
        g.innerHTML = '<p>Produkte konnten nicht geladen werden. Bitte Seite neu laden.</p>';
      });
    });
  });
})();
