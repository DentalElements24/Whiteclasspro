// White Class Pro — kleines Mobile-Nav-Script (kein Framework, kein Build-Schritt)
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Auf Mobile: Dropdown "Produkte" per Tap statt Hover öffnen/schließen
  var isMobile = function () {
    return window.matchMedia('(max-width: 780px)').matches;
  };

  document.querySelectorAll('.nav-item > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (isMobile()) {
        e.preventDefault();
        var item = btn.closest('.nav-item');
        item.classList.toggle('open');
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
        }
      });
    });
  }
});
