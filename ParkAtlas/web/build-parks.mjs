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
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const SITE = 'https://parkatlas.io';
const APP_STORE = 'https://apps.apple.com/app/id6760982981';
const AFFILIATES = JSON.parse(await readFile(path.join(WEB, 'affiliates.json'), 'utf8'));
// Official NPS copy (public domain) pulled by web/fetch-nps-content.mjs; pages still build without it.
const NPS = await readFile(path.join(WEB, 'nps-content.json'), 'utf8').then(JSON.parse).catch(() => ({}));
// Distinct users who logged each park, from web/fetch-park-stats.mjs (gitignored; optional).
const STATS = await readFile(path.join(WEB, 'park-stats.json'), 'utf8').then(JSON.parse).catch(() => ({ parks: {} }));
// Below this, a count reads as "nobody uses this" rather than social proof, so it isn't rendered.
const MIN_SOCIAL_PROOF = 25;
const loggedBy = (park) => {
  const n = STATS.parks?.[park.id] ?? 0;
  return n >= MIN_SOCIAL_PROOF ? n : 0;
};

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
      export { slugify } from './utils/parkSlug';
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
const { PARKS, PARK_TERRAIN_BY_ID, getParkDetail, PARK_TRAILS, PARK_IMAGES, stateDisplayName, slugify } = await import(tmp);
await rm(tmp, { force: true });

// Build-time QR for the park-page sidebar (desktop only).
const qrSvg = (text) => QRCode.toString(text, { type: 'svg', margin: 1, width: 160, color: { dark: '#1b4332', light: '#ffffff' } });

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

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const milesBetween = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 0.621371;
};

const parks = PARKS.map((p) => ({ ...p, slug: slugify(p.name), detail: getParkDetail(p.npsCode), trails: PARK_TRAILS[p.npsCode] ?? [] }));
const bySlug = Object.fromEntries(parks.map((p) => [p.slug, p]));
// The park page already lists up to PARK_PAGE_TRAILS trails, so a /hikes sub-page would be a duplicate
// until trailsData.ts has more than that for a park. It switches on automatically once it does.
const PARK_PAGE_TRAILS = 8;
const hasHikesPage = (park) => park.trails.length > PARK_PAGE_TRAILS;

// Metro areas for /near/<city> pages. Mirrors the cities used for the "parks near you" reels.
const METROS = [
  ['Seattle', 'WA', 47.61, -122.33], ['Portland', 'OR', 45.52, -122.68], ['San Francisco', 'CA', 37.77, -122.42],
  ['Sacramento', 'CA', 38.58, -121.49], ['Los Angeles', 'CA', 34.05, -118.24], ['San Diego', 'CA', 32.72, -117.16],
  ['Las Vegas', 'NV', 36.17, -115.14], ['Phoenix', 'AZ', 33.45, -112.07], ['Tucson', 'AZ', 32.22, -110.97],
  ['Salt Lake City', 'UT', 40.76, -111.89], ['Boise', 'ID', 43.62, -116.2], ['Denver', 'CO', 39.74, -104.99],
  ['Albuquerque', 'NM', 35.08, -106.65], ['Dallas', 'TX', 32.78, -96.8], ['Austin', 'TX', 30.27, -97.74],
  ['San Antonio', 'TX', 29.42, -98.49], ['Houston', 'TX', 29.76, -95.37], ['Minneapolis', 'MN', 44.98, -93.27],
  ['Chicago', 'IL', 41.88, -87.63], ['St. Louis', 'MO', 38.63, -90.2], ['Kansas City', 'MO', 39.1, -94.58],
  ['Nashville', 'TN', 36.16, -86.78], ['Atlanta', 'GA', 33.75, -84.39], ['Charlotte', 'NC', 35.23, -80.84],
  ['Asheville', 'NC', 35.6, -82.55], ['Washington, DC', 'DC', 38.91, -77.04], ['Philadelphia', 'PA', 39.95, -75.17],
  ['New York', 'NY', 40.71, -74.01], ['Boston', 'MA', 42.36, -71.06], ['Detroit', 'MI', 42.33, -83.05],
  ['Cleveland', 'OH', 41.5, -81.69], ['Miami', 'FL', 25.76, -80.19], ['Orlando', 'FL', 28.54, -81.38],
  ['Anchorage', 'AK', 61.22, -149.9], ['Honolulu', 'HI', 21.31, -157.86],
].map(([city, state, lat, lng]) => ({ city, state, lat, lng, slug: slugify(city) }));

const NEAR_RADIUS_MI = 500;
const parksNear = (metro, n = 10) => {
  const ranked = parks.map((p) => ({ p, mi: milesBetween(metro, p) })).sort((a, b) => a.mi - b.mi);
  const within = ranked.filter((r) => r.mi <= NEAR_RADIUS_MI).slice(0, n);
  return within.length ? within : ranked.slice(0, 3);
};
const nearestMetros = (park, n = 2) =>
  METROS.map((m) => ({ m, mi: milesBetween(park, m) })).sort((a, b) => a.mi - b.mi).slice(0, n);
// Straight-line miles ≈ 1.25× road miles at ~60 mph; rounded to the half hour.
const driveHours = (mi) => Math.max(0.5, Math.round(((mi * 1.25) / 60) * 2) / 2);
const OFF_ROAD_GRID = new Set(['HI', 'AS', 'VI']);
const AK_ROAD_PARKS = new Set(['dena', 'kefj', 'wrst']);
const BOAT_PARKS = new Set(['drto', 'isro', 'chis']);
const needsFlight = (metro, park) =>
  OFF_ROAD_GRID.has(park.state) || OFF_ROAD_GRID.has(metro.state) ||
  (park.state === 'AK' && (metro.state !== 'AK' || !AK_ROAD_PARKS.has(park.npsCode))) ||
  (metro.state === 'AK' && park.state !== 'AK');
