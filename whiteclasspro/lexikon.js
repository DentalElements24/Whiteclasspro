// White Class Pro — Lexikon: Begriffe aus lexikon.json, eine Suche über Begriffe UND Produkte.
// Die Suche ignoriert Groß-/Kleinschreibung, Umlaute und Sonderzeichen und verlangt, dass alle
// eingegebenen Wörter vorkommen. Alternative Schreibweisen (z. B. "Hydroxil Apatit") stehen als
// "keywords" in lexikon.json.
document.addEventListener('DOMContentLoaded', function () {
  var input = document.getElementById('lex-q');
  if (!input || !window.WCP || !window.WCP.loadProducts) return;

  var esc = window.WCP.esc;
  var byId = function (id) { return document.getElementById(id); };
  var norm = function (s) {
    return String(s).toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  };

  var terms = [], products = [], termById = {}, productById = {};

  var termLink = function (id) {
    var t = termById[id];
    return t ? '<a href="#' + esc(id) + '" class="lex-chip" data-jump="' + esc(id) + '">' + esc(t.term) + '</a>' : '';
  };

  var termHtml = function (t, open) {
    var body = t.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var related = (t.related || []).map(termLink).join('');
    var prods = (t.products || []).map(function (id) {
      var p = productById[id];
      return p ? '<a href="produkt.html?id=' + encodeURIComponent(id) + '" class="lex-chip lex-chip-product">' + esc(p.name) + '</a>' : '';
    }).join('');
    return '<details class="lex-item" id="' + esc(t.id) + '"' + (open ? ' open' : '') + '>' +
      '<summary><span class="lex-q">' + esc(t.question) + '</span><span class="lex-short">' + esc(t.summary) + '</span></summary>' +
      '<div class="lex-body">' + body +
        (related ? '<p class="lex-row"><strong>Verwandte Begriffe:</strong> ' + related + '</p>' : '') +
        (prods ? '<p class="lex-row"><strong>Passende Produkte:</strong> ' + prods + '</p>' : '') +
      '</div></details>';
  };

  // Treffer und Rang je Begriff: Treffer in Titel/Stichwörtern zählen mehr als im Fließtext.
  var searchTerms = function (tokens) {
    var out = [];
    terms.forEach(function (t) {
      var head = norm(t.term + ' ' + t.question + ' ' + (t.keywords || []).join(' '));
      var all = head + ' ' + norm(t.summary + ' ' + t.body.join(' '));
      var score = 0, strong = true;
      for (var i = 0; i < tokens.length; i++) {
        if (head.indexOf(tokens[i]) !== -1) score += 3;
        else if (all.indexOf(tokens[i]) !== -1) { score += 1; strong = false; }
        else return;
      }
      out.push({ t: t, score: score, strong: strong });
    });
    out.sort(function (a, b) { return b.score - a.score || a.t.term.localeCompare(b.t.term, 'de'); });
    return out;
  };

  var searchProducts = function (tokens, termHits) {
    var seen = {}, out = [];
    products.forEach(function (p) {
      var hay = norm(p.name + ' ' + p.short + ' ' + p.description + ' ' + p.category + ' ' + p.id);
      if (tokens.every(function (tk) { return hay.indexOf(tk) !== -1; })) { seen[p.id] = 1; out.push(p); }
    });
    // Produkte, die zu klar getroffenen Begriffen gehören, kommen dazu (z. B. "Hydroxil Apatit" → Zahncreme)
    termHits.forEach(function (h) {
      if (!h.strong) return;
      (h.t.products || []).forEach(function (id) { if (!seen[id] && productById[id]) { seen[id] = 1; out.push(productById[id]); } });
    });
    return out;
  };

  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  var render = function () {
    var q = input.value.trim();
    var tokens = norm(q).split(' ').filter(Boolean);
    var list, prods = [];
    if (!tokens.length) {
      list = terms.slice().sort(function (a, b) { return a.term.localeCompare(b.term, 'de'); }).map(function (t) { return { t: t }; });
    } else {
      list = searchTerms(tokens);
      prods = searchProducts(tokens, list);
    }
    var open = tokens.length > 0 && list.length <= 6;
    byId('lex-terms').innerHTML = list.map(function (h) { return termHtml(h.t, open); }).join('');

    var pBox = byId('lex-products');
    pBox.hidden = !prods.length;
    byId('lex-product-grid').innerHTML = prods.map(window.WCP.cardHtml).join('');

    byId('lex-empty').hidden = !(tokens.length && !list.length && !prods.length);
    byId('lex-status').textContent = !tokens.length
      ? plural(terms.length, 'Begriff', 'Begriffe') + ' im Lexikon'
      : (list.length || prods.length ? plural(list.length, 'Begriff', 'Begriffe') + ' und ' + plural(prods.length, 'Produkt', 'Produkte') + ' gefunden' : '');

    try { history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname); } catch (e) {}
  };

  var openEntry = function (id) {
    var el = byId(id);
    if (!el) return false;
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  input.addEventListener('input', render);
  window.addEventListener('hashchange', function () {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    if (!byId(id)) { input.value = ''; render(); }
    openEntry(id);
  });
  document.getElementById('lex-form').addEventListener('submit', function (e) { e.preventDefault(); });

  // Klick auf einen verwandten Begriff: springt hin, auch wenn er gerade weggefiltert ist
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-jump]');
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('data-jump');
    if (!byId(id)) { input.value = ''; render(); }
    openEntry(id);
    try { history.replaceState(null, '', '#' + id); } catch (err) {}
  });

  Promise.all([
    fetch('lexikon.json').then(function (r) { if (!r.ok) throw new Error('lexikon.json'); return r.json(); }),
    window.WCP.loadProducts()
  ]).then(function (res) {
    terms = res[0];
    products = res[1];
    terms.forEach(function (t) { termById[t.id] = t; });
    products.forEach(function (p) { productById[p.id] = p; });
    var q = new URLSearchParams(location.search).get('q');
    var hash = location.hash;   // render() überschreibt die Adresse, deshalb vorher merken
    if (q) input.value = q;
    render();
    if (hash.length > 1) openEntry(decodeURIComponent(hash.slice(1)));
  }).catch(function () {
    byId('lex-terms').innerHTML = '<p class="catalog-empty">Das Lexikon konnte nicht geladen werden. Bitte Seite neu laden.</p>';
  });
});
