// Mobile nav toggle for parkatlas.io.
(function () {
  var header = document.querySelector('header.nav');
  var btn = header && header.querySelector('.nav-toggle');
  if (!header || !btn) return;
  function setOpen(open) {
    header.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { setOpen(!header.classList.contains('open')); });
  header.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
})();

// /parks directory: text + region filtering. Works without JS (everything is rendered); this only hides.
(function () {
  var input = document.getElementById('park-filter');
  var chips = document.getElementById('region-chips');
  if (!input || !chips) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.park-card'));
  var regions = Array.prototype.slice.call(document.querySelectorAll('.region'));
  var count = document.getElementById('park-count');
  var empty = document.getElementById('no-results');
  var region = '';
  var fold = function (s) { return s.normalize('NFD').replace(/[\u0300-\u036f\u02bb\u2018\u2019']/g, '').toLowerCase(); };
  function apply() {
    var q = fold(input.value.trim());
    var shown = 0;
    cards.forEach(function (c) {
      var hay = fold(c.getAttribute('data-name') + ' ' + c.getAttribute('data-state'));
      var ok = (!region || c.getAttribute('data-region') === region) && (!q || hay.indexOf(q) !== -1);
      c.hidden = !ok;
      if (ok) shown++;
    });
    regions.forEach(function (r) { r.hidden = !r.querySelector('.park-card:not([hidden])'); });
    if (count) count.textContent = shown + (shown === 1 ? ' park' : ' parks');
    if (empty) empty.hidden = shown > 0;
  }
  input.addEventListener('input', apply);
  chips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    region = chip.getAttribute('data-region') || '';
    chips.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    apply();
  });
  // Deep-linkable: /parks?q=utah
  var initial = new URLSearchParams(location.search).get('q');
  if (initial) { input.value = initial; apply(); }
})();
