#!/usr/bin/env node
/**
 * Pulls official, public-domain park content from the NPS API into web/nps-content.json so park pages
 * carry real, unique text (descriptions, weather, directions, activities, fees) instead of template filler.
 *   NPS_API_KEY=… node web/fetch-nps-content.mjs      (or put NPS_API_KEY in .env.local)
 * The JSON is committed; builds never need the key. Re-run occasionally — NPS edits copy a few times a year.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import os from 'node:os';
import { rm } from 'node:fs/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web/nps-content.json');

let key = process.env.NPS_API_KEY;
if (!key && existsSync(path.join(ROOT, '.env.local'))) {
  key = readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^NPS_API_KEY=(.+)$/m)?.[1]?.trim();
}
if (!key) {
  console.error('Missing NPS_API_KEY. Get a free key at https://www.nps.gov/subjects/developer/get-started.htm and add NPS_API_KEY=… to .env.local');
  process.exit(1);
}

// Park codes from the app's data module.
const tmp = path.join(os.tmpdir(), `parkatlas-codes-${Date.now()}.mjs`);
await build({ stdin: { contents: `export { PARKS } from './data/parksData';`, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent' });
const { PARKS } = await import(tmp);
await rm(tmp, { force: true });
const codes = PARKS.map((p) => p.npsCode).filter(Boolean);
// Sequoia and Kings Canyon are one NPS unit ("seki"); the app tracks them separately.
const ALIAS = { kica: 'seki', sequ: 'seki' };
const apiCodes = [...new Set(codes.map((c) => ALIAS[c] || c))];

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const out = { ...existing };

for (let i = 0; i < apiCodes.length; i += 20) {
  const batch = apiCodes.slice(i, i + 20);
  const url = `https://developer.nps.gov/api/v1/parks?parkCode=${batch.join(',')}&limit=50&api_key=${key}`;
  const r = await fetch(url);
  if (!r.ok) { console.error(`NPS API ${r.status}: ${await r.text()}`); process.exit(1); }
  const { data } = await r.json();
  for (const p of data) {
    const hours = p.operatingHours?.[0];
    const record = {
      fullName: clean(p.fullName),
      designation: clean(p.designation),
      description: clean(p.description),
      weatherInfo: clean(p.weatherInfo),
      directionsInfo: clean(p.directionsInfo),
      directionsUrl: p.directionsUrl || null,
      activities: (p.activities || []).map((a) => a.name).slice(0, 24),
      topics: (p.topics || []).map((t) => t.name).slice(0, 16),
      entranceFees: (p.entranceFees || []).slice(0, 5).map((f) => ({ title: clean(f.title), cost: f.cost, description: clean(f.description) })),
      entrancePasses: (p.entrancePasses || []).slice(0, 2).map((f) => ({ title: clean(f.title), cost: f.cost, description: clean(f.description) })),
      hours: hours ? { description: clean(hours.description), standard: hours.standardHours || null } : null,
      states: p.states,
      url: p.url,
      images: (p.images || []).slice(0, 3).map((im) => ({ url: im.url, title: clean(im.title), credit: clean(im.credit), altText: clean(im.altText) })),
      fetchedAt: new Date().toISOString().slice(0, 10),
    };
    for (const appCode of codes.filter((c) => (ALIAS[c] || c) === p.parkCode)) out[appCode] = record;
  }
  process.stdout.write(`\rfetched ${Math.min(i + 20, apiCodes.length)}/${apiCodes.length}`);
}
console.log();
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const missing = codes.filter((c) => !out[c]);
console.log(`wrote ${Object.keys(out).length} parks → ${OUT}${missing.length ? `\nmissing: ${missing.join(', ')}` : ''}`);