const driveLabel = (mi, park, metro) => {
  if (needsFlight(metro, park)) return 'flight or boat required';
  if (BOAT_PARKS.has(park.npsCode)) return 'ferry or flight required';
  const h = driveHours(mi);
  return `~${h % 1 === 0 ? h : h.toFixed(1)} hr drive`;
};
const trailBlurb = (p) => (p.detail.trailCount > 0 ? `${p.detail.trailCount}+ trails` : 'backcountry');

const nearby = (park, n = 4) =>
  parks
    .filter((p) => p.id !== park.id && p.state !== 'AS' && p.state !== 'VI' && p.state !== 'HI' && p.state !== 'AK' || (p.state === park.state && p.id !== park.id))
    .map((p) => ({ p, mi: milesBetween(park, p) }))
    .sort((a, b) => a.mi - b.mi)
    .slice(0, n);

// Deterministic "more parks" picks so every page links to a different spread of the catalog.
const moreParks = (park, n = 8) => {
  const others = parks.filter((p) => p.id !== park.id);
  const start = parks.findIndex((p) => p.id === park.id);
  const step = Math.max(1, Math.floor(others.length / n));
  return Array.from({ length: n }, (_, i) => others[(start + 3 + i * step) % others.length]);
};

// Split NPS prose into readable paragraphs (their copy is one long block).
const paragraphs = (text, max = 3) => {
  const sentences = (text || '').match(/[^.!?]+[.!?]+(\s|$)/g) || [];
  const out = []; let cur = '';
  for (const s of sentences) { cur += s; if (cur.length > 320) { out.push(cur.trim()); cur = ''; } }
  if (cur.trim()) out.push(cur.trim());
  return out.slice(0, max);
};

// ── Shared chrome ────────────────────────────────────────────────────────────
// appArgument: the Smart App Banner opens this URL in the app when it's installed.
const head = ({ title, description, url, image, jsonLd, appArgument }) => `<!doctype html>
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
  <script src="/analytics.js"></script>
  <script src="/site.js" defer></script>
  <meta name="apple-itunes-app" content="app-id=6760982981${appArgument ? `, app-argument=${esc(appArgument)}` : ''}" />
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
    <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span></button>
    <nav id="site-menu">
      <a href="/parks">National parks</a>
      <a href="/near">Parks near you</a>
      <a href="/gear">Gear</a>
      <a href="/#features">Features</a>
      <a href="/#about">Why</a>
      <a href="/#checklist">Checklist</a>
      <a class="nav-cta" href="/get">Get the app</a>
    </nav>
  </header>`;

const foot = ({ disclosure = false } = {}) => `
  <footer>
    <div class="foot-brand"><img src="/logo.png" alt="" width="28" height="28" /><span>ParkAtlas</span></div>
    <nav>
      <a href="/parks">National parks</a>
      <a href="/near">Parks near you</a>
      <a href="/gear">Gear</a>
      <a href="/privacy">Privacy</a>
      <a href="mailto:hello@parkatlas.io">Support</a>
      <a href="https://www.instagram.com/parkatlas.io/" target="_blank" rel="noopener">Instagram</a>
    </nav>
    ${disclosure ? `<p class="fine disclosure">${esc(AFFILIATES.disclosure)}</p>` : ''}
    <p class="fine">© 2026 Stellaroos. Park facts sourced from the National Park Service; not affiliated with NPS.</p>
  </footer>
</body>
</html>`;

// Affiliate/partner links from web/affiliates.json. A slot's trackedUrl wins over url once it's filled in.
const fillUrl = (tpl, vars) => tpl.replace(/\{(q|park|state|city|lat|lng)\}/g, (_, k) => encodeURIComponent(vars[k] ?? ''));
const parkVars = (park) => ({ q: `${park.name} National Park, ${stateDisplayName(park.state)}`, park: park.name, state: stateDisplayName(park.state), lat: park.lat, lng: park.lng });
const metroVars = (metro) => ({ q: `${metro.city}, ${stateDisplayName(metro.state)}`, city: metro.city, state: stateDisplayName(metro.state), lat: metro.lat, lng: metro.lng });
const slotUrl = (slot, ctx, vars) => {
  const tpl = ctx === 'near'
    ? (slot.trackedUrlNear || slot.urlNear || slot.trackedUrl || slot.url)
    : (slot.trackedUrl || slot.url);
  return tpl ? fillUrl(tpl, vars) : null;
};
const slotText = (s, ctx, vars) => (s[ctx === 'near' ? 'blurbNear' : 'blurb'] || s.blurb || '').replace(/\{(park|city|state)\}/g, (_, k) => vars[k] ?? '');
const slotTitle = (s, vars) => (s.title || '').replace(/\{(park|city|state)\}/g, (_, k) => vars[k] ?? '');
const affiliateSlot = (id) => AFFILIATES.slots.find((s) => s.id === id && s.enabled);
const affiliateUrl = (slot, park) => slotUrl(slot, 'park', parkVars(park));

