(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var header = document.querySelector('.site-header');

  function syncHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  var filterButtons = document.querySelectorAll('.filter-btn');
  var rows = document.querySelectorAll('.domain-row');
  var empty = document.querySelector('.table-empty');

  if (filterButtons.length && rows.length) {
    var matches = function (row, filter) {
      if (filter === 'all') return true;
      if (filter === 'featured') return row.getAttribute('data-featured') === 'true';
      if (filter === 'offer') return !row.hasAttribute('data-price');

      var length = parseInt(row.getAttribute('data-length'), 10);
      if (filter === '5') return length >= 5;
      return length === parseInt(filter, 10);
    };

    Array.prototype.forEach.call(filterButtons, function (button) {
      button.addEventListener('click', function () {
        var filter = button.getAttribute('data-filter');
        var visible = 0;

        Array.prototype.forEach.call(filterButtons, function (other) {
          var active = other === button;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });

        Array.prototype.forEach.call(rows, function (row) {
          var show = matches(row, filter);
          row.hidden = !show;
          if (show) visible++;
        });

        if (empty) empty.hidden = visible !== 0;
      });
    });
  }

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
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

  Array.prototype.forEach.call(reveals, function (el) {
    observer.observe(el);
  });
})();
