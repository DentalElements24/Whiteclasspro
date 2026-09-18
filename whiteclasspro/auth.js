// White Class Pro — Kundenkonto über Supabase Auth (direkt per fetch, ohne Fremdbibliothek).
// Die Sitzung liegt in localStorage; Passwörter werden nie gespeichert, nur an Supabase gesendet.
(function () {
  var cfg = window.WCP_SUPABASE || {};
  var KEY = 'wcp_session';
  var configured = !!(cfg.url && cfg.key);
  var base = (cfg.url || '').replace(/\/$/, '');

  var readSession = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  };

  var writeSession = function (s) {
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('wcp:auth-changed'));
  };

  var messages = {
    invalid_credentials: 'E-Mail oder Passwort ist falsch.',
    email_not_confirmed: 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der Bestätigungs-Mail).',
    weak_password: 'Das Passwort ist zu schwach. Bitte mindestens 8 Zeichen verwenden.',
    over_email_send_rate_limit: 'Zu viele Anfragen. Bitte warte kurz und versuche es erneut.',
    over_request_rate_limit: 'Zu viele Anfragen. Bitte warte kurz und versuche es erneut.',
    same_password: 'Das neue Passwort muss sich vom alten unterscheiden.',
    user_already_exists: 'Für diese E-Mail-Adresse gibt es bereits ein Konto.'
  };

  var request = function (path, options) {
    options = options || {};
    if (!configured) return Promise.reject(new Error('Der Kundenbereich ist noch nicht eingerichtet.'));
    var headers = { 'apikey': cfg.key, 'Content-Type': 'application/json' };
    if (options.token) headers['Authorization'] = 'Bearer ' + options.token;
    return fetch(base + path, {
      method: options.method || 'POST',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) {}
        if (!r.ok) {
          var code = data.error_code || data.code || '';
          var err = new Error(messages[code] || 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
          err.code = code;
          err.status = r.status;
          throw err;
        }
        return data;
      });
    }, function () {
      throw new Error('Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
    });
  };

  var toSession = function (d) {
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)),
      user: d.user || null
    };
  };

  var redirectTo = function (page) {
    return encodeURIComponent(location.origin + location.pathname.replace(/[^\/]*$/, '') + page);
  };

  var signUp = function (email, password) {
    return request('/auth/v1/signup?redirect_to=' + redirectTo('login.html'), { body: { email: email, password: password } })
      .then(function (d) {
        if (d.access_token) { writeSession(toSession(d)); return { confirmed: true }; }
        return { confirmed: false };
      });
  };

  var signIn = function (email, password) {
    return request('/auth/v1/token?grant_type=password', { body: { email: email, password: password } })
      .then(function (d) { writeSession(toSession(d)); });
  };

  var signOut = function () {
    var s = readSession();
    var done = function () { writeSession(null); };
    if (!s || !configured) { done(); return Promise.resolve(); }
    return request('/auth/v1/logout', { token: s.access_token }).then(done, done);
  };

  var recover = function (email) {
    return request('/auth/v1/recover?redirect_to=' + redirectTo('login.html'), { body: { email: email } });
  };

  var updatePassword = function (password) {
    var s = readSession();
    if (!s) return Promise.reject(new Error('Die Sitzung ist abgelaufen. Bitte fordere den Link erneut an.'));
    return request('/auth/v1/user', { method: 'PUT', token: s.access_token, body: { password: password } });
  };

  // Liefert die aktuelle Sitzung; erneuert sie bei Bedarf (Refresh-Token).
  var getSession = function () {
    var s = readSession();
    if (!s) return Promise.resolve(null);
    if (s.expires_at - Math.floor(Date.now() / 1000) > 60) return Promise.resolve(s);
    if (!s.refresh_token || !configured) { writeSession(null); return Promise.resolve(null); }
    return request('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } })
      .then(function (d) { var n = toSession(d); writeSession(n); return n; }, function () { writeSession(null); return null; });
  };

  // Rückkehr aus E-Mail-Links (Bestätigung / Passwort-Reset): Token steht im URL-Hash.
  var consumeHash = function () {
    if (!/access_token=/.test(location.hash)) return Promise.resolve();
    var p = new URLSearchParams(location.hash.replace(/^#/, ''));
    var token = p.get('access_token');
    var type = p.get('type');
    history.replaceState(null, '', location.pathname + location.search);
    if (!token || !configured) return Promise.resolve();
    return request('/auth/v1/user', { method: 'GET', token: token }).then(function (user) {
      writeSession({
        access_token: token,
        refresh_token: p.get('refresh_token'),
        expires_at: parseInt(p.get('expires_at'), 10) || (Math.floor(Date.now() / 1000) + (parseInt(p.get('expires_in'), 10) || 3600)),
        user: user
      });
      if (type === 'recovery') { try { sessionStorage.setItem('wcp_recovery', '1'); } catch (e) {} }
    }).catch(function () {});
  };

  // Header: "Anmelden" wird zu "Mein Konto", sobald jemand eingeloggt ist.
  var updateHeader = function () {
    var s = readSession();
    document.querySelectorAll('.account-link').forEach(function (a) {
      var label = a.querySelector('.account-label');
      if (s) {
        a.setAttribute('href', 'konto.html');
        a.setAttribute('aria-label', 'Mein Konto');
        if (label) label.textContent = 'Mein Konto';
      } else {
        a.setAttribute('href', 'login.html');
        a.setAttribute('aria-label', 'Kundenbereich – Anmelden');
        if (label) label.textContent = 'Anmelden';
      }
    });
  };

  document.addEventListener('wcp:auth-changed', updateHeader);
  window.addEventListener('storage', function (e) { if (e.key === KEY) updateHeader(); });

  window.WCP = window.WCP || {};
  window.WCP.auth = {
    configured: configured,
    signUp: signUp, signIn: signIn, signOut: signOut,
    recover: recover, updatePassword: updatePassword,
    getSession: getSession, readSession: readSession,
    ready: null
  };

  window.WCP.auth.ready = consumeHash().then(updateHeader);
})();
