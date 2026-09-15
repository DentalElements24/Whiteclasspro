// White Class Pro — kleines Mobile-Nav-Script (kein Framework, kein Build-Schritt)
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  var headerWrap = document.querySelector('.site-header-fixed');

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

  syncHeaderHeight();
  window.addEventListener('load', syncHeaderHeight);
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('orientationchange', syncHeaderHeight);

  // Logo lädt asynchron — Höhe neu berechnen, sobald es fertig ist,
  // damit der Header-Platzhalter nicht kurz zu niedrig ist.
  var logo = document.querySelector('.site-logo');
  if (logo && !logo.complete) {
    logo.addEventListener('load', syncHeaderHeight);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (!isOpen) {
        // Beim Schließen des Hamburger-Menüs auch offene Dropdowns zuklappen
        document.querySelectorAll('.nav-item.open').forEach(function (item) {
          item.classList.remove('open');
        });
      }
      syncHeaderHeight();
    });
  }

  // Auf Mobile: "Menü" / Sprachauswahl per Tap statt Hover öffnen/schließen.
  // Menü links, Sprachauswahl rechts — es öffnet dabei immer nur eines der
  // beiden Dropdowns gleichzeitig.
  var navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(function (item) {
    var btn = item.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (!isMobile()) return;
      e.preventDefault();
      var willOpen = !item.classList.contains('open');
      navItems.forEach(function (other) { other.classList.remove('open'); });
      if (willOpen) item.classList.add('open');
    });
  });

  // Menü schließen, wenn ein normaler Link angeklickt wird (mobil)
  if (nav) {
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (isMobile()) {
          nav.classList.remove('nav-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
          syncHeaderHeight();
        }
      });
    });
  }
});
