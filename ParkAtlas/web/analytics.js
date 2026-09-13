// Google Analytics 4 for parkatlas.io. Single place for the measurement id; skipped on localhost.
(function () {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  var id = 'G-2PPVTDKDP3';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
})();
