#!/usr/bin/env node
/**
 * Generates static SEO pages for all 63 national parks from the app's own data modules.
 *   web/parks/<slug>/index.html   one page per park
 *   web/parks/index.html          all parks grouped by state
 *   web/sitemap.xml, web/robots.txt
 *
 * Usage: node web/build-parks.mjs   (run from the ParkAtlas folder; requires esbuild devDep)
 */
import { build } from 'esbuild';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const SITE = 'https://parkatlas.io';
const APP_STORE = 'https://apps.apple.com/app/id6760982981';
const AFFILIATES = JSON.parse(await readFile(path.join(WEB, 'affiliates.json'), 'utf8'));

// ── Load the TypeScript data by bundling a tiny entry with esbuild ────────────
const tmp = path.join(os.tmpdir(), `parkatlas-data-${Date.now()}.mjs`);
await build({
  stdin: {
    contents: `
      export { PARKS, PARK_TERRAIN_BY_ID } from './data/parksData';
      export { getParkDetail } from './data/parkDetails';
      export { PARK_TRAILS } from './data/trailsData';
      export { PARK_IMAGES } from './data/parkImages';
      export { stateDisplayName } from './utils/search';
    `,
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tmp,
  logLevel: 'silent',
});
const { PARKS, PARK_TERRAIN_BY_ID, getParkDetail, PARK_TRAILS, PARK_IMAGES, stateDisplayName } = await import(tmp);
await rm(tmp, { force: true });

// ── Helpers ──────────────────────────────────────────────────────────────────
const TERRAIN_IMAGE = {
  coastline: 'photo-1507525428034-b723cf961d3e',
  alpine: 'photo-1464822759023-fed622ff2c3b',
  woodland: 'photo-1441974231531-c6227db76b6e',
  desert: 'photo-1473580044384-7ba9967e16a0',
};
// Same photo the app shows for the park, so web and app match.
const heroFor = (park, w = 1600) =>
  PARK_IMAGES[park.id]?.[w >= 1280 ? 'url' : 'thumb'] ??
  `https://images.unsplash.com/${TERRAIN_IMAGE[PARK_TERRAIN_BY_ID[park.id] ?? 'woodland']}?auto=format&fit=crop&w=${w}&q=80`;
const creditFor = (park) => PARK_IMAGES[park.id]?.credit;
const creditPageFor = (park) => PARK_IMAGES[park.id]?.page;

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u02bb\u2018\u2019']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const milesBetween = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 0.621371;
};

const parks = PARKS.map((p) => ({ ...p, slug: slugify(p.name), detail: getParkDetail(p.npsCode), trails: PARK_TRAILS[p.npsCode] ?? [] }));
const bySlug = Object.fromEntries(parks.map((p) => [p.slug, p]));

const nearby = (park, n = 4) =>
  parks
    .filter((p) => p.id !== park.id && p.state !== 'AS' && p.state !== 'VI' && p.state !== 'HI' && p.state !== 'AK' || (p.state === park.state && p.id !== park.id))
    .map((p) => ({ p, mi: milesBetween(park, p) }))
    .sort((a, b) => a.mi - b.mi)
    .slice(0, n);

