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

  // Sortieroptionen für die Katalog-Toolbar (Kategorieseiten)
  var SORTS = {
    'preis-auf': function (a, b) { return a.price - b.price; },
    'preis-ab': function (a, b) { return b.price - a.price; },
    bewertung: function (a, b) { return b.rating - a.rating; }
  };

  // Kategorieseiten / Startseite: <div class="catalog-grid" data-category="zahnaufhellung">
  // data-featured="true" zeigt nur Produkte mit "featured": true. Echte Kategorieseiten
  // bekommen zusätzlich eine Such-/Sortierleiste; die Bestseller-Kachel auf der Startseite nicht.
  var renderGrids = function (products) {
    document.querySelectorAll('.catalog-grid[data-category], .catalog-grid[data-featured]').forEach(function (grid) {
      var cat = grid.getAttribute('data-category');
      var onlyFeatured = grid.getAttribute('data-featured') === 'true';
      var base = products.filter(function (p) {
        return (!cat || p.category === cat) && (!onlyFeatured || p.featured);
      });

      var toolbar = null;
      if (cat) {
        toolbar = document.createElement('div');
        toolbar.className = 'catalog-toolbar';
        toolbar.innerHTML =
          '<input type="search" class="catalog-search" placeholder="Produkte durchsuchen …" aria-label="Produkte durchsuchen">' +
          '<select class="catalog-sort" aria-label="Sortieren">' +
            '<option value="empfehlung">Empfehlung</option>' +
            '<option value="preis-auf">Preis aufsteigend</option>' +
            '<option value="preis-ab">Preis absteigend</option>' +
            '<option value="bewertung">Beste Bewertung</option>' +
          '</select>';
        grid.parentNode.insertBefore(toolbar, grid);
      }

      var draw = function () {
        var q = toolbar ? toolbar.querySelector('.catalog-search').value.trim().toLowerCase() : '';
        var list = base.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) !== -1; });
        var cmp = toolbar && SORTS[toolbar.querySelector('.catalog-sort').value];
        if (cmp) list = list.slice().sort(cmp);
        grid.innerHTML = list.length
          ? list.map(cardHtml).join('')
          : q
            ? '<p class="catalog-empty">Keine Produkte gefunden für „' + esc(q) + '“.</p>'
            : '<p class="catalog-empty">Hier entstehen gerade neue Produkte — schau bald wieder vorbei.</p>';
        // Zähler auf Kategorieseiten passend zur Produktzahl setzen
        var counter = document.querySelector('.catalog-count');
        if (cat && counter) counter.textContent = countLabel(list.length);
      };

      if (toolbar) {
        toolbar.querySelector('.catalog-search').addEventListener('input', draw);
        toolbar.querySelector('.catalog-sort').addEventListener('change', draw);
      }
      draw();
    });
  };

  var countLabel = function (n) {
    return n === 0 ? 'Demnächst' : (n === 1 ? '1 Produkt' : n + ' Produkte');
  };

  // Kategorie-Kacheln (Startseite): <span data-cat-count="zahnaufhellung">
  var fillCategoryCounts = function (products) {
    document.querySelectorAll('[data-cat-count]').forEach(function (el) {
      var n = products.filter(function (p) { return p.category === el.getAttribute('data-cat-count'); }).length;
      el.textContent = (n === 0 ? 'Demnächst' : countLabel(n) + ' ansehen') + ' →';
    });
  };

  var CATEGORY_NAMES = {
    zahnaufhellung: 'Zahnaufhellung',
    zahnstaerkung: 'Zahnstärkung',
    zahnreinigung: 'Zahnreinigung'
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
    var catName = CATEGORY_NAMES[p.category] || 'Produkte';
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
    renderRelated(products, p);
  };

  // "Das könnte dir auch gefallen": erst aus derselben Kategorie auffüllen, sonst mit
  // anderen Produkten ergänzen — so gibt es auch bei kleinen Kategorien einen Vorschlag.
  var renderRelated = function (products, current) {
    var root = document.getElementById('related-products');
    if (!root) return;
    var sameCategory = products.filter(function (p) { return p.id !== current.id && p.category === current.category; });
    var others = products.filter(function (p) { return p.id !== current.id && p.category !== current.category; });
    var list = sameCategory.concat(others).slice(0, 3);
    root.innerHTML = list.length
      ? '<h2>Das könnte dir auch gefallen</h2><div class="catalog-grid">' + list.map(cardHtml).join('') + '</div>'
      : '';
  };

  window.WCP = window.WCP || {};
  window.WCP.eur = eur;
  window.WCP.esc = esc;
  window.WCP.cardHtml = cardHtml;
  window.WCP.loadProducts = loadProducts;

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('.catalog-grid[data-category], .catalog-grid[data-featured], #product-detail, [data-cat-count]')) return;
    loadProducts().then(function (products) {
      renderGrids(products);
      fillCategoryCounts(products);
      renderDetail(products);
    }).catch(function () {
      document.querySelectorAll('.catalog-grid[data-category], .catalog-grid[data-featured]').forEach(function (g) {
        g.innerHTML = '<p>Produkte konnten nicht geladen werden. Bitte Seite neu laden.</p>';
      });
    });
  });
})();
