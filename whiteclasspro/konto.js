// White Class Pro — Kundenkonto (konto.html): Daten, Adressen, Passwort
document.addEventListener('DOMContentLoaded', function () {
  var auth = window.WCP && window.WCP.auth;
  var root = document.getElementById('account-root');
  if (!auth || !root) return;

  var byId = function (id) { return document.getElementById(id); };

  var show = function (el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-msg ' + (kind || 'ok');
    el.hidden = !text;
  };

  var busy = function (form, on) {
    form.querySelectorAll('button[type="submit"], input').forEach(function (el) { el.disabled = on; });
  };

  // ---------- Adressen: Felder ----------
  // Zeilen mit zwei Einträgen werden nebeneinander angezeigt.
  var ROWS = [
    [['first_name', 'Vorname', 'given-name', 60], ['last_name', 'Nachname', 'family-name', 60]],
    [['company', 'Firma (optional)', 'organization', 100]],
    [['street', 'Straße und Hausnummer', 'address-line1', 120]],
    [['address_extra', 'Adresszusatz (optional)', 'address-line2', 120]],
    [['postal_code', 'PLZ', 'postal-code', 10], ['city', 'Ort', 'address-level2', 80]],
    [['country', 'Land', 'country', 2]],
    [['phone', 'Telefon (optional, für Rückfragen zur Lieferung)', 'tel', 30]]
  ];
  var OPTIONAL = { company: 1, address_extra: 1, phone: 1 };
  var KIND_LABEL = { main: 'Hauptadresse', shipping: 'Lieferadresse', billing: 'Rechnungsadresse' };
  var KIND_ID = { main: 'addr-main', shipping: 'addr-shipping', billing: 'addr-billing' };
  // Lieferländer kommen aus shipping.json (dieselbe Liste wie im Warenkorb und beim Checkout)
  var shippingCfg = { defaultCountry: 'DE', countries: { DE: { name: 'Deutschland' } } };
  var preferredCountry = function () {
    var c = null;
    try { c = localStorage.getItem('wcp_country'); } catch (e) {}
    return c && Object.prototype.hasOwnProperty.call(shippingCfg.countries, c) ? c : shippingCfg.defaultCountry;
  };
  // Grobe Formatprüfung der Postleitzahl je Land (die Datenbank prüft nur allgemein)
  var POSTAL = {
    DE: /^\d{5}$/, AT: /^\d{4}$/, BE: /^\d{4}$/, BG: /^\d{4}$/, CY: /^\d{4}$/, EE: /^\d{5}$/, ES: /^\d{5}$/,
    FI: /^\d{5}$/, FR: /^\d{5}$/, GR: /^\d{3} ?\d{2}$/, HR: /^\d{5}$/, IE: /^[A-Za-z0-9]{3} ?[A-Za-z0-9]{4}$/,
    IT: /^\d{5}$/, LT: /^(LT-?)?\d{5}$/i, LU: /^\d{4}$/, LV: /^(LV-?)?\d{4}$/i, MT: /^[A-Za-z]{3} ?\d{2,4}$/,
    NL: /^\d{4} ?[A-Za-z]{2}$/, PT: /^\d{4}-?\d{3}$/, SI: /^\d{4}$/, SK: /^\d{3} ?\d{2}$/
  };
  var FIELD_NAMES = ROWS.reduce(function (all, row) { return all.concat(row.map(function (f) { return f[0]; })); }, []);

  var buildFields = function (kind) {
    var host = byId(KIND_ID[kind]);
    ROWS.forEach(function (row) {
      var wrap = document.createElement('div');
      if (row.length === 2) wrap.className = row[0][0] === 'postal_code' ? 'two-col plz-ort' : 'two-col';
      row.forEach(function (f) {
        var field = document.createElement('div');
        field.className = 'field';
        var label = document.createElement('label');
        label.htmlFor = kind + '-' + f[0];
        label.textContent = f[1];
        var input;
        if (f[0] === 'country') {
          input = document.createElement('select');
          window.WCP.countryList(shippingCfg).forEach(function (cn) {
            var opt = document.createElement('option');
            opt.value = cn[0];
            opt.textContent = cn[1];
            input.appendChild(opt);
          });
        } else {
          input = document.createElement('input');
          input.type = f[0] === 'phone' ? 'tel' : 'text';
          input.maxLength = f[3];
        }
        input.id = kind + '-' + f[0];
        input.name = f[0];
        input.setAttribute('autocomplete', (kind === 'main' ? '' : kind + ' ') + f[2]);
        field.appendChild(label);
        field.appendChild(input);
        wrap.appendChild(field);
      });
      host.appendChild(wrap);
    });
  };

  var fill = function (kind, data) {
    FIELD_NAMES.forEach(function (n) {
      var v = (data && data[n]) || '';
      if (n === 'country' && !Object.prototype.hasOwnProperty.call(shippingCfg.countries, v)) v = preferredCountry();
      byId(kind + '-' + n).value = v;
    });
  };

  var collect = function (kind) {
    var out = {};
    FIELD_NAMES.forEach(function (n) {
      var v = byId(kind + '-' + n).value.trim();
      out[n] = v === '' && OPTIONAL[n] ? null : v;
    });
    return out;
  };

  var validate = function (kind, a) {
    var name = KIND_LABEL[kind];
    if (!a.first_name || !a.last_name) return name + ': Bitte Vor- und Nachnamen angeben.';
    if (!a.street) return name + ': Bitte Straße und Hausnummer angeben.';
    if (!Object.prototype.hasOwnProperty.call(shippingCfg.countries, a.country)) return name + ': Bitte ein Land auswählen.';
    if (!(POSTAL[a.country] || /^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/).test(a.postal_code || '')) return name + ': Bitte eine gültige Postleitzahl für ' + shippingCfg.countries[a.country].name + ' angeben.';
    if (!a.city) return name + ': Bitte den Ort angeben.';
    if (a.phone && !/^[0-9+()\/\-\s]{5,30}$/.test(a.phone)) return name + ': Die Telefonnummer enthält ungültige Zeichen.';
    return '';
  };

  // ---------- Start ----------
  auth.ready.then(function () { return auth.getSession(); }).then(function (s) {
    if (!s) { location.replace('login.html'); return; }
    window.WCP.loadShipping().then(function (cfg) { shippingCfg = cfg; init(s); });
  });

  var init = function (s) {
    var meta = (s.user && s.user.user_metadata) || {};
    var email = (s.user && s.user.email) || '';
    byId('account-email').textContent = email;
    byId('sec-email').textContent = email;
    if (s.user && s.user.new_email) {
      show(byId('email-pending'), 'Änderung auf ' + s.user.new_email + ' ist noch nicht bestätigt. Bitte klicke auf den Link in der E-Mail, die wir dir geschickt haben.', 'ok');
    }
    root.hidden = false;

    // Tabs
    var tabs = root.querySelectorAll('[data-ktab]');
    var panels = {};
    root.querySelectorAll('.k-panel').forEach(function (p) { panels[p.id.replace('kp-', '')] = p; });
    var openTab = function (name) {
      if (!panels[name]) name = 'daten';
      Object.keys(panels).forEach(function (k) { panels[k].hidden = (k !== name); });
      tabs.forEach(function (t) {
        var active = t.getAttribute('data-ktab') === name;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    };
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var name = t.getAttribute('data-ktab');
        openTab(name);
        try { history.replaceState(null, '', '#' + name); } catch (e) {}
      });
    });
    openTab(location.hash.replace('#', ''));
    // Auch wenn das Konto-Menü im Header auf der Kontoseite selbst benutzt wird
    window.addEventListener('hashchange', function () { openTab(location.hash.replace('#', '')); });

    // Persönliche Daten = Hauptadresse (Name, Anschrift, Telefon) + optionale abweichende Adressen
    ['main', 'shipping', 'billing'].forEach(buildFields);
    var diffShip = byId('diff-shipping'), diffBill = byId('diff-billing');
    var syncToggles = function () {
      byId('addr-shipping').hidden = !diffShip.checked;
      byId('addr-billing').hidden = !diffBill.checked;
    };
    diffShip.addEventListener('change', syncToggles);
    diffBill.addEventListener('change', syncToggles);

    // "Nochmal bestellen": legt die Artikel der Bestellung wieder in den Warenkorb. Braucht die
    // Produkt-ID je Position (erst seit dem Webhook-Update gespeichert) und das Produkt noch im
    // Sortiment — beides fehlt bei älteren Bestellungen oder eingestellten Produkten, dann wird
    // übersprungen statt einen Fehler zu werfen.
    var reorder = function (order, btn) {
      if (!window.WCP || !window.WCP.cart || !window.WCP.loadProducts) return;
      btn.disabled = true;
      window.WCP.loadProducts().then(function (products) {
        var byProductId = {};
        products.forEach(function (p) { byProductId[p.id] = p; });
        var added = 0;
        (order.items || []).forEach(function (it) {
          if (it.id && byProductId[it.id]) { window.WCP.cart.add(it.id, it.qty || 1); added++; }
        });
        if (added) { location.href = 'warenkorb.html'; return; }
        btn.disabled = false;
        show(byId('orders-msg'), 'Die Artikel dieser Bestellung sind leider nicht mehr verfügbar.', 'error');
      });
    };

    // Bestellungen laden (Supabase RLS zeigt jedem Kunden nur seine eigenen Zeilen)
    var eur = window.WCP && window.WCP.eur ? window.WCP.eur : function (c) { return (c / 100).toFixed(2) + ' €'; };
    auth.rest('GET', '/orders?select=*&order=created_at.desc').then(function (orders) {
      var list = byId('orders-list');
      if (!orders || !orders.length) {
        list.innerHTML = '<div class="cart-summary" style="margin:0;"><p class="cart-note" style="margin:0;">Du hast noch keine Bestellung aufgegeben.</p></div>';
        return;
      }
      list.innerHTML = orders.map(function (o, idx) {
        var date = new Date(o.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        var rows = (o.items || []).map(function (it) {
          return '<div class="cart-total cart-sub"><span>' + it.qty + '× ' + (it.name || 'Produkt') + '</span><span>' + eur(it.amount) + '</span></div>';
        }).join('');
        return '<div class="cart-summary" style="margin:0 0 16px;">' +
          '<div class="cart-total cart-sub" style="font-weight:600; color:var(--text);"><span>Bestellung vom ' + date + '</span><span>Bezahlt</span></div>' +
          rows +
          '<div class="cart-total cart-grand"><span>Gesamt</span><strong>' + eur(o.amount_total) + '</strong></div>' +
          '<div style="text-align:right;"><button type="button" class="btn reorder-btn" data-order-index="' + idx + '">Nochmal bestellen</button></div>' +
        '</div>';
      }).join('');
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('.reorder-btn');
        if (!btn) return;
        reorder(orders[Number(btn.getAttribute('data-order-index'))], btn);
      });
    }).catch(function (err) { show(byId('orders-msg'), err.message, 'error'); });

    // Gespeicherte Adressen laden; ohne Eintrag den Namen aus dem Profil vorbelegen
    fill('main', { first_name: meta.first_name, last_name: meta.last_name });
    auth.rest('GET', '/addresses?select=*').then(function (rows) {
      var by = {};
      (rows || []).forEach(function (r) { by[r.kind] = r; });
      if (by.main) fill('main', by.main);
      if (by.shipping) { fill('shipping', by.shipping); diffShip.checked = true; }
      if (by.billing) { fill('billing', by.billing); diffBill.checked = true; }
      syncToggles();
    }).catch(function (err) { show(byId('msg-personal'), err.message, 'error'); });

    byId('form-personal').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = byId('msg-personal');
      show(msg, '');
      var uid = s.user && s.user.id;
      var kinds = ['main'];
      if (diffShip.checked) kinds.push('shipping');
      if (diffBill.checked) kinds.push('billing');
      var payload = [];
      for (var i = 0; i < kinds.length; i++) {
        var data = collect(kinds[i]);
        var problem = validate(kinds[i], data);
        if (problem) { show(msg, problem, 'error'); return; }
        payload.push(Object.assign({ user_id: uid, kind: kinds[i] }, data));
      }
      busy(f, true);
      // Name der Hauptadresse gilt auch für das Konto (Anzeige im Kopfbereich der Website)
      var main = payload[0];
      var nameChanged = main.first_name !== (meta.first_name || '') || main.last_name !== (meta.last_name || '');
      (nameChanged ? auth.updateProfile(main.first_name, main.last_name).then(function () { meta.first_name = main.first_name; meta.last_name = main.last_name; }) : Promise.resolve())
        .then(function () { return auth.rest('POST', '/addresses?on_conflict=user_id,kind', payload, 'resolution=merge-duplicates,return=minimal'); })
        .then(function () {
          // Abgewählte abweichende Adressen löschen (dann gilt wieder die Hauptadresse)
          var removals = [];
          if (!diffShip.checked) removals.push('shipping');
          if (!diffBill.checked) removals.push('billing');
          return removals.reduce(function (chain, kind) {
            return chain.then(function () { return auth.rest('DELETE', '/addresses?kind=eq.' + kind); });
          }, Promise.resolve());
        })
        .then(function () {
          var shipTo = payload.filter(function (p) { return p.kind === 'shipping'; })[0] || payload[0];
          try { localStorage.setItem('wcp_country', shipTo.country); } catch (e) {}
          show(msg, 'Deine Daten wurden gespeichert.', 'ok');
          busy(f, false);
        })
        .catch(function (err) { show(msg, err.message, 'error'); busy(f, false); });
    });

    // E-Mail-Adresse ändern
    byId('form-email').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = byId('msg-email');
      show(msg, '');
      var next = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next)) { show(msg, 'Bitte gib eine gültige E-Mail-Adresse ein.', 'error'); return; }
      if (next.toLowerCase() === email.toLowerCase()) { show(msg, 'Das ist bereits deine aktuelle E-Mail-Adresse.', 'error'); return; }
      busy(f, true);
      auth.changeEmail(next).then(function () {
        f.reset();
        show(msg, 'Wir haben dir eine E-Mail geschickt. Deine Adresse ändert sich, sobald du den Link darin bestätigt hast. Je nach Einstellung erhältst du auch an deine bisherige Adresse eine Bestätigungs-Mail.', 'ok');
        busy(f, false);
      }).catch(function (err) { show(msg, err.message, 'error'); busy(f, false); });
    });

    // Passwort ändern
    byId('form-password').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = byId('msg-password');
      show(msg, '');
      if (f.password.value.length < 8) { show(msg, 'Das Passwort muss mindestens 8 Zeichen lang sein.', 'error'); return; }
      if (f.password.value !== f.password2.value) { show(msg, 'Die Passwörter stimmen nicht überein.', 'error'); return; }
      busy(f, true);
      auth.updatePassword(f.password.value).then(function () {
        f.reset();
        show(msg, 'Dein Passwort wurde geändert.', 'ok');
        busy(f, false);
      }).catch(function (err) { show(msg, err.message, 'error'); busy(f, false); });
    });

    byId('logout-btn').addEventListener('click', function () {
      auth.signOut().then(function () { location.href = 'index.html'; });
    });
  };
});