// ctx: 'park' | 'near'. subject: the park or metro record.
const planTrip = (subject, ctx = 'park') => {
  const vars = ctx === 'near' ? metroVars(subject) : parkVars(subject);
  const slots = AFFILIATES.slots.filter((s) =>
    s.enabled && (s.contexts || ['park']).includes(ctx) && !(ctx === 'park' && s.requires === 'camping' && !subject.detail?.camping));
  if (!slots.length) return '';
  const card = (s) => {
    const href = s.internal ? s.url : slotUrl(s, ctx, vars);
    if (!href) return '';
    const attrs = s.internal ? '' : ` target="_blank" rel="sponsored noopener" data-aff="${s.id}"`;
    return `<a class="plan-card" href="${href}"${attrs}>
              <span class="plan-icon">${s.icon}</span>
              <strong>${esc(slotTitle(s, vars))}</strong>
              <span class="muted">${esc(slotText(s, ctx, vars))}</span>
              <span class="plan-cta">${esc(s.cta)} →</span>
            </a>`;
  };
  return `
        <section class="plan">
          <h2>Plan your trip</h2>
          <p class="muted">${ctx === 'near' ? `The practical bits for a ${esc(subject.city)} start — so more of the weekend goes to the trail.` : 'The practical bits, so more of the weekend goes to the trail.'}</p>
          <div class="plan-grid">
            ${slots.map(card).filter(Boolean).join('\n            ')}
          </div>
        </section>`;
};
// Text link for the pass wherever fees are mentioned.
const passLink = (park, label = 'America the Beautiful pass') => {
  const s = affiliateSlot('pass');
  const href = s ? affiliateUrl(s, park) : null;
  return href ? `<a class="text-link" href="${href}" target="_blank" rel="sponsored noopener" data-aff="pass">${esc(label)}</a>` : esc(label);
};

const appCta = (park) => `
  <aside class="app-cta">
    <img src="/logo.png" alt="" width="56" height="56" />
    <div>
      <h3>Track ${esc(park.name)} in ParkAtlas</h3>
      <p>Log the trail you hiked, keep every park you've explored in one place, and share a park card to Stories. No account required.</p>
    </div>
    <a class="appstore" href="/get" aria-label="Download on the App Store"${park.slug ? ` data-app-path="parks/${park.slug}"` : ''}><img src="/app-store-badge.svg" alt="Download on the App Store" width="160" height="53" /></a>
  </aside>`;

// "Been here?" toggle: state lives in localStorage (site.js); the website checklist hands off to the app via /import.
const beenHere = (park, extra = '') => `<button type="button" class="been-here ${extra}" data-id="${park.id}" data-slug="${park.slug}" aria-pressed="false"><span class="bh-off">Been here?</span><span class="bh-on">✓ Been here</span></button>`;

