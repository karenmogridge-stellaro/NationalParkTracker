#!/usr/bin/env node
/**
 * Fills `asin` and `image` for every gear.json item that has an Amazon `url` but no image yet.
 * Resolves amzn.to short links → ASIN, then reads the main product image from the product page.
 * Run:  node web/fetch-gear-images.mjs            (only items missing an image)
 *       node web/fetch-gear-images.mjs --refresh  (all items)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('./gear.json', import.meta.url);
const refresh = process.argv.includes('--refresh');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveAsin(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } });
  const m = r.url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/);
  return m ? m[1] : null;
}

async function fetchProduct(asin) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://www.amazon.com/dp/${asin}`, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
    const html = await r.text();
    const image = html.match(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/)?.[1]
      || html.match(/id="landingImage"[^>]*\ssrc="([^"]+)"/)?.[1]
      || html.match(/"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/)?.[1];
    const title = html.match(/id="productTitle"[^>]*>\s*([^<]+?)\s*</)?.[1]?.replace(/\s+/g, ' ');
    if (image) return { image: image.replace(/\._AC_SL\d+_\./, '._AC_SL800_.'), title };
    await sleep(1500 * (attempt + 1));
  }
  return { image: null, title: null };
}

const G = JSON.parse(readFileSync(FILE, 'utf8'));
let changed = 0;
for (const s of G.sections) {
  for (const item of s.items || []) {
    if (!item.url || !/amazon\.com|amzn\.to/.test(item.url)) continue;
    if (item.image && !refresh) continue;
    const asin = item.asin || (await resolveAsin(item.url));
    if (!asin) { console.log(`✗ ${item.name}: could not resolve ASIN`); continue; }
    const { image, title } = await fetchProduct(asin);
    if (!image) { console.log(`✗ ${item.name} (${asin}): no image found`); continue; }
    item.asin = asin;
    item.image = image;
    changed++;
    console.log(`✔ ${item.name} (${asin})${title ? ` — "${title.slice(0, 70)}"` : ''}`);
    await sleep(800);
  }
}
if (changed) writeFileSync(FILE, JSON.stringify(G, null, 2) + '\n');
console.log(`${changed} item(s) updated`);
