/** Link for share messages: parkatlas.io/s renders the sharer's ring + an install CTA (see web/s/index.html). */
export function shareLandingUrl(opts: { name?: string; parks: number; latestPark?: string }): string {
  const q = new URLSearchParams();
  q.set('p', String(Math.max(0, Math.min(63, Math.round(opts.parks)))));
  const name = (opts.name || '').trim().slice(0, 24);
  if (name) q.set('n', name);
  const park = (opts.latestPark || '').trim().slice(0, 48);
  if (park) q.set('k', park);
  return `https://parkatlas.io/s?${q.toString()}`;
}