// ── Park page ────────────────────────────────────────────────────────────────
async function parkPage(park) {
  const d = park.detail;
  const state = stateDisplayName(park.state);
  const url = `${SITE}/parks/${park.slug}`;
  const qr = await qrSvg(url);
  const title = `${park.name} National Park — Trails, Camping, Fees & Best Time to Visit | ParkAtlas`;
  const description = `${d.description} Popular trails, camping, entry fee, peak season, and directions for ${park.name} National Park in ${state}.`;
  const near = nearby(park);
  const more = moreParks(park);
  const nps = NPS[park.npsCode] || null;
  const topTrails = park.trails.slice(0, 8);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${park.lat},${park.lng}`;
  const staySlot = affiliateSlot('stay');
  const staySearch = staySlot ? affiliateUrl(staySlot, park) : null;
  const aboutParas = nps ? paragraphs(nps.description) : [];
  const weatherParas = nps ? paragraphs(nps.weatherInfo, 2) : [];
  const directionParas = nps ? paragraphs(nps.directionsInfo, 2) : [];
  const fees = nps?.entranceFees?.filter((f) => f.title) ?? [];
  const activities = nps?.activities ?? [];

  const faqs = [
    { q: `How much does it cost to visit ${park.name} National Park?`, a: fees.length ? fees.slice(0, 3).map((f) => `${f.title}: ${Number(f.cost) > 0 ? `$${Number(f.cost).toFixed(0)}` : 'Free'}`).join('. ') + '.' : `Entry is ${d.entryFee}. An America the Beautiful annual pass covers entrance fees at every national park.` },
    { q: `When is the best time to visit ${park.name}?`, a: `Peak season is ${d.peakSeason}. ${d.openYear ? 'The park is open year-round, with some roads and facilities on reduced winter schedules.' : 'Access is seasonal; check NPS.gov for opening dates.'}${weatherParas[0] ? ' ' + weatherParas[0] : ''}` },
    { q: `Can you camp in ${park.name} National Park?`, a: d.camping ? (d.campsiteCount ? `Yes — about ${d.campsiteCount} campsites across the park's campgrounds. Reserve ahead in peak season.` : 'Yes — backcountry and primitive camping with a permit.') : 'There are no NPS campgrounds inside the park; lodging and private campgrounds are available nearby.' },
    { q: `What is the closest city to ${park.name} National Park?`, a: `${d.nearestCity} is the nearest major city.${directionParas[0] ? ' ' + directionParas[0] : ''}` },
    ...(topTrails.length ? [{ q: `What are the best hikes in ${park.name}?`, a: `Popular trails include ${topTrails.slice(0, 4).map((t) => `${t.name} (${t.miles.toFixed(1)} mi)`).join(', ')}. The park has roughly ${d.trailCount} named trails.` }] : []),
  ];

  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: `${park.name} National Park`,
    description: nps?.description || d.description,
    url,
    image: heroFor(park),
    geo: { '@type': 'GeoCoordinates', latitude: park.lat, longitude: park.lng },
    address: { '@type': 'PostalAddress', addressRegion: park.state, addressCountry: 'US' },
    isAccessibleForFree: d.entryFee.toLowerCase() === 'free',
    touristType: ['Hikers', 'Campers', 'Families'],
    ...(nps?.url ? { sameAs: nps.url } : {}),
  }, {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ParkAtlas', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'National parks', item: `${SITE}/parks` },
      { '@type': 'ListItem', position: 3, name: `${park.name} National Park`, item: url },
    ],
  }];

  return `${head({ title, description, url, image: heroFor(park, 1200), jsonLd, appArgument: url })}
  <main class="park">
    <section class="park-hero" style="background-image:url('${heroFor(park)}')">
      <div class="park-hero-inner">
        <p class="eyebrow light"><a class="crumb" href="/parks">National parks</a> · ${esc(state)}</p>
        <h1>${esc(park.name)} National Park</h1>
        <p class="lede light">${esc(d.description)}</p>
        <div class="facts">
          <span>🥾 ${d.trailCount}+ trails</span>
          <span>🎟️ ${esc(d.entryFee)}</span>
          <span>⛺ ${d.camping ? (d.campsiteCount ? `${d.campsiteCount} campsites` : 'Camping') : 'No campgrounds'}</span>
          <span>☀️ ${esc(d.peakSeason)}</span>
          <span>${d.openYear ? '📅 Open year-round' : '📅 Seasonal access'}</span>
          ${loggedBy(park) ? `<span>👥 Logged by ${loggedBy(park).toLocaleString('en-US')} ParkAtlas explorers</span>` : ''}
        </div>
        <div class="hero-actions">
          <a class="btn-app" href="/get" data-app-path="parks/${park.slug}"><img src="/logo.png" alt="" width="22" height="22" />Open in ParkAtlas</a>
          ${beenHere(park, 'light')}
        </div>
      </div>
    </section>

    <div class="park-body">
      <article class="park-main">
        ${aboutParas.length ? `
        <section>
          <h2>About ${esc(park.name)}</h2>
          ${aboutParas.map((p) => `<p>${esc(p)}</p>`).join('\n          ')}
          ${activities.length ? `<p class="muted"><strong>Things to do:</strong> ${activities.slice(0, 14).map(esc).join(' · ')}</p>` : ''}
        </section>` : ''}

        ${topTrails.length ? `
        <section>
          <h2>Popular trails</h2>
          <p class="muted">Curated routes with approximate round-trip distance. <span class="mobile-only">Tap one to log it in the app.</span><span class="desktop-only">In the app, tap one to log it.</span></p>
          <ul class="trail-list">
            ${topTrails.map((t) => `<li><a class="trail-log" href="/get" data-app-path="parks/${park.slug}?trail=${slugify(t.name)}"><span>${esc(t.name)}</span><strong>${t.miles.toFixed(1)} mi<small class="mobile-only"> · Log →</small></strong></a></li>`).join('\n            ')}
          </ul>
          ${hasHikesPage(park)
            ? `<p><a class="text-link" href="/parks/${park.slug}/hikes">All ${park.trails.length} ${esc(park.name)} hikes by distance →</a></p>`
            : park.trails.length > topTrails.length ? `<p class="muted">+ ${park.trails.length - topTrails.length} more in the app.</p>` : ''}
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
          ${staySearch ? `<p><a class="text-link" href="${staySearch}" target="_blank" rel="sponsored noopener" data-aff="stay">Find places to stay near ${esc(park.name)} →</a></p>` : ''}
        </section>

        <section>
          <h2>Best time to visit</h2>
          <p><strong>Peak season: ${esc(d.peakSeason)}.</strong> ${d.openYear
            ? 'The park is open year-round, though some roads and facilities close or run reduced hours in winter.'
            : 'Access is seasonal — confirm opening and closing dates on NPS.gov before you go.'}</p>
          ${weatherParas.map((p) => `<p>${esc(p)}</p>`).join('\n          ')}
        </section>

        ${fees.length ? `
        <section>
          <h2>Entrance fees</h2>
          <ul class="fee-list">
            ${fees.map((f) => `<li><span><strong>${esc(f.title)}</strong>${f.description ? ` <span class="muted">— ${esc(f.description)}</span>` : ''}</span><strong>${Number(f.cost) > 0 ? `$${Number(f.cost).toFixed(0)}` : 'Free'}</strong></li>`).join('\n            ')}
          </ul>
          ${nps?.entrancePasses?.[0] ? `<p class="muted">${esc(nps.entrancePasses[0].title)}: $${Number(nps.entrancePasses[0].cost).toFixed(0)}. An ${passLink(park)} ($80/yr) covers every national park.</p>` : `<p class="muted">Visiting more than two parks this year? An ${passLink(park)} ($80/yr) covers entry to all of them.</p>`}
        </section>` : `
        <section>
          <h2>Entrance fees</h2>
          <p>Entry is <strong>${esc(d.entryFee)}</strong>.${d.entryFee.toLowerCase() === 'free' ? '' : ` An ${passLink(park)} ($80/yr) covers entry to every national park — it pays for itself in about three visits.`}</p>
        </section>`}

        <section>
          <h2>Getting there</h2>
          <p>Nearest city: <strong>${esc(d.nearestCity)}</strong>. Park center: ${park.lat.toFixed(3)}°, ${park.lng.toFixed(3)}°.</p>
          ${directionParas.map((p) => `<p>${esc(p)}</p>`).join('\n          ')}
          <p class="muted">Coming from a big city? See every park near ${nearestMetros(park).map(({ m }) => `<a class="text-link" href="/near/${m.slug}">${esc(m.city)}</a>`).join(' or ')}.</p>
          <p>
            <a class="text-link" href="${mapsUrl}" target="_blank" rel="noopener">Open in Google Maps →</a> &nbsp;·&nbsp;
            <a class="text-link" href="${nps?.directionsUrl || `https://www.nps.gov/${park.npsCode}/index.htm`}" target="_blank" rel="noopener">Official NPS ${nps?.directionsUrl ? 'directions' : 'page'} →</a>
          </p>
        </section>

        <section class="faq">
          <h2>Common questions</h2>
          ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n          ')}
        </section>

        ${planTrip(park)}

        ${appCta(park)}
      </article>

      <aside class="park-side">
        <div class="qr-card desktop-only">
          ${qr}
          <div>
            <strong>Open on your phone</strong>
            <p class="muted">Scan to open ${esc(park.name)} in ParkAtlas, or the App Store if you don't have it yet.</p>
          </div>
        </div>
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
        <h3>More parks to explore</h3>
        <ul class="more-list">
          ${more.map((p) => `<li><a href="/parks/${p.slug}">${esc(p.name)}</a></li>`).join('\n          ')}
        </ul>
        ${creditFor(park) ? `<p class="credit">Photo: <a href="${creditPageFor(park)}" rel="noopener nofollow" target="_blank">${esc(creditFor(park))}</a></p>` : ''}
        ${nps ? `<p class="credit">Park descriptions, weather, and fee details courtesy of the <a href="${esc(nps.url)}" rel="noopener" target="_blank">National Park Service</a> (public domain).</p>` : ''}
      </aside>
    </div>
  </main>
