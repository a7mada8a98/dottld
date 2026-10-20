(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var header = document.querySelector('.site-header');

  function syncHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  var reveals = document.querySelectorAll('[data-reveal]');
  if (!reveals.length) return;

  if (reduce.matches || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) {
      el.classList.add('is-in');
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  Array.prototype.forEach.call(reveals, function (el) {
    observer.observe(el);
  });
})();