// ── Shared chrome ────────────────────────────────────────────────────────────
const head = ({ title, description, url, image, jsonLd }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/parks.css" />
  <meta name="apple-itunes-app" content="app-id=6760982981" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="ParkAtlas" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
  <header class="nav">
    <a class="brand" href="/"><img src="/logo.png" alt="" width="36" height="36" /><span>ParkAtlas</span></a>
    <nav>
      <a href="/parks">National parks</a>
      <a href="/#checklist">Checklist</a>
      <a class="nav-cta" href="/get">Get the app</a>
    </nav>
  </header>`;

const foot = ({ disclosure = false } = {}) => `
  <footer>
    <div class="foot-brand"><img src="/logo.png" alt="" width="28" height="28" /><span>ParkAtlas</span></div>
    <nav>
      <a href="/parks">National parks</a>
      <a href="/privacy">Privacy</a>
      <a href="mailto:hello@parkatlas.io">Support</a>
      <a href="https://www.instagram.com/parkatlas.io/" target="_blank" rel="noopener">Instagram</a>
    </nav>
    ${disclosure ? `<p class="fine disclosure">${esc(AFFILIATES.disclosure)}</p>` : ''}
    <p class="fine">© 2026 Stellaroos. Park facts sourced from the National Park Service; not affiliated with NPS.</p>
  </footer>
</body>
</html>`;

// Affiliate/partner links from web/affiliates.json. {q} = "<Park> National Park, <State>".
const affiliateUrl = (slot, park) =>
  slot.url.replace('{q}', encodeURIComponent(`${park.name} National Park, ${stateDisplayName(park.state)}`));
const affiliateSlot = (id) => AFFILIATES.slots.find((s) => s.id === id && s.enabled);

const planTrip = (park) => {
  const slots = AFFILIATES.slots.filter((s) => s.enabled);
  if (!slots.length) return '';
  return `
        <section class="plan">
          <h2>Plan your trip</h2>
          <p class="muted">The practical bits, so more of the weekend goes to the trail.</p>
          <div class="plan-grid">
            ${slots.map((s) => `<a class="plan-card" href="${affiliateUrl(s, park)}" target="_blank" rel="sponsored noopener">
              <span class="plan-icon">${s.icon}</span>
              <strong>${esc(s.title)}</strong>
              <span class="muted">${esc(s.blurb)}</span>
              <span class="plan-cta">${esc(s.cta)} →</span>
            </a>`).join('\n            ')}
          </div>
        </section>`;
};

const appCta = (park) => `
  <aside class="app-cta">
    <img src="/logo.png" alt="" width="56" height="56" />
    <div>
      <h3>Track ${esc(park.name)} in ParkAtlas</h3>
      <p>Log the trail you hiked, keep every park you've explored in one place, and share a park card to Stories. No account required.</p>
    </div>
    <a class="appstore" href="/get" aria-label="Download on the App Store"><img src="/app-store-badge.svg" alt="Download on the App Store" width="160" height="53" /></a>
  </aside>`;

// ── Park page ────────────────────────────────────────────────────────────────
function parkPage(park) {
  const d = park.detail;
  const state = stateDisplayName(park.state);
  const url = `${SITE}/parks/${park.slug}`;
  const title = `${park.name} National Park — Trails, Camping, Fees & Best Time to Visit | ParkAtlas`;
  const description = `${d.description} Popular trails, camping, entry fee, peak season, and directions for ${park.name} National Park in ${state}.`;
  const near = nearby(park);
  const topTrails = park.trails.slice(0, 8);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${park.lat},${park.lng}`;
  const staySlot = affiliateSlot('stay');
  const staySearch = staySlot ? affiliateUrl(staySlot, park) : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: `${park.name} National Park`,
    description: d.description,
    url,
    image: heroFor(park),
    geo: { '@type': 'GeoCoordinates', latitude: park.lat, longitude: park.lng },
    address: { '@type': 'PostalAddress', addressRegion: park.state, addressCountry: 'US' },
    isAccessibleForFree: d.entryFee.toLowerCase() === 'free',
    touristType: ['Hikers', 'Campers', 'Families'],
  };

  return `${head({ title, description, url, image: heroFor(park, 1200), jsonLd })}
  <main class="park">
    <section class="park-hero" style="background-image:url('${heroFor(park)}')">
      <div class="park-hero-inner">
        <p class="eyebrow light">${esc(state)} · National Park</p>
        <h1>${esc(park.name)}</h1>
        <p class="lede light">${esc(d.description)}</p>
        <div class="facts">
          <span>🥾 ${d.trailCount}+ trails</span>
          <span>🎟️ ${esc(d.entryFee)}</span>
          <span>⛺ ${d.camping ? (d.campsiteCount ? `${d.campsiteCount} campsites` : 'Camping') : 'No campgrounds'}</span>
          <span>☀️ ${esc(d.peakSeason)}</span>
          <span>${d.openYear ? '📅 Open year-round' : '📅 Seasonal access'}</span>
        </div>
      </div>
    </section>

    <div class="park-body">
      <article class="park-main">
        ${topTrails.length ? `
        <section>
          <h2>Popular trails</h2>
          <p class="muted">Curated routes with approximate round-trip distance. In the app, tap one to log it.</p>
          <ul class="trail-list">
            ${topTrails.map((t) => `<li><span>${esc(t.name)}</span><strong>${t.miles.toFixed(1)} mi</strong></li>`).join('\n            ')}
          </ul>
          ${park.trails.length > topTrails.length ? `<p class="muted">+ ${park.trails.length - topTrails.length} more in the app.</p>` : ''}
        </section>` : `
        <section>
          <h2>Trails</h2>
          <p class="muted">${park.name} has roughly ${d.trailCount} named trails. Log the one you hiked in the app — or just the park if you're not sure.</p>
        </section>`}

        <section>
          <h2>Camping</h2>
          <p>${d.camping
            ? (d.campsiteCount
              ? `Approximately ${d.campsiteCount} campsites across the park's campgrounds. Reservations are strongly recommended in peak season (${esc(d.peakSeason)}).`
              : 'Backcountry and primitive camping are available. Check NPS.gov for permits and current conditions.')
            : 'There are no NPS campgrounds inside the park. Lodging and private campgrounds are typically available nearby.'}</p>
          ${staySearch ? `<p><a class="text-link" href="${staySearch}" target="_blank" rel="sponsored noopener">Find places to stay near ${esc(park.name)} →</a></p>` : ''}
        </section>

        <section>
          <h2>Best time to visit</h2>
          <p><strong>Peak season: ${esc(d.peakSeason)}.</strong> ${d.openYear
            ? 'The park is open year-round, though some roads and facilities close or run reduced hours in winter.'
            : 'Access is seasonal — confirm opening and closing dates on NPS.gov before you go.'}</p>
        </section>

        <section>
          <h2>Getting there</h2>
          <p>Nearest city: <strong>${esc(d.nearestCity)}</strong>. Park center: ${park.lat.toFixed(3)}°, ${park.lng.toFixed(3)}°.</p>
          <p>
            <a class="text-link" href="${mapsUrl}" target="_blank" rel="noopener">Open in Google Maps →</a> &nbsp;·&nbsp;
            <a class="text-link" href="https://www.nps.gov/${park.npsCode}/index.htm" target="_blank" rel="noopener">Official NPS page →</a>
          </p>
        </section>

        ${planTrip(park)}

        ${appCta(park)}
      </article>

      <aside class="park-side">
        <h3>Nearby national parks</h3>
        <ul class="near-list">
          ${near.map(({ p, mi }) => `<li><a href="/parks/${p.slug}"><span>${esc(p.name)}</span><small>${Math.round(mi)} mi · ${esc(stateDisplayName(p.state))}</small></a></li>`).join('\n          ')}
        </ul>
        <h3>Quick facts</h3>
        <dl class="facts-dl">
          <dt>State</dt><dd>${esc(state)}</dd>
          <dt>Entry fee</dt><dd>${esc(d.entryFee)}</dd>
          <dt>Named trails</dt><dd>${d.trailCount}+</dd>
          <dt>Camping</dt><dd>${d.camping ? 'Yes' : 'No campgrounds'}</dd>
          <dt>Open</dt><dd>${d.openYear ? 'Year-round' : 'Seasonal'}</dd>
          <dt>NPS code</dt><dd>${park.npsCode.toUpperCase()}</dd>
        </dl>
        <a class="side-cta" href="/parks">← All national parks</a>
        ${creditFor(park) ? `<p class="credit">Photo: <a href="${creditPageFor(park)}" rel="noopener nofollow" target="_blank">${esc(creditFor(park))}</a></p>` : ''}
      </aside>
    </div>
  </main>