${foot({ disclosure: true })}`;
}

// ── Hikes page (/parks/<slug>/hikes) ─────────────────────────────────────────
function hikesPage(park) {
  const d = park.detail;
  const state = stateDisplayName(park.state);
  const url = `${SITE}/parks/${park.slug}/hikes`;
  const sorted = [...park.trails].sort((a, b) => a.miles - b.miles);
  const groups = [
    { title: 'Short walks (under 3 miles)', blurb: 'Good for a first morning, kids, or squeezing one in before sunset.', list: sorted.filter((t) => t.miles < 3) },
    { title: 'Half-day hikes (3–7 miles)', blurb: 'The classic routes most visitors come for. Bring water and start early.', list: sorted.filter((t) => t.miles >= 3 && t.miles < 7) },
    { title: 'Full-day hikes (7+ miles)', blurb: 'Commit the day. Check conditions and permits on NPS.gov before you go.', list: sorted.filter((t) => t.miles >= 7) },
  ].filter((g) => g.list.length);
  const shortest = sorted[0];
  const longest = sorted[sorted.length - 1];
  const totalMiles = sorted.reduce((s, t) => s + t.miles, 0);
  const title = `Best Hikes in ${park.name} National Park — ${sorted.length} Trails by Distance | ParkAtlas`;
  const description = `${sorted.length} hikes in ${park.name} National Park, ${state}, sorted by round-trip distance from ${shortest.name} (${shortest.miles.toFixed(1)} mi) to ${longest.name} (${longest.miles.toFixed(1)} mi). Pick a trail, then log it in ParkAtlas.`;
  const near = nearby(park).filter(({ p }) => hasHikesPage(p));

  const faqs = [
    { q: `What is the easiest hike in ${park.name}?`, a: `${shortest.name} is the shortest route on this list at about ${shortest.miles.toFixed(1)} miles round trip.` },
    { q: `What is the longest day hike in ${park.name}?`, a: `${longest.name} runs roughly ${longest.miles.toFixed(1)} miles round trip. Start early and carry more water than you think you need.` },
    { q: `How many trails does ${park.name} have?`, a: `The park has roughly ${d.trailCount} named trails. The ${sorted.length} listed here are the ones visitors log most often in ParkAtlas.` },
    { q: `When is the best season to hike in ${park.name}?`, a: `Peak season is ${d.peakSeason}. ${d.openYear ? 'Trails are open year-round, though higher routes may hold snow or close in winter.' : 'Access is seasonal; confirm trail openings on NPS.gov before you go.'}` },
  ];

  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hikes in ${park.name} National Park`,
    numberOfItems: sorted.length,
    itemListElement: sorted.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, description: `${t.miles.toFixed(1)} miles round trip` })),
  }, {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ParkAtlas', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'National parks', item: `${SITE}/parks` },
      { '@type': 'ListItem', position: 3, name: `${park.name} National Park`, item: `${SITE}/parks/${park.slug}` },
      { '@type': 'ListItem', position: 4, name: 'Hikes', item: url },
    ],
  }];

  return `${head({ title, description, url, image: heroFor(park, 1200), jsonLd })}
  <main class="park">
    <section class="park-hero" style="background-image:url('${heroFor(park)}')">
      <div class="park-hero-inner">
        <p class="eyebrow light"><a class="crumb" href="/parks">National parks</a> · <a class="crumb" href="/parks/${park.slug}">${esc(park.name)}</a></p>
        <h1>Best hikes in ${esc(park.name)}</h1>
        <p class="lede light">${sorted.length} trails sorted by distance, from a ${shortest.miles.toFixed(1)}-mile stroll to a ${longest.miles.toFixed(1)}-mile day. Round-trip mileage is approximate.</p>
        <div class="facts">
          <span>🥾 ${sorted.length} trails listed</span>
          <span>📏 ${totalMiles.toFixed(0)} mi total</span>
          <span>☀️ ${esc(d.peakSeason)}</span>
          <span>🎟️ ${esc(d.entryFee)}</span>
        </div>
      </div>
    </section>

    <div class="park-body">
      <article class="park-main">
        ${groups.map((g) => `
        <section>
          <h2>${esc(g.title)}</h2>
          <p class="muted">${esc(g.blurb)}</p>
          <ul class="trail-list">
            ${g.list.map((t) => `<li><span>${esc(t.name)}</span><strong>${t.miles.toFixed(1)} mi</strong></li>`).join('\n            ')}
          </ul>
        </section>`).join('')}

        <section>
          <h2>Before you go</h2>
          <p>Distances are round trip and rounded; elevation, exposure, and conditions change the effort more than mileage does. Check current trail status and any permit requirements on the <a class="text-link" href="https://www.nps.gov/${park.npsCode}/planyourvisit/index.htm" target="_blank" rel="noopener">official NPS page</a>.</p>
          <p>For camping, fees, and the best time to visit, see the <a class="text-link" href="/parks/${park.slug}">${esc(park.name)} National Park guide</a>.</p>
        </section>

        <section class="faq">
          <h2>Common questions</h2>
          ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n          ')}
        </section>

        ${planTrip(park)}

        ${appCta(park)}
      </article>

      <aside class="park-side">
        <h3>Quick facts</h3>
        <dl class="facts-dl">
          <dt>State</dt><dd>${esc(state)}</dd>
          <dt>Shortest</dt><dd>${shortest.miles.toFixed(1)} mi</dd>
          <dt>Longest</dt><dd>${longest.miles.toFixed(1)} mi</dd>
          <dt>Peak season</dt><dd>${esc(d.peakSeason)}</dd>
          <dt>Entry fee</dt><dd>${esc(d.entryFee)}</dd>
        </dl>
        <a class="side-cta" href="/parks/${park.slug}">← ${esc(park.name)} overview</a>
        ${near.length ? `
        <h3>Hikes in nearby parks</h3>
        <ul class="near-list">
          ${near.map(({ p, mi }) => `<li><a href="/parks/${p.slug}/hikes"><span>${esc(p.name)}</span><small>${Math.round(mi)} mi · ${p.trails.length} trails</small></a></li>`).join('\n          ')}
        </ul>` : ''}
        ${creditFor(park) ? `<p class="credit">Photo: <a href="${creditPageFor(park)}" rel="noopener nofollow" target="_blank">${esc(creditFor(park))}</a></p>` : ''}
      </aside>
    </div>
  </main>
${foot({ disclosure: true })}`;
}

