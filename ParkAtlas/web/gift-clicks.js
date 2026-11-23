function trackGiftClick(event) {
  if (event.type === 'auxclick' && event.button !== 1) return;
  const link = event.target.closest('a[data-gift-asin]');
  if (!link || typeof window.gtag !== 'function') return;
  window.gtag('event', 'gift_product_click', {
    product_asin: link.dataset.giftAsin,
    gift_section: link.dataset.giftSection,
  });
}

document.addEventListener('click', trackGiftClick);
document.addEventListener('auxclick', trackGiftClick);
