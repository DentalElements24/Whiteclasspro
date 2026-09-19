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
    [['postal_code', 'PLZ', 'postal-code', 5], ['city', 'Ort', 'address-level2', 80]],
    [['phone', 'Telefon (optional, für Rückfragen zur Lieferung)', 'tel', 30]]
  ];
  var OPTIONAL = { company: 1, address_extra: 1, phone: 1 };
  var KIND_LABEL = { main: 'Hauptadresse', shipping: 'Lieferadresse', billing: 'Rechnungsadresse' };
  var KIND_ID = { main: 'addr-main', shipping: 'addr-shipping', billing: 'addr-billing' };
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
        var input = document.createElement('input');
        input.id = kind + '-' + f[0];
        input.name = f[0];
        input.type = f[0] === 'phone' ? 'tel' : 'text';
        input.maxLength = f[3];
        input.setAttribute('autocomplete', (kind === 'main' ? '' : kind + ' ') + f[2]);
        if (f[0] === 'postal_code') { input.inputMode = 'numeric'; input.pattern = '[0-9]{5}'; }
        field.appendChild(label);
        field.appendChild(input);
        wrap.appendChild(field);
      });
      host.appendChild(wrap);
    });
  };

  var fill = function (kind, data) {
    FIELD_NAMES.forEach(function (n) { byId(kind + '-' + n).value = (data && data[n]) || ''; });
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
    if (!/^[0-9]{5}$/.test(a.postal_code || '')) return name + ': Bitte eine fünfstellige PLZ angeben.';
    if (!a.city) return name + ': Bitte den Ort angeben.';
    if (a.phone && !/^[0-9+()\/\-\s]{5,30}$/.test(a.phone)) return name + ': Die Telefonnummer enthält ungültige Zeichen.';
    return '';
  };

  // ---------- Start ----------
  auth.ready.then(function () { return auth.getSession(); }).then(function (s) {
    if (!s) { location.replace('login.html'); return; }
    init(s);
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
        .then(function () { show(msg, 'Deine Daten wurden gespeichert.', 'ok'); busy(f, false); })
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
