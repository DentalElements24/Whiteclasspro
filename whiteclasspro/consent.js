// White Class Pro — Einwilligungs-Banner und Google Analytics (kein Framework, kein Build-Schritt).
//
// Google Analytics lädt NUR nach ausdrücklicher Einwilligung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).
// Vor der Einwilligung wird keine Verbindung zu Google aufgebaut und kein Cookie gesetzt.
// Notwendige Speicherung (Warenkorb, Anmeldung) braucht keine Einwilligung und wird hier nicht berührt.
(function () {
  // Mess-ID von Google Analytics 4 (Format G-XXXXXXXXXX): analytics.google.com -> Verwalten -> Datenstreams.
  // Solange leer, passiert nichts: kein Banner, kein Google-Aufruf, der Link "Cookie-Einstellungen" bleibt verborgen.
  var GA_ID = '';

  var KEY = 'wcp_consent';   // 'granted' | 'denied'

  var read = function () {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  };
  var write = function (value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  };

  // Nur Pfad (und bei Produktseiten die Produkt-ID) an Google melden. Adressen wie
  // login.html?token_hash=… oder #access_token=… enthalten geheime Anmelde-Token und dürfen nie übertragen werden.
  var cleanLocation = function () {
    var id = new URLSearchParams(location.search).get('id');
    return location.origin + location.pathname + (id && /^[a-z0-9-]+$/.test(id) ? '?id=' + id : '');
  };

  var loaded = false;
  var loadAnalytics = function () {
    if (loaded || !GA_ID) return;
    loaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      page_location: cleanLocation(),
      page_referrer: '',
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  };

  // Widerruf: Google-Cookies (_ga, _ga_<ID>) entfernen und weitere Messung sperren
  var stopAnalytics = function () {
    if (GA_ID) window['ga-disable-' + GA_ID] = true;
    var host = location.hostname.split('.');
    var domains = ['', location.hostname];
    for (var i = 1; i < host.length - 1; i++) domains.push('.' + host.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name !== '_ga' && name.indexOf('_ga_') !== 0 && name !== '_gid' && name.indexOf('_gat') !== 0) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  };

  var banner = null;
  var closeBanner = function () {
    if (banner) { banner.remove(); banner = null; }
  };

  var choose = function (value) {
    var before = read();
    write(value);
    closeBanner();
    if (value === 'granted') loadAnalytics();
    else if (before === 'granted') stopAnalytics();
  };

  var openBanner = function () {
    if (banner) return;
    var current = read();
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'consent-title');
    banner.innerHTML =
      '<h2 id="consent-title">Cookies und Statistik</h2>' +
      '<p>Mit deiner Einwilligung nutzen wir Google Analytics, um zu verstehen, wie unsere Website genutzt wird. ' +
      'Dabei werden Cookies gesetzt und Daten an Google übertragen, auch in die USA. ' +
      'Ohne Einwilligung passiert das nicht; Warenkorb und Anmeldung funktionieren trotzdem. ' +
      'Du kannst deine Wahl jederzeit unter „Cookie-Einstellungen“ am Seitenende ändern. ' +
      'Mehr dazu in der <a href="datenschutz.html">Datenschutzerklärung</a> und im <a href="impressum.html">Impressum</a>.</p>' +
      (current ? '<p class="consent-state">Aktuell gewählt: ' + (current === 'granted' ? 'Statistik erlaubt' : 'Nur notwendige') + '</p>' : '') +
      '<div class="consent-actions">' +
        '<button type="button" class="btn btn-primary" data-consent="denied">Nur notwendige</button>' +
        '<button type="button" class="btn btn-primary" data-consent="granted">Alle akzeptieren</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (b) choose(b.getAttribute('data-consent'));
    });
    document.body.appendChild(banner);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('[data-cookie-settings]');
    if (!GA_ID) {
      // Ohne Analytics gibt es nichts einzustellen: Link ausblenden
      links.forEach(function (a) { var li = a.closest('li'); (li || a).hidden = true; });
      return;
    }
    links.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openBanner(); });
    });
    var saved = read();
    if (saved === 'granted') loadAnalytics();
    else if (saved !== 'denied') openBanner();
  });
})();
