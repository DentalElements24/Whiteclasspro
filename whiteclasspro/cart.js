// White Class Pro — Warenkorb (localStorage). Gespeichert wird nur {id, qty};
// Preise kommen immer aus products.json bzw. später serverseitig beim Checkout.
(function () {
  var KEY = 'wcp_cart';
  var MAX_QTY = 10;
  // Rabattcode gilt nur für die aktuelle Seitenladung; api/checkout.js prüft ihn beim Bezahlen
  // ohnehin erneut gegen Stripe, ein Client kann sich hier also keinen Rabatt "ausdenken".
  var appliedCoupon = null;

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

  // Lieferland: wird im Browser gemerkt (auch vom Kundenkonto gesetzt); der Server prüft es beim Checkout erneut
  var COUNTRY_KEY = 'wcp_country';
  var getCountry = function (cfg) {
    var c = null;
    try { c = localStorage.getItem(COUNTRY_KEY); } catch (e) {}
    return c && Object.prototype.hasOwnProperty.call(cfg.countries, c) ? c : cfg.defaultCountry;
  };
  var setCountry = function (c) { try { localStorage.setItem(COUNTRY_KEY, c); } catch (e) {} };

  var renderCartPage = function () {
    var root = document.getElementById('cart-root');
    if (!root || !window.WCP || !window.WCP.loadProducts) return;
    var sessionP = (window.WCP.auth ? window.WCP.auth.getSession() : Promise.resolve(null))
      .catch(function () { return null; });
    Promise.all([window.WCP.loadProducts(), window.WCP.loadShipping(), sessionP]).then(function (res) {
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
      var country = getCountry(shipping);
      var rate = shipping.countries[country];
      var ship = total >= rate.freeFrom ? 0 : rate.flat;
      var countryHtml = '<div class="cart-country"><label for="cart-country">Lieferland</label><select id="cart-country">' +
        window.WCP.countryList(shipping).map(function (cn) { return '<option value="' + cn[0] + '"' + (cn[0] === country ? ' selected' : '') + '>' + esc(cn[1]) + '</option>'; }).join('') +
        '</select></div>';
      var discount = 0;
      if (appliedCoupon) {
        discount = appliedCoupon.percentOff ? Math.round(total * appliedCoupon.percentOff / 100) : Math.min(appliedCoupon.amountOff, total);
      }
      var grandTotal = Math.max(0, total + ship - discount);
      var couponHtml = '<div class="cart-coupon">' +
          '<input type="text" id="coupon-code" placeholder="Rabattcode" maxlength="40"' +
            (appliedCoupon ? ' value="' + esc(appliedCoupon.code) + '" disabled' : '') + '>' +
          (appliedCoupon
            ? '<button type="button" class="btn" id="coupon-remove">Entfernen</button>'
            : '<button type="button" class="btn" id="coupon-apply">Anwenden</button>') +
        '</div>' +
        '<p id="coupon-msg" class="form-msg error" role="alert" hidden></p>';
      // Bestellen ist nur mit Kundenkonto möglich (der Server prüft das ebenfalls)
      var checkoutHtml = loggedIn
        ? '<label class="cart-agree"><input type="checkbox" id="agree"> <span>Ich habe die <a href="agb.html" target="_blank" rel="noopener">AGB</a>, die <a href="widerruf.html" target="_blank" rel="noopener">Widerrufsbelehrung</a> und die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und akzeptiere sie.</span></label>' +
          '<p id="checkout-msg" class="form-msg error" role="alert" hidden></p>' +
          '<button type="button" class="btn btn-primary" id="checkout-btn" style="width:100%;">Zahlungspflichtig bestellen</button>' +
          '<p class="cart-note" style="margin:10px 0 0;">Sichere Bezahlung über Stripe · Lieferung in ausgewählte Euro-Länder · <a href="versand.html">Versandinfos</a></p>'
        : '<p class="form-msg ok" style="margin:0 0 12px;">🔒 Zum Bestellen brauchst du ein Kundenkonto. Dein Warenkorb bleibt dabei erhalten.</p>' +
          '<a href="login.html?next=warenkorb.html" class="btn btn-primary" style="width:100%; text-align:center;">Anmelden oder Konto erstellen</a>';
      root.innerHTML = rows +
        '<div class="cart-summary">' +
          countryHtml +
          '<div class="cart-total cart-sub"><span>Zwischensumme</span><span>' + eur(total) + '</span></div>' +
          '<div class="cart-total cart-sub"><span>Versand nach ' + esc(rate.name) + '</span><span>' + (ship ? eur(ship) : 'kostenlos') + '</span></div>' +
          (ship ? '<p class="cart-note">Noch ' + eur(rate.freeFrom - total) + ' bis zum kostenlosen Versand nach ' + esc(rate.name) + ' (ab ' + eur(rate.freeFrom) + ').</p>' : '') +
          (discount ? '<div class="cart-total cart-sub cart-discount"><span>Rabatt (' + esc(appliedCoupon.code) + ')</span><span>−' + eur(discount) + '</span></div>' : '') +
          couponHtml +
          '<div class="cart-total cart-grand"><span>Gesamt (inkl. MwSt.)</span><strong>' + eur(grandTotal) + '</strong></div>' +
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
        body: JSON.stringify({ items: read(), country: (document.getElementById('cart-country') || {}).value || undefined, promotionCode: appliedCoupon ? appliedCoupon.code : undefined })
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

  // --- Rabattcode anwenden: Server prüft den Code live gegen Stripe (api/coupon.js) ---
  var applyCoupon = function () {
    var input = document.getElementById('coupon-code');
    var msg = document.getElementById('coupon-msg');
    var say = function (t) { msg.textContent = t; msg.hidden = !t; };
    var code = input.value.trim();
    say('');
    if (!code) { say('Bitte einen Rabattcode eingeben.'); return; }
    input.disabled = true;
    fetch('/api/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = {};
        try { d = text ? JSON.parse(text) : {}; } catch (e) {}
        if (!r.ok) throw new Error(d.error || 'Dieser Rabattcode ist ungültig oder abgelaufen.');
        return d;
      });
    }, function () {
      throw new Error('Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
    }).then(function (d) {
      appliedCoupon = d;
      renderCartPage();
    }).catch(function (err) {
      input.disabled = false;
      say(err.message);
    });
  };

  // Zurück-Button aus Stripe: Seite frisch aufbauen, damit der Bestell-Button wieder aktiv ist
  window.addEventListener('pageshow', function (e) { if (e.persisted) renderCartPage(); });

  document.addEventListener('click', function (e) {
    var checkoutBtn = e.target.closest('#checkout-btn');
    if (checkoutBtn) { startCheckout(checkoutBtn); return; }
    var couponApply = e.target.closest('#coupon-apply');
    if (couponApply) { applyCoupon(); return; }
    var couponRemove = e.target.closest('#coupon-remove');
    if (couponRemove) { appliedCoupon = null; renderCartPage(); return; }
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

  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('#cart-country');
    if (sel) { setCountry(sel.value); renderCartPage(); }
  });

  document.addEventListener('wcp:cart-changed', renderCartPage);
  document.addEventListener('wcp:auth-changed', renderCartPage);
  // Änderungen aus einem anderen Tab übernehmen
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateBadge(); renderCartPage(); } });

  window.WCP = window.WCP || {};
  window.WCP.cart = { read: read, add: add, setQty: setQty, remove: remove, clear: clear, count: count, MAX_QTY: MAX_QTY };

  // Tabelle "Versandkosten je Land" auf versand.html — kommt aus shipping.json, damit nichts doppelt gepflegt wird
  var renderShippingTable = function () {
    var box = document.getElementById('versand-tabelle');
    if (!box || !window.WCP || !window.WCP.loadShipping) return;
    window.WCP.loadShipping().then(function (cfg) {
      var eur = window.WCP.eur;
      box.innerHTML = '<table class="versand-table"><thead><tr><th>Land</th><th>Versandkosten</th><th>Versandkostenfrei ab</th></tr></thead><tbody>' +
        window.WCP.countryList(cfg).map(function (cn) {
          var r = cfg.countries[cn[0]];
          return '<tr><td>' + esc(cn[1]) + '</td><td>' + eur(r.flat) + '</td><td>' + eur(r.freeFrom) + '</td></tr>';
        }).join('') + '</tbody></table>';
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    injectHeaderLink();
    updateBadge();
    renderCartPage();
    renderShippingTable();
  });
})();
