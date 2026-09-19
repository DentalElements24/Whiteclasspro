// White Class Pro — Logik für login.html und konto.html
document.addEventListener('DOMContentLoaded', function () {
  var auth = window.WCP && window.WCP.auth;
  if (!auth) return;

  var byId = function (id) { return document.getElementById(id); };
  // Nach dem Anmelden zurück in den Warenkorb, wenn der Kunde von dort kam (?next=warenkorb.html).
  // Nur diese eine feste Zielseite ist erlaubt, damit die Adresse nicht missbraucht werden kann.
  // Das Ziel wird beim Laden gemerkt, damit es auch nach Registrierung + E-Mail-Bestätigung gilt.
  try {
    if (new URLSearchParams(location.search).get('next') === 'warenkorb.html') localStorage.setItem('wcp_next', 'warenkorb.html');
  } catch (e) {}
  var afterLoginPage = function () {
    var next = null;
    try { next = localStorage.getItem('wcp_next'); localStorage.removeItem('wcp_next'); } catch (e) {}
    return next === 'warenkorb.html' ? 'warenkorb.html' : 'konto.html';
  };

  var show = function (el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-msg ' + (kind || 'error');
    el.hidden = !text;
  };

  var busy = function (form, on) {
    form.querySelectorAll('button[type="submit"], input').forEach(function (el) { el.disabled = on; });
  };

  // ---------- Kundenkonto (konto.html) ----------
  var accountRoot = byId('account-root');
  if (accountRoot) {
    auth.ready.then(function () { return auth.getSession(); }).then(function (s) {
      if (!s) { location.replace('login.html'); return; }
      var email = (s.user && s.user.email) || '';
      var meta = (s.user && s.user.user_metadata) || {};
      byId('account-email').textContent = email;
      byId('pf-first').value = meta.first_name || '';
      byId('pf-last').value = meta.last_name || '';
      accountRoot.hidden = false;
    });
    byId('form-profile').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = byId('msg-profile');
      var first = f.first.value.trim(), last = f.last.value.trim();
      if (!first || !last) { show(msg, 'Bitte Vor- und Nachnamen eintragen.', 'error'); return; }
      busy(f, true);
      auth.updateProfile(first, last).then(function () {
        show(msg, 'Gespeichert.', 'ok');
        busy(f, false);
      }).catch(function (err) { show(msg, err.message, 'error'); busy(f, false); });
    });
    byId('logout-btn').addEventListener('click', function () {
      auth.signOut().then(function () { location.href = 'index.html'; });
    });
    return;
  }

  // ---------- Anmeldung / Registrierung (login.html) ----------
  var loginRoot = byId('login-root');
  if (!loginRoot) return;

  var panels = { login: byId('panel-login'), register: byId('panel-register'), forgot: byId('panel-forgot'), reset: byId('panel-reset') };
  var tabs = document.querySelectorAll('[data-tab]');

  var showPanel = function (name) {
    Object.keys(panels).forEach(function (k) { panels[k].hidden = (k !== name); });
    tabs.forEach(function (t) {
      var active = t.getAttribute('data-tab') === name;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelector('.auth-tabs').hidden = (name === 'forgot' || name === 'reset');
  };

  tabs.forEach(function (t) { t.addEventListener('click', function () { showPanel(t.getAttribute('data-tab')); }); });
  byId('to-forgot').addEventListener('click', function () { showPanel('forgot'); });
  byId('back-login').addEventListener('click', function () { showPanel('login'); });
  byId('done-to-login').addEventListener('click', function () {
    // Registrierungsformular für einen späteren Besuch des Tabs wieder einblenden
    byId('form-register').hidden = false;
    byId('register-done').hidden = true;
    showPanel('login');
  });

  if (!auth.configured) {
    byId('setup-note').hidden = false;
    loginRoot.querySelectorAll('form').forEach(function (f) { busy(f, true); });
    return;
  }

  auth.ready.then(function () { return auth.getSession(); }).then(function (s) {
    var recovery = false;
    try { recovery = sessionStorage.getItem('wcp_recovery') === '1'; } catch (e) {}
    if (s && recovery) { showPanel('reset'); loginRoot.hidden = false; return; }
    if (s) { location.replace(afterLoginPage()); return; }
    if (auth.linkError()) {
      show(byId('msg-login'), 'Der Link aus der E-Mail ist ungültig oder abgelaufen. Bitte melde dich an oder fordere über „Passwort vergessen?“ einen neuen Link an.');
    }
    loginRoot.hidden = false;
  });

  byId('form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = byId('msg-login');
    show(msg, '');
    busy(f, true);
    auth.signIn(f.email.value.trim(), f.password.value)
      .then(function () { location.href = afterLoginPage(); })
      .catch(function (err) { show(msg, err.message); busy(f, false); });
  });

  byId('form-register').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = byId('msg-register');
    show(msg, '');
    var first = f.first.value.trim(), last = f.last.value.trim();
    if (!first || !last) { show(msg, 'Bitte gib deinen Vor- und Nachnamen an.'); return; }
    if (f.password.value.length < 8) { show(msg, 'Das Passwort muss mindestens 8 Zeichen lang sein.'); return; }
    if (f.password.value !== f.password2.value) { show(msg, 'Die Passwörter stimmen nicht überein.'); return; }
    if (!f.consent.checked) { show(msg, 'Bitte bestätige die Kenntnisnahme der Datenschutzerklärung.'); return; }
    busy(f, true);
    auth.signUp(f.email.value.trim(), f.password.value, { first_name: first, last_name: last }).then(function (r) {
      if (r.confirmed) { location.href = afterLoginPage(); return; }
      // Eingabefelder ausblenden, nur die Bestätigung bleibt sichtbar
      f.reset();
      busy(f, false);
      f.hidden = true;
      byId('register-done').hidden = false;
    }).catch(function (err) { show(msg, err.message); busy(f, false); });
  });

  byId('form-forgot').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = byId('msg-forgot');
    show(msg, '');
    busy(f, true);
    auth.recover(f.email.value.trim()).then(function () {
      show(msg, 'Falls für diese Adresse ein Konto existiert, haben wir dir einen Link zum Zurücksetzen geschickt.', 'ok');
      busy(f, false);
    }).catch(function (err) { show(msg, err.message); busy(f, false); });
  });

  byId('form-reset').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = byId('msg-reset');
    show(msg, '');
    if (f.password.value.length < 8) { show(msg, 'Das Passwort muss mindestens 8 Zeichen lang sein.'); return; }
    if (f.password.value !== f.password2.value) { show(msg, 'Die Passwörter stimmen nicht überein.'); return; }
    busy(f, true);
    auth.updatePassword(f.password.value).then(function () {
      try { sessionStorage.removeItem('wcp_recovery'); } catch (e2) {}
      location.href = afterLoginPage();
    }).catch(function (err) { show(msg, err.message); busy(f, false); });
  });
});
