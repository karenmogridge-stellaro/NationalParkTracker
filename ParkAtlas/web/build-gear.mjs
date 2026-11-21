#!/usr/bin/env node
/**
 * Builds /gear and /gifts from gear.json and gifts.json. Run: node web/build-gear.mjs
 * Gift entries can reuse an existing gear item by catalogAsin or specify an exact ASIN.
 * Optional gift photos use local assets and attribution in gifts.json; Gear listing images are not inherited.
 * The hero and section photos are lifestyle images, separate from the shoppable product cards.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WEB = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://parkatlas.io';
const G = JSON.parse(await readFile(path.join(WEB, 'gear.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function amazonUrl(item) {
  if (item.url) {
    const u = new URL(item.url);
    // amzn.to short links already carry the Associates tag; leave them untouched.
    if (u.hostname !== 'amzn.to' && !u.searchParams.has('tag')) u.searchParams.set('tag', G.tag);
    return u.toString();
  }
  if (item.asin) return `https://www.amazon.com/dp/${item.asin}?tag=${encodeURIComponent(G.tag)}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(item.search || item.name)}&tag=${encodeURIComponent(G.tag)}`;
}

const sections = G.sections.filter((s) => s.enabled !== false).map((s) => ({ ...s, items: (s.items || []).filter((i) => i.enabled !== false) })).filter((s) => s.items.length);

const card = (item) => `
        <article class="gear-card${item.pick ? ' is-pick' : ''}">
          ${item.image ? `<a class="gear-img-wrap" href="${esc(amazonUrl(item))}" target="_blank" rel="sponsored noopener" tabindex="-1" aria-hidden="true"><img class="gear-img" src="${esc(item.image)}" alt="" loading="lazy" width="400" height="300" /></a>` : ''}
          <div class="gear-body">
            ${item.pick ? `<span class="pick-badge">★ ${esc(G.pickLabel)}</span>` : ''}
            <h3>${esc(item.name)}</h3>
            <p>${esc(item.why)}</p>
            <a class="gear-btn" href="${esc(amazonUrl(item))}" target="_blank" rel="sponsored noopener">Shop on Amazon →</a>
          </div>
        </article>`;

const section = (s) => `
      <section class="gear-section" id="${esc(s.id)}">
        <div class="gear-section-head">
          <span class="gear-icon">${s.icon || ''}</span>
          <div>
            <h2>${esc(s.title)}</h2>
            ${s.blurb ? `<p class="muted">${esc(s.blurb)}</p>` : ''}
          </div>
        </div>
        <div class="gear-grid">${s.items.map(card).join('')}
        </div>
      </section>`;

const title = 'ParkAtlas Gear — What to pack for a national park trip';
const description = 'Day hiking essentials, road trip gear, camping favorites, park passports, and dog gear — the short list of things worth bringing to a national or state park.';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${SITE}/gear" />
  <link rel="icon" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/parks.css" />
  <link rel="stylesheet" href="/gear.css" />
  <script src="/analytics.js"></script>
  <script src="/site.js" defer></script>
  <meta name="apple-itunes-app" content="app-id=6760982981" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ParkAtlas" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${SITE}/gear" />
  <meta property="og:image" content="${esc(G.hero.image)}" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <header class="nav">
    <a class="brand" href="/"><img src="/logo.png" alt="" width="36" height="36" /><span>ParkAtlas</span></a>
    <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-menu"><span></span><span></span><span></span></button>
    <nav id="site-menu">
      <a href="/parks">National parks</a>
      <a href="/gear" aria-current="page">Gear</a>
      <a href="/#features">Features</a>
      <a href="/#about">Why</a>
      <a href="/#checklist">Checklist</a>
      <a class="nav-cta" href="/get">Get the app</a>
    </nav>
  </header>

  <main class="gear">
    <section class="park-hero gear-hero" style="background-image:url('${esc(G.hero.image)}')">
      <div class="park-hero-inner">
        <p class="eyebrow light">${esc(G.hero.eyebrow)}</p>
        <h1>${esc(G.hero.title)}</h1>
        <p class="lede light">${esc(G.hero.lede)}</p>
        <p class="gear-disclosure light">${esc(G.disclosure)}</p>
      </div>
    </section>

    <div class="gear-body-wrap">
      <nav class="gear-toc" aria-label="Sections">
        ${sections.map((s) => `<a href="#${esc(s.id)}">${s.icon || ''} ${esc(s.title)}</a>`).join('\n        ')}
      </nav>

      <p class="gear-trust">${esc(G.trust)}</p>
      <p class="gear-guide-link"><a class="text-link" href="/gifts">Shopping for a friend? See Ren’s gift ideas →</a></p>
      ${sections.map(section).join('\n')}

      <aside class="app-cta">
        <img src="/logo.png" alt="" width="56" height="56" />
        <div>
          <h3>Pack it, then log it</h3>
          <p>ParkAtlas keeps every park and trail you've done in one place — and tells you what's nearby for the next trip.</p>
        </div>
        <a class="appstore" href="/get" aria-label="Download on the App Store"><img src="/app-store-badge.svg" alt="Download on the App Store" width="160" height="53" /></a>
      </aside>
    </div>
  </main>

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
    <p class="fine disclosure">${esc(G.disclosure)} Prices and availability are set by Amazon and may change.${G.hero.imageCredit ? ` Photo: ${esc(G.hero.imageCredit)}.` : ''}</p>
    <p class="fine">© 2026 Stellaroos. Not affiliated with the National Park Service.</p>
  </footer>
</body>
</html>
`;

await mkdir(path.join(WEB, 'gear'), { recursive: true });
await writeFile(path.join(WEB, 'gear', 'index.html'), html);
console.log(`wrote gear page: ${sections.length} sections, ${sections.reduce((n, s) => n + s.items.length, 0)} items (tag ${G.tag})`);

const giftCatalog = JSON.parse(await readFile(path.join(WEB, 'gifts.json'), 'utf8'));
const gearItems = sections.flatMap((entry) => entry.items);
const giftSections = giftCatalog.sections.map((s) => ({
  ...s,
  items: s.items.map((item) => {
    const existing = item.catalogAsin && gearItems.find((entry) => entry.asin === item.catalogAsin);
    if (item.catalogAsin && !existing) {
      throw new Error(`Unknown gear ASIN in gift section ${s.id}: ${item.catalogAsin}`);
    }
    const asin = existing?.asin ?? item.asin;
    const name = existing?.name ?? item.name;
    if (!/^[A-Z0-9]{10}$/.test(asin) || !name || !item.why) {
      throw new Error(`Gift items need an exact ASIN, name, and description in section ${s.id}`);
    }
    return { asin, name, why: item.why, photo: item.photo };
  }),
}));
const giftPhotoCredits = giftSections.flatMap((s) => s.items.filter((item) => item.photo));
const lifestylePhotos = [
  { name: 'Cover', photo: giftCatalog.heroPhoto },
  ...giftSections.filter((s) => s.sectionPhoto).map((s) => ({ name: s.label, photo: s.sectionPhoto })),
].filter(({ photo }) => photo.source);
const lifestyleImage = (photo, className, lead = false) =>
  `<img class="${className}" src="${esc(photo.src)}" alt="${esc(photo.alt)}" ${lead ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;

const giftSection = (s) => `
      <section class="gear-section gift-section" id="${esc(s.id)}">
        <h2>${esc(s.title)}</h2>
        ${s.sectionPhoto ? lifestyleImage(s.sectionPhoto, 'gift-section-photo') : ''}
        ${s.giftIdea ? `<p class="gift-idea">${esc(s.giftIdea)}</p>` : ''}
        <div class="gear-grid">
          ${s.items.map((item) => `
          <article class="gear-card gift-card">
            <a href="${esc(amazonUrl(item))}" target="_blank" rel="sponsored noopener" data-gift-section="${esc(s.id)}" data-gift-asin="${esc(item.asin)}" aria-labelledby="gift-${esc(item.asin)} shop-${esc(item.asin)}">
              ${item.photo ? `<img class="gift-photo" src="${esc(item.photo.src)}" alt="${esc(item.photo.alt)}" loading="lazy" decoding="async" />` : ''}
              <div class="gear-body">
                <h3 id="gift-${esc(item.asin)}">${esc(item.name)}</h3>
                <p>${esc(item.why)}</p>
                <span class="gear-btn" id="shop-${esc(item.asin)}">Shop on Amazon ↗</span>
              </div>
            </a>
          </article>`).join('')}
        </div>
      </section>`;

const giftTitle = 'Christmas gifts for the friend who’d rather be outside';
const giftDescription = 'Ren’s Christmas picks for hiking, camp coffee, and a little post-adventure self-care.';
const giftHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(giftTitle)} | ParkAtlas</title>
  <meta name="description" content="${esc(giftDescription)}" />
  <link rel="canonical" href="${SITE}/gifts" />
  <link rel="icon" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/gear.css" />
  <script src="/analytics.js"></script>
  <script src="/gift-clicks.js" defer></script>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ParkAtlas" />
  <meta property="og:title" content="${esc(giftTitle)}" />
  <meta property="og:description" content="${esc(giftDescription)}" />
  <meta property="og:url" content="${SITE}/gifts" />
</head>
<body class="gift-site">
  <header class="gift-nav">
    <a class="brand" href="/"><img src="/logo.png" alt="" width="36" height="36" /><span>ParkAtlas</span></a>
    <a class="text-link" href="/gear">All gear</a>
  </header>
  <main>
    <div class="gear-body-wrap gift-page">
      <section class="gift-intro" aria-labelledby="gift-title">
        <div class="gift-intro-copy">
          <p class="eyebrow">Ren’s holiday gift guide</p>
          <h1 id="gift-title">${esc(giftTitle)}</h1>
          <p class="gift-disclosure">${esc(G.disclosure)}</p>
        </div>
        ${lifestyleImage(giftCatalog.heroPhoto, 'gift-hero-photo', true)}
      </section>
      <nav class="gear-toc" aria-label="Gift guide sections">
        ${giftSections.map((s) => `<a href="#${esc(s.id)}">${esc(s.label)}</a>`).join('\n        ')}
      </nav>
      ${giftSections.map(giftSection).join('\n')}
    </div>
  </main>
  <footer>
    <div class="foot-brand"><img src="/logo.png" alt="" width="28" height="28" /><span>ParkAtlas</span></div>
    <nav><a href="/gear">All gear</a><a href="/parks">National parks</a><a href="/privacy">Privacy</a></nav>
    <p class="fine">See Amazon for product photos, prices, and availability.</p>
    <p class="fine">Lifestyle photos via <a href="https://www.pexels.com/license/">Pexels</a>: ${lifestylePhotos.map(({ name, photo }) => `<a href="${esc(photo.source)}">${esc(name)}</a>`).join(' · ')}</p>
    ${giftPhotoCredits.map(({ name, photo }) => `<p class="fine"><a href="${esc(photo.source)}">${esc(name)} photo</a> by ${esc(photo.credit)} · <a href="${esc(photo.licenseUrl)}">${esc(photo.license)}</a> · resized</p>`).join('\n    ')}
  </footer>
</body>
</html>
`;

await mkdir(path.join(WEB, 'gifts'), { recursive: true });
await writeFile(path.join(WEB, 'gifts', 'index.html'), giftHtml);
console.log(`wrote gifts page: ${giftSections.length} sections, ${giftSections.reduce((n, s) => n + s.items.length, 0)} items`);
