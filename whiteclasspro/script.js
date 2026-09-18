// White Class Pro — Header-Script (kein Framework, kein Build-Schritt)
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  var headerWrap = document.querySelector('.site-header-fixed');

  // --- Fixierter Header: Platzhalter (padding-top) exakt auf die
  // tatsächliche Höhe von Promo-Banner + Header setzen, damit der
  // Seiteninhalt nie darunter verschwindet. ---
  var syncHeaderHeight = function () {
    if (!headerWrap) return;
    document.documentElement.style.setProperty('--header-h', headerWrap.offsetHeight + 'px');
  };

  syncHeaderHeight();
  window.addEventListener('load', syncHeaderHeight);
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('orientationchange', syncHeaderHeight);

  // Logo lädt asynchron — Höhe neu berechnen, sobald es fertig ist.
  var logo = document.querySelector('.site-logo');
  if (logo && !logo.complete) {
    logo.addEventListener('load', syncHeaderHeight);
  }

  // --- Aktuelle Seite in der Navigation markieren ---
  var here = location.pathname.split('/').pop() || 'index.html';
  if (nav) {
    nav.querySelectorAll(':scope > a').forEach(function (link) {
      var target = link.getAttribute('href');
      if (target.indexOf('#') === -1 && target === here) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // --- Mobiles Menü (Burger) ---
  var closeNav = function () {
    if (!nav || !toggle) return;
    nav.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menü öffnen');
  };

  if (toggle && nav) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
    });

    // Klick auf einen Link schließt das Menü
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  // --- Sprach-Dropdown: per Tap/Klick öffnen (Hover gibt es auf Touch nicht) ---
  document.querySelectorAll('.nav-item').forEach(function (item) {
    var btn = item.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !item.classList.contains('open');
      document.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
      if (willOpen) item.classList.add('open');
    });
  });

  // Klick daneben oder Escape schließt Menü und Dropdowns
  var closeAll = function () {
    closeNav();
    document.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
  };
  document.addEventListener('click', function (e) {
    if (nav && nav.contains(e.target)) return;
    closeAll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  // Beim Wechsel auf Desktop-Breite Menüzustand zurücksetzen
  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width: 1101px)').matches) closeNav();
  });
});
