// White Class Pro — Warenkorb (localStorage). Gespeichert wird nur {id, qty};
// Preise kommen immer aus products.json bzw. später serverseitig beim Checkout.
(function () {
  var KEY = 'wcp_cart';
  var MAX_QTY = 10;

  var read = function () {
    try {
      var items = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(items) ? items.filter(function (i) { return i && typeof i.id === 'string' && i.qty > 0; }) : [];
    } catch (e) { return []; }
  };

  var write = function (items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    updateBadge();
    document.dispatchEvent(new CustomEvent('wcp:cart-changed'));
  };

  var count = function () {
    return read().reduce(function (sum, i) { return sum + i.qty; }, 0);
  };

  var add = function (id, qty) {
    var items = read();
    var hit = items.filter(function (i) { return i.id === id; })[0];
    if (hit) hit.qty = Math.min(MAX_QTY, hit.qty + (qty || 1));
    else items.push({ id: id, qty: Math.min(MAX_QTY, qty || 1) });
    write(items);
  };

  var setQty = function (id, qty) {
    var items = read().map(function (i) { return i.id === id ? { id: id, qty: Math.min(MAX_QTY, qty) } : i; })
      .filter(function (i) { return i.qty > 0; });
    write(items);
  };

  var remove = function (id) {
    write(read().filter(function (i) { return i.id !== id; }));
  };

  var clear = function () { write([]); };

  // --- Header-Symbol (wird auf jeder Seite automatisch eingesetzt) ---
  var updateBadge = function () {
    var n = count();
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = n;
      el.style.display = n > 0 ? 'inline-block' : 'none';
    });
  };

  var injectHeaderLink = function () {
    // Der Warenkorb-Link steht fest im Header-HTML; nur als Fallback einsetzen.
    var row = document.querySelector('.header-actions');
    if (!row || row.querySelector('.cart-link')) return;
    var a = document.createElement('a');
    a.href = 'warenkorb.html';
    a.className = 'cart-link';
    a.setAttribute('aria-label', 'Warenkorb');
    a.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.1 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/></svg><span class="cart-count" style="display:none">0</span>';
    row.appendChild(a);
  };

  var toast = function (msg) {
    var t = document.createElement('div');
    t.className = 'cart-toast';
    t.setAttribute('role', 'status');
    t.innerHTML = msg + ' <a href="warenkorb.html">Zum Warenkorb</a>';
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3500);
  };

  // --- Warenkorbseite ---
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Versandregeln aus shipping.json (dieselbe Datei nutzt der Server beim Checkout)
  var loadShipping = function () {
    return fetch('shipping.json').then(function (r) { return r.json(); })
      .catch(function () { return { flat: 490, freeFrom: 5000 }; });
  };

  var renderCartPage = function () {
    var root = document.getElementById('cart-root');
    if (!root || !window.WCP || !window.WCP.loadProducts) return;
    var sessionP = (window.WCP.auth ? window.WCP.auth.getSession() : Promise.resolve(null))
      .catch(function () { return null; });
    Promise.all([window.WCP.loadProducts(), loadShipping(), sessionP]).then(function (res) {
      var products = res[0], shipping = res[1], loggedIn = !!res[2];
      var byId = {};
      products.forEach(function (p) { byId[p.id] = p; });
      var items = read().filter(function (i) { return byId[i.id]; });
      if (!items.length) {
        root.innerHTML = '<div class="cart-empty"><p>Dein Warenkorb ist leer.</p>' +
          '<a href="index.html#kategorien" class="btn btn-primary">Weiter einkaufen</a></div>';
        return;
      }
      var total = 0;
      var rows = items.map(function (i) {
        var p = byId[i.id];
        var line = p.price * i.qty;
        total += line;
        return '<div class="cart-row">' +
          '<a class="cart-emoji" href="produkt.html?id=' + encodeURIComponent(p.id) + '">' + p.emoji + '</a>' +
          '<div class="cart-info"><a href="produkt.html?id=' + encodeURIComponent(p.id) + '"><strong>' + esc(p.name) + '</strong></a>' +
            '<div class="cart-unit">' + window.WCP.eur(p.price) + ' / Stück</div></div>' +
          '<div class="cart-qty">' +
            '<button type="button" data-act="dec" data-id="' + esc(p.id) + '" aria-label="Menge verringern">−</button>' +
            '<span>' + i.qty + '</span>' +
            '<button type="button" data-act="inc" data-id="' + esc(p.id) + '" aria-label="Menge erhöhen">+</button>' +
          '</div>' +
          '<div class="cart-line">' + window.WCP.eur(line) + '</div>' +
          '<button type="button" class="cart-remove" data-act="rm" data-id="' + esc(p.id) + '" aria-label="Entfernen">✕</button>' +
        '</div>';
      }).join('');
      var eur = window.WCP.eur;
      var ship = total >= shipping.freeFrom ? 0 : shipping.flat;
      // Bestellen ist nur mit Kundenkonto möglich (der Server prüft das ebenfalls)
      var checkoutHtml = loggedIn
        ? '<label class="cart-agree"><input type="checkbox" id="agree"> <span>Ich habe die <a href="agb.html" target="_blank" rel="noopener">AGB</a>, die <a href="widerruf.html" target="_blank" rel="noopener">Widerrufsbelehrung</a> und die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und akzeptiere sie.</span></label>' +
          '<p id="checkout-msg" class="form-msg error" role="alert" hidden></p>' +
          '<button type="button" class="btn btn-primary" id="checkout-btn" style="width:100%;">Zahlungspflichtig bestellen</button>' +
          '<p class="cart-note" style="margin:10px 0 0;">Sichere Bezahlung über Stripe · Lieferung nach Deutschland · <a href="versand.html">Versandinfos</a></p>'
        : '<p class="form-msg ok" style="margin:0 0 12px;">🔒 Zum Bestellen brauchst du ein Kundenkonto. Dein Warenkorb bleibt dabei erhalten.</p>' +
          '<a href="login.html?next=warenkorb.html" class="btn btn-primary" style="width:100%; text-align:center;">Anmelden oder Konto erstellen</a>';
      root.innerHTML = rows +
        '<div class="cart-summary">' +
          '<div class="cart-total cart-sub"><span>Zwischensumme</span><span>' + eur(total) + '</span></div>' +
          '<div class="cart-total cart-sub"><span>Versand</span><span>' + (ship ? eur(ship) : 'kostenlos') + '</span></div>' +
          (ship ? '<p class="cart-note">Noch ' + eur(shipping.freeFrom - total) + ' bis zum kostenlosen Versand (ab ' + eur(shipping.freeFrom) + ').</p>' : '') +
          '<div class="cart-total cart-grand"><span>Gesamt (inkl. MwSt.)</span><strong>' + eur(total + ship) + '</strong></div>' +
          checkoutHtml +
        '</div>';
    });
  };

  // --- Zur Kasse: Warenkorb an die Serverfunktion senden und zu Stripe weiterleiten ---
  var startCheckout = function (btn) {
    var msg = document.getElementById('checkout-msg');
    var say = function (t) { msg.textContent = t; msg.hidden = !t; };
    say('');
    if (!document.getElementById('agree').checked) {
      say('Bitte bestätige die AGB, die Widerrufsbelehrung und die Datenschutzerklärung.');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Weiterleitung zur Kasse …';
    var goLogin = function () { location.href = 'login.html?next=warenkorb.html'; };
    (window.WCP.auth ? window.WCP.auth.getSession() : Promise.resolve(null)).then(function (s) {
      if (!s) { goLogin(); return null; }
      return fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.access_token },
        body: JSON.stringify({ items: read() })
      }).then(function (r) {
        return r.json().then(function (d) {
          if (r.status === 401) { goLogin(); return null; }
          if (!r.ok || !d.url) { var err = new Error(d.error || ''); err.friendly = !!d.error; throw err; }
          return d;
        });
      });
    }).then(function (d) {
      if (d) location.href = d.url;
    }).catch(function (err) {
      say(err.friendly ? err.message : 'Die Kasse ist gerade nicht erreichbar. Bitte versuche es später erneut.');
      btn.disabled = false;
      btn.textContent = 'Zahlungspflichtig bestellen';
    });
  };

  // Zurück-Button aus Stripe: Seite frisch aufbauen, damit der Bestell-Button wieder aktiv ist
  window.addEventListener('pageshow', function (e) { if (e.persisted) renderCartPage(); });

  document.addEventListener('click', function (e) {
    var checkoutBtn = e.target.closest('#checkout-btn');
    if (checkoutBtn) { startCheckout(checkoutBtn); return; }
    var addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      add(addBtn.getAttribute('data-add-to-cart'), 1);
      toast('Zum Warenkorb hinzugefügt.');
      return;
    }
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var id = b.getAttribute('data-id');
    var cur = read().filter(function (i) { return i.id === id; })[0];
    var act = b.getAttribute('data-act');
    if (act === 'inc' && cur) setQty(id, cur.qty + 1);
    if (act === 'dec' && cur) setQty(id, cur.qty - 1);
    if (act === 'rm') remove(id);
  });

  document.addEventListener('wcp:cart-changed', renderCartPage);
  document.addEventListener('wcp:auth-changed', renderCartPage);
  // Änderungen aus einem anderen Tab übernehmen
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateBadge(); renderCartPage(); } });

  window.WCP = window.WCP || {};
  window.WCP.cart = { read: read, add: add, setQty: setQty, remove: remove, clear: clear, count: count, MAX_QTY: MAX_QTY };

  document.addEventListener('DOMContentLoaded', function () {
    injectHeaderLink();
    updateBadge();
    renderCartPage();
  });
})();
