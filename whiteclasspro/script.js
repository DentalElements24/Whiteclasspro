// White Class Pro — kleines Mobile-Nav-Script (kein Framework, kein Build-Schritt)
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  var headerWrap = document.querySelector('.site-header-fixed');
  var navContainer = nav ? nav.querySelector('.container') : null;

  var isMobile = function () {
    return window.matchMedia('(max-width: 780px)').matches;
  };

  // --- Fixierter Header: Platzhalter (padding-top) exakt auf die
  // tatsächliche Höhe von Promo-Banner + Logo + Navigation setzen,
  // damit der Seiteninhalt nie darunter verschwindet. ---
  var syncHeaderHeight = function () {
    if (!headerWrap) return;
    var h = headerWrap.offsetHeight;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  };

  // --- Mobile: aufgeklapptes Menü darf nie höher als der sichtbare
  // Bereich unterhalb des fixierten Headers werden — sonst wird es
  // intern scrollbar statt über den Viewport hinauszulaufen. ---
  var syncMobileNavMaxHeight = function () {
    if (!nav || !navContainer) return;
    if (!isMobile()) {
      navContainer.style.maxHeight = '';
      return;
    }
    var navTop = nav.getBoundingClientRect().top;
    var available = window.innerHeight - navTop;
    navContainer.style.maxHeight = Math.max(160, available) + 'px';
  };

  var syncAll = function () {
    syncHeaderHeight();
    syncMobileNavMaxHeight();
  };

  syncAll();
  window.addEventListener('load', syncAll);
  window.addEventListener('resize', syncAll);
  window.addEventListener('orientationchange', syncAll);

  // Logo lädt asynchron — Höhe neu berechnen, sobald es fertig ist,
  // damit der Header-Platzhalter nicht kurz zu niedrig ist.
  var logo = document.querySelector('.site-logo');
  if (logo && !logo.complete) {
    logo.addEventListener('load', syncAll);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      syncAll();
    });
  }

  // Auf Mobile: Dropdown "Menü"/Sprachauswahl per Tap statt Hover öffnen/schließen
  document.querySelectorAll('.nav-item > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (isMobile()) {
        e.preventDefault();
        var item = btn.closest('.nav-item');
        item.classList.toggle('open');
        syncAll();
      }
    });
  });

  // Menü schließen, wenn ein normaler Link angeklickt wird (mobil)
  if (nav) {
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (isMobile()) {
          nav.classList.remove('nav-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
          syncAll();
        }
      });
    });
  }
});