// ── Parks near a city (/near/<city>) ─────────────────────────────────────────
function nearPage(metro) {
  const url = `${SITE}/near/${metro.slug}`;
  const list = parksNear(metro);
  const closest = list[0];
  const weekend = list.filter(({ p, mi }) => !needsFlight(metro, p) && !BOAT_PARKS.has(p.npsCode) && driveHours(mi) <= 6);
  const title = `National Parks Near ${metro.city} — ${list.length} Parks by Drive Time | ParkAtlas`;
  const description = `The closest national parks to ${metro.city}, ${stateDisplayName(metro.state)}, ranked by distance. ${closest.p.name} is nearest at about ${Math.round(closest.mi)} miles. Trails, camping, and fees for each.`;
  const otherMetros = METROS.filter((m) => m.slug !== metro.slug).map((m) => ({ m, mi: milesBetween(metro, m) })).sort((a, b) => a.mi - b.mi).slice(0, 6);

  const faqs = [
    { q: `What is the closest national park to ${metro.city}?`, a: `${closest.p.name} National Park, about ${Math.round(closest.mi)} miles away (${driveLabel(closest.mi, closest.p, metro)}).` },
    ...(weekend.length ? [{ q: `Which national parks near ${metro.city} work for a weekend trip?`, a: `Within roughly a six-hour drive: ${weekend.map(({ p }) => p.name).join(', ')}.` }] : []),
    { q: `How many national parks are within ${NEAR_RADIUS_MI} miles of ${metro.city}?`, a: `${list.filter(({ mi }) => mi <= NEAR_RADIUS_MI).length} of the 63 U.S. national parks are within ${NEAR_RADIUS_MI} miles of ${metro.city}.` },
  ];

  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `National parks near ${metro.city}`,
    numberOfItems: list.length,
    itemListElement: list.map(({ p }, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.name} National Park`, url: `${SITE}/parks/${p.slug}` })),
  }, {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ParkAtlas', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Parks near you', item: `${SITE}/near` },
      { '@type': 'ListItem', position: 3, name: metro.city, item: url },
    ],
  }];

  return `${head({ title, description, url, image: heroFor(closest.p, 1200), jsonLd })}
  <main class="park">
    <section class="park-hero" style="background-image:url('${heroFor(closest.p)}')">
      <div class="park-hero-inner">
        <p class="eyebrow light"><a class="crumb" href="/near">Parks near you</a> · ${esc(stateDisplayName(metro.state))}</p>
        <h1>National parks near ${esc(metro.city)}</h1>
        <p class="lede light">${list.length} parks ranked by distance from downtown ${esc(metro.city)}. ${esc(closest.p.name)} is closest at about ${Math.round(closest.mi)} miles.</p>
        <div class="facts">
          <span>🚗 ${weekend.length} within a 6-hr drive</span>
          <span>🏞️ ${list.filter(({ mi }) => mi <= NEAR_RADIUS_MI).length} within ${NEAR_RADIUS_MI} mi</span>
        </div>
      </div>
    </section>

    <div class="park-body">
      <article class="park-main">
        <section>
          <h2>Closest first</h2>
          <p class="muted">Straight-line miles from the city center; drive times are rough estimates. Open the app for parks near wherever you are right now.</p>
          <ul class="trail-list near-parks">
            ${list.map(({ p, mi }, i) => `<li><a href="/parks/${p.slug}"><span><strong class="rank">${i + 1}</strong> ${esc(p.name)}<small class="muted"> · ${esc(stateDisplayName(p.state))} · ${trailBlurb(p)} · ${esc(p.detail.entryFee)}</small></span><strong>${Math.round(mi)} mi<small> · ${esc(driveLabel(mi, p, metro))}</small></strong></a></li>`).join('\n            ')}
          </ul>
        </section>

        <section>
          <h2>Planning a trip from ${esc(metro.city)}</h2>
          <p>${weekend.length
            ? `${weekend.map(({ p }) => `<a class="text-link" href="/parks/${p.slug}">${esc(p.name)}</a>`).join(', ')} ${weekend.length === 1 ? 'is' : 'are'} realistic for a long weekend. Leave early Friday, and reserve campsites or lodging ahead in peak season.`
            : `Nothing on this list is a casual day trip from ${esc(metro.city)}, so plan a longer road trip or fly closer. The <a class="text-link" href="/parkatlas-63-checklist.pdf">printable 63-park checklist</a> helps group parks by region.`}</p>
          <p>Each park page covers popular trails, camping, entrance fees, and the best time to visit. In ParkAtlas, the home screen shows unvisited parks within reach of your current location and lets you log the one you pick.</p>
        </section>

        <section class="faq">
          <h2>Common questions</h2>
          ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n          ')}
        </section>

        ${planTrip(metro, 'near')}

        ${appCta({ name: `parks near ${metro.city}` })}
      </article>

      <aside class="park-side">
        <h3>Other cities</h3>
        <ul class="near-list">
          ${otherMetros.map(({ m, mi }) => `<li><a href="/near/${m.slug}"><span>${esc(m.city)}</span><small>${Math.round(mi)} mi away</small></a></li>`).join('\n          ')}
        </ul>
        <a class="side-cta" href="/near">← All cities</a>
        <a class="side-cta" href="/parks">All 63 national parks</a>
        ${creditFor(closest.p) ? `<p class="credit">Photo (${esc(closest.p.name)}): <a href="${creditPageFor(closest.p)}" rel="noopener nofollow" target="_blank">${esc(creditFor(closest.p))}</a></p>` : ''}
      </aside>
    </div>
  </main>
${foot({ disclosure: true })}`;
}

function nearIndexPage() {
  const url = `${SITE}/near`;
  const title = 'National Parks Near Me — Closest Parks by City | ParkAtlas';
  const description = `Find the national parks closest to ${METROS.length} U.S. cities, ranked by drive time, with trails, camping, and fees for each.`;
  const sorted = [...METROS].sort((a, b) => a.city.localeCompare(b.city));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'National parks by nearest city',
    numberOfItems: sorted.length,
    itemListElement: sorted.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: `National parks near ${m.city}`, url: `${SITE}/near/${m.slug}` })),
  };
  return `${head({ title, description, url, image: `${SITE}/og.png`, jsonLd })}
  <main class="parks-index">
    <section class="index-hero">
      <p class="eyebrow">Start close to home</p>
      <h1>National parks near you</h1>
      <p class="lede">Pick your city for the closest parks by drive time. Or open the app — it uses your location and skips the ones you've already logged.</p>
      <a class="appstore" href="/get" aria-label="Download on the App Store"><img src="/app-store-badge.svg" alt="Download on the App Store" width="160" height="53" /></a>
    </section>
    <section class="state-grid">
      ${sorted.map((m) => {
        const c = parksNear(m)[0];
        return `
      <div class="state-card">
        <h2><a href="/near/${m.slug}">${esc(m.city)}</a> <small>${esc(m.state)}</small></h2>
        <ul><li class="muted">Closest: <a href="/parks/${c.p.slug}">${esc(c.p.name)}</a>, ${Math.round(c.mi)} mi</li></ul>
      </div>`;
      }).join('')}
    </section>
  </main>
${foot()}`;
}

// ── Index page ───────────────────────────────────────────────────────────────
const REGIONS = [
  ['California', ['CA']],
  ['Pacific Northwest', ['WA', 'OR']],
  ['Mountain West', ['UT', 'CO', 'WY', 'MT', 'ID']],
  ['Southwest', ['AZ', 'NM', 'NV', 'TX']],
  ['Midwest & Plains', ['SD', 'ND', 'MN', 'MI', 'IN', 'OH', 'MO']],
  ['South & East', ['ME', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'AR', 'FL']],
  ['Alaska', ['AK']],
  ['Hawaii & Islands', ['HI', 'AS', 'VI']],
];
const regionOf = (park) => REGIONS.find(([, states]) => states.includes(park.state))?.[0] ?? 'Other';

function indexPage() {
  const url = `${SITE}/parks`;
  const title = 'All 63 U.S. National Parks — Photos, Trails, Camping & Fees | ParkAtlas';
  const description = 'Browse every U.S. national park by region with photos, entry fees, peak season, and trail counts. Search by name or state, then keep track of the ones you\u2019ve explored in the ParkAtlas app.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'U.S. National Parks',
    numberOfItems: parks.length,
    itemListElement: parks.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.name} National Park`, url: `${SITE}/parks/${p.slug}` })),
  };
  const groups = REGIONS.map(([name]) => [name, parks.filter((p) => regionOf(p) === name).sort((a, b) => a.name.localeCompare(b.name))]).filter(([, list]) => list.length);
  const card = (p) => `
        <div class="park-card-wrap">
        <a class="park-card" href="/parks/${p.slug}" data-name="${esc(p.name.toLowerCase())}" data-state="${esc(stateDisplayName(p.state).toLowerCase())} ${esc(p.state.toLowerCase())}" data-region="${esc(regionOf(p))}" data-id="${p.id}">
          <img src="${heroFor(p, 640)}" alt="" loading="lazy" width="320" height="240" />
          <span class="park-card-body">
            <strong>${esc(p.name)}</strong>
            <small>${esc(stateDisplayName(p.state))}</small>
            <span class="park-card-facts"><span>🎟️ ${esc(p.detail.entryFee)}</span><span>☀️ ${esc(p.detail.peakSeason)}</span></span>
            ${loggedBy(p) ? `<span class="park-card-proof">👥 ${loggedBy(p).toLocaleString('en-US')} explorers logged it</span>` : ''}
          </span>
        </a>
        ${beenHere(p, 'on-card')}
        </div>`;

  return `${head({ title, description, url, image: `${SITE}/og.png`, jsonLd })}
  <main class="parks-index">
    <section class="index-hero">
      <p class="eyebrow">All 63</p>
      <h1>Every U.S. national park</h1>
      <p class="lede">Browse by region, or type a park or state. Each page has trails, camping, fees, and the best time to go. Closer to home? See <a class="text-link" href="/near">parks near your city</a> or <a class="text-link" href="/parkatlas-63-checklist.pdf">print the checklist</a>.</p>
      <div class="filter-bar" role="search">
        <label class="sr-only" for="park-filter">Filter parks by name or state</label>
        <input id="park-filter" type="search" placeholder="Search parks or states…" autocomplete="off" />
        <span class="filter-count" id="park-count" aria-live="polite">${parks.length} parks</span>
      </div>
      <div class="chips" id="region-chips" role="group" aria-label="Filter by region">
        <button type="button" class="chip is-active" data-region="">All</button>
        ${groups.map(([name, list]) => `<button type="button" class="chip" data-region="${esc(name)}">${esc(name)} <small>${list.length}</small></button>`).join('\n        ')}
      </div>
      <div class="web-ring" id="web-ring" hidden>
        <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="track" cx="32" cy="32" r="27"></circle><circle class="fill" id="web-ring-fill" cx="32" cy="32" r="27"></circle></svg>
        <div class="web-ring-text">
          <strong><span id="web-ring-count">0</span> of ${parks.length}</strong>
          <span class="muted">parks you've marked “Been here” on this device</span>
        </div>
        <button type="button" class="btn-app" id="handoff-open"><span class="desktop-only">📲 Send to my phone</span><span class="mobile-only">Add these to ParkAtlas</span></button>
      </div>
      <div class="handoff" id="handoff" hidden>
        <strong>Open this link on your iPhone</strong>
        <p class="muted">It opens ParkAtlas with these parks ready to add — or the App Store first if you don't have the app yet. The link keeps working after you install.</p>
        <div class="handoff-row"><input id="handoff-url" type="text" readonly aria-label="Import link" /><button type="button" class="chip" id="handoff-copy">Copy</button><a class="chip" id="handoff-mail" href="#">Email me this link</a></div>
      </div>
    </section>
    <div id="park-directory">
    ${groups.map(([name, list]) => `
    <section class="region" data-region="${esc(name)}">
      <h2>${esc(name)} <small>${list.length} ${list.length === 1 ? 'park' : 'parks'}</small></h2>
      <div class="park-grid">${list.map(card).join('')}
      </div>
    </section>`).join('')}
    <p class="no-results" id="no-results" hidden>No parks match that. Try a park name like “Zion” or a state like “Utah”.</p>
    </div>
    <section class="final-cta">
      <h2>Been to some of these?<br />Log them in two taps.</h2>
      <a class="appstore" href="/get" aria-label="Download on the App Store"><img src="/app-store-badge.svg" alt="Download on the App Store" width="180" height="60" /></a>
    </section>
  </main>
${foot()}`;
}