${foot({ disclosure: true })}`;
}

// ── Index page ───────────────────────────────────────────────────────────────
function indexPage() {
  const groups = new Map();
  for (const p of parks) {
    const s = stateDisplayName(p.state);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(p);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const url = `${SITE}/parks`;
  const title = 'U.S. National Parks by State — Trails, Camping & Fees | ParkAtlas';
  const description = 'Every U.S. national park grouped by state, with trails, camping, entry fees, and the best time to visit. Keep track of the ones you\u2019ve explored in the ParkAtlas app.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'U.S. National Parks',
    numberOfItems: parks.length,
    itemListElement: parks.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.name} National Park`, url: `${SITE}/parks/${p.slug}` })),
  };

  return `${head({ title, description, url, image: `${SITE}/og.png`, jsonLd })}
  <main class="parks-index">
    <section class="index-hero">
      <p class="eyebrow">The full list</p>
      <h1>National parks, by state</h1>
      <p class="lede">Tap any park for trails, camping, fees, and the best time to go. Or <a class="text-link" href="/parkatlas-63-checklist.pdf">print the checklist</a> and start planning.</p>
      <a class="appstore" href="/get" aria-label="Download on the App Store"><img src="/app-store-badge.svg" alt="Download on the App Store" width="160" height="53" /></a>
    </section>
    <section class="state-grid">
      ${sorted.map(([state, list]) => `
      <div class="state-card">
        <h2>${esc(state)} <small>${list.length}</small></h2>
        <ul>
          ${list.sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<li><a href="/parks/${p.slug}">${esc(p.name)}</a></li>`).join('\n          ')}
        </ul>
      </div>`).join('')}
    </section>
  </main>
${foot()}`;
}

// ── Write everything ─────────────────────────────────────────────────────────
await rm(path.join(WEB, 'parks'), { recursive: true, force: true });
await mkdir(path.join(WEB, 'parks'), { recursive: true });
for (const park of parks) {
  const dir = path.join(WEB, 'parks', park.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), parkPage(park));
}
await writeFile(path.join(WEB, 'parks', 'index.html'), indexPage());

const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/parks', '/privacy', ...parks.map((p) => `/parks/${p.slug}`)];
await writeFile(
  path.join(WEB, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>${u.startsWith('/parks/') ? 'monthly' : 'weekly'}</changefreq></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(path.join(WEB, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`wrote ${parks.length} park pages, parks index, sitemap (${urls.length} urls), robots.txt`);
