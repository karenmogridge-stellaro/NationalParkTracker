#!/usr/bin/env node
/**
 * Builds parkatlas.io/gear from web/gear.json. Run: node web/build-gear.mjs
 * Every product link gets the Amazon Associates tag from gear.json (asin > url > search).
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
    if (!u.searchParams.has('tag')) u.searchParams.set('tag', G.tag);
    return u.toString();
  }
  if (item.asin) return `https://www.amazon.com/dp/${item.asin}?tag=${encodeURIComponent(G.tag)}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(item.search || item.name)}&tag=${encodeURIComponent(G.tag)}`;
}

const sections = G.sections.filter((s) => s.enabled !== false).map((s) => ({ ...s, items: (s.items || []).filter((i) => i.enabled !== false) })).filter((s) => s.items.length);

const card = (item) => `
        <article class="gear-card${item.pick ? ' is-pick' : ''}">
          ${item.image ? `<img class="gear-img" src="${esc(item.image)}" alt="" loading="lazy" />` : ''}
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
    <nav>
      <a href="/parks">National parks</a>
      <a href="/gear" aria-current="page">Gear</a>
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
