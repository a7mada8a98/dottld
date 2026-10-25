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
  var status = document.getElementById('filter-status');

  if (filterButtons.length && rows.length) {
    var activeFilters = {};

    var matches = function (row, filter, group) {
      if (filter === 'all') return true;
      if (group === 'tld') return row.getAttribute('data-tld') === filter;
      if (group === 'category') return row.getAttribute('data-category') === filter;
      if (filter === 'featured') return row.getAttribute('data-featured') === 'true';
      if (filter === 'offer') return !row.hasAttribute('data-price') && row.getAttribute('data-sold') !== 'true';

      var length = parseInt(row.getAttribute('data-length'), 10);
      if (filter === '5') return length >= 5;
      return length === parseInt(filter, 10);
    };

    var applyFilters = function () {
      var visible = 0;

      Array.prototype.forEach.call(rows, function (row) {
        var show = true;
        Object.keys(activeFilters).forEach(function (group) {
          if (show && !matches(row, activeFilters[group], group)) show = false;
        });
        row.hidden = !show;
        if (show) visible++;
      });

      if (empty) empty.hidden = visible !== 0;
      if (status) status.textContent = visible ? visible + ' names shown' : 'No names match';
    };

    Array.prototype.forEach.call(filterButtons, function (button) {
      var group = button.getAttribute('data-filter-group');
      var filter = button.getAttribute('data-filter');
      var count = 0;
      var badge = button.querySelector('span');

      Array.prototype.forEach.call(rows, function (row) {
        if (matches(row, filter, group)) count++;
      });
      if (badge) badge.textContent = count;

      if (!activeFilters[group]) activeFilters[group] = 'all';

      button.addEventListener('click', function () {
        activeFilters[group] = filter;

        Array.prototype.forEach.call(filterButtons, function (other) {
          if (other.getAttribute('data-filter-group') !== group) return;
          var active = other === button;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });

        applyFilters();
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
