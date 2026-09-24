// White Class Pro — Suche im Header: Lupe öffnet eine Suchleiste unter dem Header (auf jeder Seite).
// Zeigt beim Tippen Vorschläge aus Lexikon und Produkten; Enter oder "Alle Ergebnisse" führt zur
// vollständigen Suche auf lexikon.html. Die Suchregeln entsprechen denen in lexikon.js
// (ohne Groß-/Kleinschreibung und Umlaute, alle Wörter müssen vorkommen). Daten werden erst beim
// ersten Öffnen geladen.
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.querySelector('.search-toggle');
  var header = document.querySelector('.site-header-fixed');
  if (!btn || !header) return;

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var norm = function (s) {
    return String(s).toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  };

  var panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.id = 'search-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="container">' +
      '<form class="search-form" role="search" autocomplete="off">' +
        '<input type="search" class="search-input" placeholder="Begriff oder Produkt suchen …" aria-label="Suche">' +
        '<button type="submit" class="btn btn-primary">Suchen</button>' +
      '</form>' +
      '<div class="search-results" aria-live="polite"></div>' +
    '</div>';
  header.appendChild(panel);

  var input = panel.querySelector('.search-input');
  var results = panel.querySelector('.search-results');
  var data = null, loading = null;

  var load = function () {
    if (!loading) {
      loading = Promise.all([
        fetch('lexikon.json').then(function (r) { return r.json(); }),
        fetch('products.json').then(function (r) { return r.json(); })
      ]).then(function (res) { data = { terms: res[0], products: res[1] }; }).catch(function () { loading = null; });
    }
    return loading;
  };

  var suggestions = ['Baking Soda', 'Hydroxylapatit', 'Zahnaufhellung', 'Vitamin D3', 'Magnesium'];
  var showSuggestions = function () {
    results.innerHTML = '<p class="search-hint">Beliebt:</p><p>' + suggestions.map(function (s) {
      return '<button type="button" class="lex-chip" data-q="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('') + '</p>';
  };

  var find = function (tokens) {
    var terms = [], strongProducts = {};
    data.terms.forEach(function (t) {
      var head = norm(t.term + ' ' + t.question + ' ' + (t.keywords || []).join(' '));
      var all = head + ' ' + norm(t.summary + ' ' + t.body.join(' '));
      var score = 0, strong = true;
      for (var i = 0; i < tokens.length; i++) {
        if (head.indexOf(tokens[i]) !== -1) score += 3;
        else if (all.indexOf(tokens[i]) !== -1) { score += 1; strong = false; }
        else return;
      }
      terms.push({ t: t, score: score });
      if (strong) (t.products || []).forEach(function (id) { strongProducts[id] = 1; });
    });
    terms.sort(function (a, b) { return b.score - a.score || a.t.term.localeCompare(b.t.term, 'de'); });
    var products = data.products.filter(function (p) {
      if (strongProducts[p.id]) return true;
      var hay = norm(p.name + ' ' + p.short + ' ' + p.description + ' ' + p.category + ' ' + p.id);
      return tokens.every(function (tk) { return hay.indexOf(tk) !== -1; });
    });
    return { terms: terms, products: products };
  };

  var render = function () {
    var q = input.value.trim();
    var tokens = norm(q).split(' ').filter(Boolean);
    if (!tokens.length) { showSuggestions(); return; }
    if (!data) { results.innerHTML = '<p class="search-hint">Suche läuft …</p>'; return; }
    var r = find(tokens);
    var out = '';
    if (r.terms.length) {
      out += '<h4>Lexikon</h4><ul>' + r.terms.slice(0, 4).map(function (h) {
        return '<li><a class="search-term" href="lexikon.html#' + esc(h.t.id) + '"><strong>' + esc(h.t.question) + '</strong><span>' + esc(h.t.summary) + '</span></a></li>';
      }).join('') + '</ul>';
    }
    if (r.products.length) {
      out += '<h4>Produkte</h4><ul>' + r.products.slice(0, 4).map(function (p) {
        return '<li><a href="produkt.html?id=' + encodeURIComponent(p.id) + '"><strong>' + esc(p.name) + '</strong><span>' +
          (p.price / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €</span></a></li>';
      }).join('') + '</ul>';
    }
    if (!out) out = '<p class="search-hint">Dazu haben wir noch nichts gefunden. Versuche ein anderes Wort.</p>';
    else out += '<a class="search-all" href="lexikon.html?q=' + encodeURIComponent(q) + '">Alle Ergebnisse anzeigen →</a>';
    results.innerHTML = out;
  };

  var open = function () {
    // Mobiles Menü und Dropdowns schließen, damit nur eines offen ist
    var nav = document.querySelector('.main-nav');
    if (nav) nav.classList.remove('nav-open');
    document.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Suche schließen');
    render();
    load().then(render);
    input.focus();
  };
  var close = function () {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Suche öffnen');
  };

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.hidden) open(); else close();
  });
  input.addEventListener('input', render);

  panel.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    var lexInput = document.getElementById('lex-q');
    if (lexInput) {                       // schon auf dem Lexikon: direkt dort suchen
      lexInput.value = q;
      lexInput.dispatchEvent(new Event('input'));
      close();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      location.href = 'lexikon.html?q=' + encodeURIComponent(q);
    }
  });

  results.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-q]');
    if (!chip) { if (e.target.closest('a')) close(); return; }
    input.value = chip.getAttribute('data-q');
    render();
    input.focus();
  });

  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); }
  });
});
