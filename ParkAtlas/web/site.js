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
      var wrap = c.closest('.park-card-wrap');
      if (wrap) wrap.hidden = !ok;
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

// Web → app: on phones, [data-app-path] tries the parkatlas:// scheme and falls back to the App Store.
// (Same-domain taps in Safari don't fire universal links, so the custom scheme is the reliable path here.)
(function () {
  var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (mobile) document.documentElement.classList.add('is-mobile');
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-app-path]');
    if (!el) return;
    var path = el.getAttribute('data-app-path');
    if (!mobile) {
      // Desktop: trail rows aren't links anywhere useful; everything else keeps its href (/get).
      if (el.classList.contains('trail-log')) e.preventDefault();
      return;
    }
    e.preventDefault();
    var fallback = el.getAttribute('href') || '/get';
    var t = setTimeout(function () { if (document.visibilityState === 'visible') location.href = fallback; }, 1400);
    document.addEventListener('visibilitychange', function onHide() {
      if (document.visibilityState === 'hidden') { clearTimeout(t); document.removeEventListener('visibilitychange', onHide); }
    });
    if (window.gtag) gtag('event', 'open_in_app', { path: path });
    location.href = 'parkatlas://' + path;
  });
})();

// "Been here?" checklist: slugs in localStorage, progress ring + hand-off QR on /parks.
(function () {
  var KEY = 'pa.visited';
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.been-here[data-id]'));
  if (!buttons.length) return;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } }
  function save(ids) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (_) {} }
  var ids = load().filter(function (x) { return /^\d+$/.test(String(x)); });

  var ring = document.getElementById('web-ring');
  var fill = document.getElementById('web-ring-fill');
  var count = document.getElementById('web-ring-count');
  var total = buttons.length;
  function render() {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(ids.indexOf(b.getAttribute('data-id')) !== -1)); });
    if (ring) {
      ring.hidden = ids.length === 0;
      if (count) count.textContent = String(ids.length);
      if (fill) fill.style.strokeDashoffset = String(170 - 170 * Math.min(1, ids.length / total));
    }
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var id = b.getAttribute('data-id');
      var i = ids.indexOf(id);
      if (i === -1) ids.push(id); else ids.splice(i, 1);
      save(ids); render();
      if (window.gtag) gtag('event', 'been_here_toggle', { park: b.getAttribute('data-slug'), on: i === -1 });
    });
  });
  render();

  // Hand-off (only on /parks). On a phone the button deep-links straight into the app; on desktop it reveals the link.
  var open = document.getElementById('handoff-open');
  var panel = document.getElementById('handoff');
  if (!open || !panel) return;
  var urlInput = document.getElementById('handoff-url');
  var mail = document.getElementById('handoff-mail');
  var copy = document.getElementById('handoff-copy');
  var isMobile = document.documentElement.classList.contains('is-mobile');
  function importUrl() { return 'https://parkatlas.io/import?v=' + ids.join(','); }
  open.addEventListener('click', function () {
    if (!ids.length) return;
    var url = importUrl();
    if (window.gtag) gtag('event', 'handoff_open', { parks: ids.length, mobile: isMobile });
    if (isMobile) {
      var t = setTimeout(function () { if (document.visibilityState === 'visible') location.href = url; }, 1400);
      document.addEventListener('visibilitychange', function onHide() { if (document.visibilityState === 'hidden') { clearTimeout(t); document.removeEventListener('visibilitychange', onHide); } });
      location.href = 'parkatlas://import?v=' + ids.join(',');
      return;
    }
    urlInput.value = url;
    mail.setAttribute('href', 'mailto:?subject=' + encodeURIComponent('My national parks for ParkAtlas') + '&body=' + encodeURIComponent('Open this on your iPhone to add ' + ids.length + (ids.length === 1 ? ' park' : ' parks') + ' to ParkAtlas:\n\n' + url));
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  copy.addEventListener('click', function () {
    var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(urlInput.value).then(done, function () { urlInput.select(); });
    else { urlInput.select(); try { document.execCommand('copy'); done(); } catch (_) {} }
  });
})();
