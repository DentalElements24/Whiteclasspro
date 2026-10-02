// White Class Pro — Produktdaten laden und Karten / Detailseite rendern
// Produkte kommen aus der gemeinsamen Datenbank (Supabase, gepflegt in der Shop-Zentrale).
// Preise sind in Cent (2900 = 29,00 €).
(function () {
  var eur = function (cents) {
    return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Dieselben Spalten und Feldnamen wie toProduct() in api/_supabase.js (serverseitig)
  var PRODUCT_COLUMNS = 'slug,category,name,emoji,badge,badge_red,price,old_price,short,description,featured,supplement,image_url';
  var toProduct = function (r) {
    return {
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
    };
  };

  // Einmal pro Seitenaufruf laden, auch wenn mehrere Stellen (Katalog, Warenkorb, Suche) fragen.
  // Die Datenbank liefert Besuchern ohnehin nur sichtbare Produkte; active=is.true hält die
  // Liste auch für angemeldete Admins, die im Shop stöbern, identisch.
  var productsPromise = null;
  var loadProducts = function () {
    if (!productsPromise) {
      var cfg = window.WCP_SUPABASE || {};
      var url = String(cfg.url || '').replace(/\/$/, '') + '/rest/v1/products?select=' + PRODUCT_COLUMNS +
        '&shop_id=eq.' + encodeURIComponent(cfg.shop || '') + '&active=is.true&order=sort_order.asc,created_at.asc';
      productsPromise = fetch(url, { headers: { apikey: cfg.key } }).then(function (r) {
        if (!r.ok) throw new Error('Produkte nicht ladbar');
        return r.json();
      }).then(function (rows) { return rows.map(toProduct); });
      productsPromise.catch(function () { productsPromise = null; });   // später erneut versuchen
    }
    return productsPromise;
  };

  // Shop-weite Einstellungen aus der Shop-Zentrale: Kategorienamen, Lieferzeit, Kontaktdaten,
  // Promo-Banner-Text, TikTok-Link. Einmal pro Seitenaufruf laden.
  var shopInfoPromise = null;
  var loadShopInfo = function () {
    if (!shopInfoPromise) {
      var cfg = window.WCP_SUPABASE || {};
      var url = String(cfg.url || '').replace(/\/$/, '') + '/rest/v1/shops?select=' +
        'categories,delivery_time,promo_banner,contact_phone,contact_email,contact_vat_id,social_tiktok' +
        '&id=eq.' + encodeURIComponent(cfg.shop || '');
      shopInfoPromise = fetch(url, { headers: { apikey: cfg.key } }).then(function (r) {
        if (!r.ok) throw new Error('Shop-Einstellungen nicht ladbar');
        return r.json();
      }).then(function (rows) { return rows[0] || {}; });
      shopInfoPromise.catch(function () { shopInfoPromise = null; });
    }
    return shopInfoPromise;
  };

  // Name einer Kategorie für Überschriften/Breadcrumbs; ohne Treffer das Kürzel selbst
  var categoryName = function (info, id) {
    var cats = (info && info.categories) || [];
    var hit = cats.filter(function (c) { return c.id === id; })[0];
    return hit ? hit.name : id;
  };

  // Kategorien mit einer eigenen, von Hand gestalteten Seite (Werbetext, eigenes Bild). Jede
  // andere Kategorie — auch neu in der Shop-Zentrale angelegte — landet auf der schlichten,
  // generischen kategorie.html, die den Shop-Namen per ?id= aus der Adresse liest.
  var CATEGORY_PAGES = { zahnaufhellung: 'zahnaufhellung.html', zahnstaerkung: 'zahnstaerkung.html', zahnreinigung: 'zahnreinigung.html' };
  var categoryHref = function (id) {
    return CATEGORY_PAGES[id] || 'kategorie.html?id=' + encodeURIComponent(id);
  };

  // Produktfoto, falls hochgeladen — sonst das Emoji als Platzhalter
  var mediaHtml = function (p) {
    return p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">'
      : esc(p.emoji);
  };

  var cardHtml = function (p) {
    var old = p.oldPrice ? '<span class="catalog-price-old">' + eur(p.oldPrice) + '</span>' : '';
    return '' +
      '<div class="catalog-card" id="' + esc(p.id) + '">' +
        '<a class="catalog-media" href="produkt.html?id=' + encodeURIComponent(p.id) + '" style="text-decoration:none;">' + mediaHtml(p) + '</a>' +
        '<div class="catalog-body">' +
          '<span class="catalog-badge' + (p.badgeRed ? ' red' : '') + '">' + esc(p.badge) + '</span>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p class="catalog-desc">' + esc(p.short) + '</p>' +
          '<div class="catalog-price-row">' + old + '<span class="catalog-price">' + eur(p.price) + '</span></div>' +
          '<a href="produkt.html?id=' + encodeURIComponent(p.id) + '" class="btn btn-primary">Ansehen</a>' +
        '</div>' +
      '</div>';
  };

  // Sortieroptionen für die Katalog-Toolbar (Kategorieseiten)
  var SORTS = {
    'preis-auf': function (a, b) { return a.price - b.price; },
    'preis-ab': function (a, b) { return b.price - a.price; }
  };

  // Kategorieseiten / Startseite: <div class="catalog-grid" data-category="zahnaufhellung">
  // data-featured="true" zeigt nur Produkte mit "featured": true. Echte Kategorieseiten
  // bekommen zusätzlich eine Such-/Sortierleiste; die Bestseller-Kachel auf der Startseite nicht.
  var renderGrids = function (products) {
    document.querySelectorAll('.catalog-grid[data-category], .catalog-grid[data-featured], .catalog-grid[data-category-from-url]').forEach(function (grid) {
      // kategorie.html?id=… (neu angelegte Kategorien ohne eigene Seite) liest das Kürzel aus der Adresse
      var cat = grid.hasAttribute('data-category-from-url')
        ? new URLSearchParams(location.search).get('id') || ''
        : grid.getAttribute('data-category');
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

  // Detailseite: produkt.html?id=...
  var renderDetail = function (products, info) {
    var root = document.getElementById('product-detail');
    if (!root) return;
    var id = new URLSearchParams(location.search).get('id');
    var p = products.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      root.innerHTML = '<h1>Produkt nicht gefunden</h1><p><a href="index.html">Zurück zur Startseite</a></p>';
      return;
    }
    document.title = p.name + ' — White Class Pro';
    var catName = categoryName(info, p.category);
    var old = p.oldPrice ? '<span class="catalog-price-old">' + eur(p.oldPrice) + '</span>' : '';
    var hint = p.supplement
      ? '<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-top:20px; font-size:13px; color:var(--text-secondary); line-height:1.6;">ℹ️ Nahrungsergänzungsmittel ersetzen keine ausgewogene Ernährung und keine zahnärztliche Behandlung. Bei bestehenden Erkrankungen, Medikamenteneinnahme, Schwangerschaft oder Stillzeit vor der Einnahme Rücksprache mit einem Arzt oder Apotheker halten.</div>'
      : '';
    root.innerHTML = '' +
      '<p class="glass-head" style="font-size:13px; margin-bottom:18px; padding:8px 16px;"><a href="' + esc(categoryHref(p.category)) + '">← ' + esc(catName) + '</a></p>' +
      '<div class="catalog-card" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); overflow:hidden;">' +
        '<div class="catalog-media catalog-media-detail" style="min-height:280px; font-size:96px;">' + mediaHtml(p) + '</div>' +
        '<div class="catalog-body" style="padding:28px;">' +
          '<span class="catalog-badge' + (p.badgeRed ? ' red' : '') + '">' + esc(p.badge) + '</span>' +
          '<h1 style="font-size:26px; margin:10px 0;">' + esc(p.name) + '</h1>' +
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
      ? '<h2 class="glass-head">Das könnte dir auch gefallen</h2><div class="catalog-grid">' + list.map(cardHtml).join('') + '</div>'
      : '';
  };

  // Versandregeln und Lieferländer aus der Shop-Zentrale (dieselbe Tabelle nutzt der Server beim
  // Checkout) — dort gepflegte Änderungen gelten hier wie dort, ohne dass Code angefasst wird.
  var shippingPromise = null;
  var loadShipping = function () {
    if (!shippingPromise) {
      var cfg = window.WCP_SUPABASE || {};
      var url = String(cfg.url || '').replace(/\/$/, '') + '/rest/v1/shipping_rates?select=country,name,flat,free_from,is_default' +
        '&shop_id=eq.' + encodeURIComponent(cfg.shop || '') + '&order=sort_order.asc';
      shippingPromise = fetch(url, { headers: { apikey: cfg.key } }).then(function (r) {
        if (!r.ok) throw new Error('Versandkosten nicht ladbar');
        return r.json();
      }).then(function (rows) {
        var countries = {};
        var defaultCountry = 'DE';
        rows.forEach(function (r) {
          countries[r.country] = { name: r.name, flat: r.flat, freeFrom: r.free_from };
          if (r.is_default) defaultCountry = r.country;
        });
        return { defaultCountry: defaultCountry, countries: countries };
      }).catch(function () { return { defaultCountry: 'DE', countries: { DE: { name: 'Deutschland', flat: 490, freeFrom: 5000 } } }; });
    }
    return shippingPromise;
  };
  // [[Code, Name], …] mit dem Standardland zuerst, dann alphabetisch
  var countryList = function (cfg) {
    return Object.keys(cfg.countries).sort(function (x, y) {
      if (x === cfg.defaultCountry) return -1;
      if (y === cfg.defaultCountry) return 1;
      return cfg.countries[x].name.localeCompare(cfg.countries[y].name, 'de');
    }).map(function (c) { return [c, cfg.countries[c].name]; });
  };

  window.WCP = window.WCP || {};
  window.WCP.loadShipping = loadShipping;
  window.WCP.countryList = countryList;
  window.WCP.loadShopInfo = loadShopInfo;
  window.WCP.categoryName = categoryName;
  window.WCP.eur = eur;
  window.WCP.esc = esc;
  window.WCP.cardHtml = cardHtml;
  window.WCP.mediaHtml = mediaHtml;
  window.WCP.loadProducts = loadProducts;

  // Überschrift/Titel der generischen Kategorieseite (kategorie.html?id=…) füllen
  var fillCategoryTitle = function (info) {
    var el = document.querySelector('[data-category-title]');
    if (!el) return;
    var id = new URLSearchParams(location.search).get('id') || '';
    var cats = (info && info.categories) || [];
    var hit = cats.filter(function (c) { return c.id === id; })[0];
    if (!hit) {
      el.textContent = 'Kategorie nicht gefunden';
      var grid = document.querySelector('.catalog-grid[data-category-from-url]');
      if (grid) grid.innerHTML = '<p class="catalog-empty">Diese Kategorie gibt es nicht (mehr). <a href="index.html">Zurück zur Startseite</a></p>';
      return;
    }
    el.textContent = hit.name;
    document.title = hit.name + ' — White Class Pro';
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('.catalog-grid[data-category], .catalog-grid[data-featured], .catalog-grid[data-category-from-url], #product-detail, [data-cat-count]')) return;
    Promise.all([loadProducts(), loadShopInfo().catch(function () { return {}; })]).then(function (res) {
      var products = res[0], info = res[1];
      renderGrids(products);
      fillCategoryCounts(products);
      renderDetail(products, info);
      fillCategoryTitle(info);
    }).catch(function () {
      document.querySelectorAll('.catalog-grid[data-category], .catalog-grid[data-featured], .catalog-grid[data-category-from-url]').forEach(function (g) {
        g.innerHTML = '<p>Produkte konnten nicht geladen werden. Bitte Seite neu laden.</p>';
      });
    });
  });

  // Shop-weite Texte aus der Shop-Zentrale einsetzen: Promo-Banner, Lieferzeit, Kontaktdaten,
  // TikTok-Link. Läuft auf JEDER Seite (anders als der Block oben, der nur auf Katalogseiten
  // etwas zu tun hat), damit z. B. Impressum und Kontaktseite ebenfalls aktuell bleiben.
  document.addEventListener('DOMContentLoaded', function () {
    var SEL = '[data-promo-banner], [data-tiktok-link], [data-delivery-time], [data-contact-phone], [data-contact-email], [data-contact-vat]';
    if (!document.querySelector(SEL)) return;
    loadShopInfo().then(function (info) {
      var banner = document.querySelector('[data-promo-banner]');
      if (banner) {
        if (info.promo_banner) banner.textContent = info.promo_banner;
        else banner.style.display = 'none';
      }

      document.querySelectorAll('[data-delivery-time]').forEach(function (el) {
        el.textContent = info.delivery_time || '7–10 Werktage';
      });

      var tiktok = document.querySelector('[data-tiktok-link]');
      if (tiktok && info.social_tiktok) {
        tiktok.href = info.social_tiktok;
        tiktok.textContent = 'TikTok';
        tiktok.target = '_blank';
        tiktok.rel = 'noopener noreferrer';
      }

      // Kontaktfelder: nur ersetzen, wenn in der Shop-Zentrale ein Wert eingetragen ist — sonst
      // bleibt der gelbe Platzhaltertext stehen, der ans Ausfüllen erinnert.
      var fill = function (sel, value) {
        if (!value) return;
        document.querySelectorAll(sel).forEach(function (el) {
          el.textContent = value;
          el.classList.remove('todo');
        });
      };
      fill('[data-contact-phone]', info.contact_phone);
      fill('[data-contact-email]', info.contact_email);
      fill('[data-contact-vat]', info.contact_vat_id);
    }).catch(function () {});
  });
})();
