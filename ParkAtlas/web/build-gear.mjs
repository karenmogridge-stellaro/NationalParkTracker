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
      <a href="/gifts">Gift guide</a>
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
      <a class="gift-banner" href="/gifts">
        <span class="gift-banner-icon" aria-hidden="true">🎁</span>
        <span class="gift-banner-text"><strong>Ren’s Christmas Gift Guide</strong><span>Friends and coworkers keep asking for gift ideas, so I rounded up 12 I’d actually give →</span></span>
      </a>
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
      <a href="/gear">Gear</a>
      <a href="/gifts">Gift guide</a>
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
const giftPhotoCredits = giftSections.flatMap((s) => s.items.filter((item) => item.photo && item.photo.credit));
const hero = giftCatalog.hero || {};
const trust = giftCatalog.trust || {};
const interlude = giftCatalog.interlude || {};
const firstSectionId = giftSections[0]?.id || 'hiking';

// Deterministic falling snow for the hero (pure CSS; values seeded so builds are stable).
const snowflakes = Array.from({ length: 34 }, (_, i) => {
  const left = (i * 29 + 7) % 100;
  const size = 9 + ((i * 13) % 16);
  const dur = 7 + ((i * 7) % 9);
  const delay = -((i * 5) % 14);
  const op = (9 + ((i * 3) % 5)) / 14;
  const drift = 10 + ((i * 11) % 30);
  const glyph = i % 3 === 0 ? '❆' : '❄';
  return `<span class="gift-flake" style="left:${left}%;font-size:${size}px;--dur:${dur}s;animation-delay:${delay}s;opacity:${op.toFixed(2)};--drift:${drift}px">${glyph}</span>`;
}).join('');
const heroDrift = '<svg class="gift-hero-drift" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path fill="#f7f6f1" d="M0,70 C180,30 320,86 520,70 C720,54 820,16 1020,40 C1220,64 1320,84 1440,58 L1440,90 L0,90 Z"></path></svg>';

const giftCard = (s, item) => `
          <article class="gift-product">
            <a class="gift-product-link" href="${esc(amazonUrl(item))}" target="_blank" rel="sponsored noopener noreferrer" data-gift-section="${esc(s.id)}" data-gift-asin="${esc(item.asin)}" aria-label="View ${esc(item.name)} on Amazon">
              <div class="gift-media">
                ${item.photo
                  ? `<img src="${esc(item.photo.src)}" alt="${esc(item.photo.alt)}" loading="lazy" decoding="async" />`
                  : `<span class="gift-missing">${esc(item.name)}</span>`}
              </div>
              <div class="gift-cardbody">
                <h3>${esc(item.name)}</h3>
                <p>${esc(item.why)}</p>
              </div>
            </a>
          </article>`;

const giftSection = (s) => `
      <section class="gift-collect" id="${esc(s.id)}">
        <div class="gift-heading">
          <div>
            <div class="gift-over"><span class="gift-over-flake" aria-hidden="true">❄</span> ${esc(s.over || s.label)}</div>
            <h2>${esc(s.heading || s.title)}</h2>
          </div>
          ${s.blurb ? `<p>${esc(s.blurb)}</p>` : ''}
        </div>
        <div class="gift-products">
          ${s.items.map((item) => giftCard(s, item)).join('')}
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/gear.css" />
  <script src="/analytics.js"></script>
  <script src="/gift-clicks.js" defer></script>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ParkAtlas" />
  <meta property="og:title" content="${esc(giftTitle)}" />
  <meta property="og:description" content="${esc(giftDescription)}" />
  <meta property="og:url" content="${SITE}/gifts" />
  <meta property="og:image" content="${SITE}${esc(giftCatalog.heroPhoto.src)}" />
</head>
<body class="gift-site">
  <header class="gift-header">
    <div class="gift-wrap">
      <a class="gift-brand" href="/"><img src="/logo.png" alt="ParkAtlas logo" width="42" height="42" /><span>ParkAtlas</span></a>
      <nav class="gift-links" aria-label="Gift guide sections">
        ${giftSections.map((s) => `<a href="#${esc(s.id)}">${esc(s.label)}</a>`).join('\n        ')}
        <a href="/">Explore ParkAtlas ↗</a>
      </nav>
    </div>
  </header>
  <div class="gift-hero" style="--gift-hero-image:url('${esc(giftCatalog.heroPhoto.src)}')">
    <div class="gift-snowfall" aria-hidden="true">${snowflakes}</div>
    <div class="gift-wrap">
      ${hero.eyebrow ? `<p class="gift-eyebrow">🎄 ${esc(hero.eyebrow)}</p>` : ''}
      <h1>${(hero.titleLines || [giftTitle]).map(esc).join('<br/>')}</h1>
      ${hero.lede ? `<p class="gift-lede">${esc(hero.lede)}</p>` : ''}
    </div>
    ${hero.snow ? `<span class="gift-snow">${esc(hero.snow)}</span>` : ''}
    ${heroDrift}
  </div>
  <div class="gift-trust">
    <div class="gift-wrap">
      <p>${trust.strong ? `<strong>${esc(trust.strong)}</strong> · ` : ''}${esc(trust.text || '')}</p>
      <div class="gift-quick">
        ${giftSections.map((s) => `<a href="#${esc(s.id)}">The ${esc(s.label.toLowerCase())} friend</a>`).join('\n        ')}
      </div>
    </div>
  </div>
  <main>
    <div class="gift-wrap">
      ${giftSections.map(giftSection).join('\n')}
      <div class="gift-interlude">
        <div>
          <strong>🎁 ${esc(interlude.title || '')}</strong>
          ${interlude.text ? `<p>${esc(interlude.text)}</p>` : ''}
        </div>
        ${interlude.cta ? `<a href="#${esc(firstSectionId)}">${esc(interlude.cta)}</a>` : ''}
      </div>
    </div>
  </main>
  <footer class="gift-footer">
    <div class="gift-wrap gift-footer-inner">
      <div>
        <div class="gift-brand"><img src="/logo.png" alt="ParkAtlas logo" width="28" height="28" /><span>ParkAtlas</span></div>
        <p>Made for people who love the outdoors. ${esc(G.disclosure)} Product prices and availability are shown on Amazon.</p>
        ${giftPhotoCredits.map(({ photo }) => `<p><a href="${esc(photo.source)}">${esc(photo.credit)}</a> photo · <a href="${esc(photo.licenseUrl)}">${esc(photo.license)}</a> · resized</p>`).join('\n        ')}
      </div>
      <div class="gift-note">Ren’s holiday gift guide · 2026<br/>© 2026 ParkAtlas</div>
    </div>
  </footer>
</body>
</html>
`;

await mkdir(path.join(WEB, 'gifts'), { recursive: true });
await writeFile(path.join(WEB, 'gifts', 'index.html'), giftHtml);
console.log(`wrote gifts page: ${giftSections.length} sections, ${giftSections.reduce((n, s) => n + s.items.length, 0)} items`);
