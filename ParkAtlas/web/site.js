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