// ── Write everything ─────────────────────────────────────────────────────────
await rm(path.join(WEB, 'parks'), { recursive: true, force: true });
await rm(path.join(WEB, 'near'), { recursive: true, force: true });
await mkdir(path.join(WEB, 'parks'), { recursive: true });
await mkdir(path.join(WEB, 'near'), { recursive: true });
let hikesCount = 0;
for (const park of parks) {
  const dir = path.join(WEB, 'parks', park.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), await parkPage(park));
  if (hasHikesPage(park)) {
    await mkdir(path.join(dir, 'hikes'), { recursive: true });
    await writeFile(path.join(dir, 'hikes', 'index.html'), hikesPage(park));
    hikesCount += 1;
  }
}
await writeFile(path.join(WEB, 'parks', 'index.html'), indexPage());
for (const metro of METROS) {
  const dir = path.join(WEB, 'near', metro.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), nearPage(metro));
}
await writeFile(path.join(WEB, 'near', 'index.html'), nearIndexPage());
// Lightweight lookup for client-side pages (/import) — id, slug, name, state.
await writeFile(path.join(WEB, 'parks-min.json'), JSON.stringify(parks.map((p) => ({ id: p.id, slug: p.slug, name: p.name, state: stateDisplayName(p.state) }))));

const today = new Date().toISOString().slice(0, 10);
const urls = [
  '/', '/parks', '/near', '/gear', '/s', '/import', '/privacy',
  ...parks.map((p) => `/parks/${p.slug}`),
  ...parks.filter(hasHikesPage).map((p) => `/parks/${p.slug}/hikes`),
  ...METROS.map((m) => `/near/${m.slug}`),
];
await writeFile(
  path.join(WEB, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>${u.startsWith('/parks/') || u.startsWith('/near/') ? 'monthly' : 'weekly'}</changefreq></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(path.join(WEB, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`wrote ${parks.length} park pages, ${hikesCount} hikes pages, ${METROS.length} near-city pages, indexes, sitemap (${urls.length} urls), robots.txt`);
