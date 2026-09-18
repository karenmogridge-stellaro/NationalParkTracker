#!/usr/bin/env node
/**
 * Regenerates data/stateParksData.ts from USGS PAD-US (public domain, no key).
 *   node scripts/fetch-state-parks.mjs
 *
 * Source: PAD-US 4.x fee units with designation type SP (State Park), via the USGS ArcGIS feature service.
 * Cleanup: keeps units whose names read like parks people visit (State Park / Recreation Area / Beach /
 * Reserve / Natural Area / Forest / Historic Park/Site), drops closed-to-public units, merges parcels of the
 * same park (e.g. "Bear Lake State Park (Cisco Beach)") into one entry with an acreage-weighted centroid.
 * Existing ids from the hand-curated list are preserved by name+state so logged visits keep resolving.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data/stateParksData.ts');
const QUERY = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Manager_Type_PADUS/FeatureServer/0/query';

const KEEP = /\b(State (Park|Recreation Area|Beach|Reserve|Reservation|Natural Area|Forest|Historic(al)? (Park|Site|Area)|Preserve|Wilderness( Park)?|Scenic (Area|Corridor|Viewpoint)|Resort Park|Wayside|Nature Preserve|Game Refuge))\b/i;
const DROP = /\b(Capitol|Fair ?grounds?|Fair Park|Hospital|Prison|Correctional|Armory|Cemetery|Office|Headquarters|Nursery|Hatchery|Shooting Range|Wildlife Management Area|WMA|Game Land|Fishing Access|Boat (Ramp|Launch)|Golf|Airport|University|School|Right[- ]of[- ]Way|Easement|Trailhead)\b/i;
const STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));

const NAME_WHERE = ['State Park', 'State Recreation Area', 'State Natural Area', 'State Beach', 'State Reserve', 'State Reservation', 'State Historic', 'State Forest', 'State Preserve', 'State Resort Park', 'State Scenic', 'State Wilderness']
  .map((s) => `Unit_Nm LIKE '%${s}%'`).join(' OR ');

async function fetchAll() {
  const features = [];
  for (let offset = 0; ; offset += 1000) {
    const body = new URLSearchParams({
      // Des_Tp is inconsistent across states (Starved Rock is SCA, Silver Falls is LP), so match names too.
      where: `FeatClass='Fee' AND (Des_Tp='SP' OR ${NAME_WHERE})`,
      outFields: 'OBJECTID,Unit_Nm,State_Nm,GIS_Acres,Pub_Access,Des_Tp,Mang_Type',
      returnGeometry: 'false',
      returnCentroid: 'true',
      outSR: '4326',
      orderByFields: 'OBJECTID',
      resultOffset: String(offset),
      resultRecordCount: '1000',
      f: 'json',
    });
    const r = await fetch(QUERY, { method: 'POST', body });
    const j = await r.json();
    if (j.error) throw new Error(JSON.stringify(j.error));
    features.push(...(j.features || []));
    process.stdout.write(`\rfetched ${features.length}`);
    if (!j.exceededTransferLimit && (j.features || []).length < 1000) break;
  }
  console.log();
  await fillMissingCentroids(features);
  return features;
}

// The server skips centroids for some multipart units; fall back to the bbox center of generalized geometry.
async function fillMissingCentroids(features) {
  const missing = features.filter((f) => !f.centroid);
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const body = new URLSearchParams({
      objectIds: batch.map((f) => f.attributes.OBJECTID).join(','),
      outFields: 'OBJECTID',
      returnGeometry: 'true',
      maxAllowableOffset: '0.02',
      outSR: '4326',
      f: 'json',
    });
    const r = await fetch(QUERY, { method: 'POST', body });
    const j = await r.json();
    for (const g of j.features || []) {
      const pts = (g.geometry?.rings || []).flat();
      if (!pts.length) continue;
      const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
      const target = batch.find((f) => f.attributes.OBJECTID === g.attributes.OBJECTID);
      if (target) target.centroid = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    }
    process.stdout.write(`\rcentroids recovered ${Math.min(i + 50, missing.length)}/${missing.length}`);
  }
  if (missing.length) console.log();
}

const baseName = (n) => n.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+-\s+.*$/, '').replace(/\s+/g, ' ').trim();
const norm = (n) => baseName(n).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(the|of|and)\b/g, '').replace(/\s+/g, ' ').trim();
const slug = (n) => norm(n).replace(/\s+/g, '_').slice(0, 48);

// Preserve ids (and full rows) from the current file so park_visits.parkId keeps resolving.
const existing = new Map();
const legacyRows = new Map();
try {
  const src = readFileSync(OUT, 'utf8');
  for (const m of src.matchAll(/\{ id:\s*'([^']+)',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*state:\s*'([A-Z]{2})',\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+),\s*radiusKm:\s*([\d.]+)/g)) {
    const name = m[2].replace(/\\'/g, "'");
    existing.set(`${m[3]}|${norm(name)}`, m[1]);
    legacyRows.set(m[1], { id: m[1], name, state: m[3], lat: +m[4], lng: +m[5], radiusKm: +m[6], acres: 0 });
  }
} catch { /* first run */ }

// States like WA name units without a suffix ("Palouse Falls"); PAD-US still designates them SP.
const HAS_SUFFIX = /\b(Park|Preserve|Reserve|Reservation|Natural Area|Beach|Forest|Recreation Area|Heritage|Historic|Monument|Wilderness|Scenic|Wayside|Refuge|Trail|Lake|Island)\b/i;
function displayName(name, desTp) {
  if (desTp === 'SP' && !/\bState\b/i.test(name) && !HAS_SUFFIX.test(name)) return `${baseName(name)} State Park`;
  return baseName(name);
}

const features = await fetchAll();
const groups = new Map();
let dropped = { access: 0, name: 0, state: 0 };
for (const f of features) {
  const a = f.attributes;
  const name = (a.Unit_Nm || '').trim();
  const state = (a.State_Nm || '').trim().toUpperCase();
  if (!STATES.has(state)) { dropped.state++; continue; }
  if (a.Pub_Access === 'XA') { dropped.access++; continue; }
  const isSp = a.Des_Tp === 'SP';
  // NYC playgrounds are coded SP in PAD-US; a suffix-less "SP" only counts when the state itself manages it.
  const spTrusted = isSp && (/\bState\b/i.test(name) || a.Mang_Type === 'STAT');
  if ((!spTrusted && !KEEP.test(name)) || DROP.test(name)) { dropped.name++; continue; }
  // State forests are mostly timber/management land (NY has ~800); only keep ones a state calls a park.
  if (!isSp && /\bState Forest\b/i.test(name) && !/\b(Park|Recreation Area|Campground)\b/i.test(name)) { dropped.name++; continue; }
  if (!f.centroid) continue;
  const shown = displayName(name, a.Des_Tp);
  const key = `${state}|${norm(shown)}`;
  const acres = Math.max(0, Number(a.GIS_Acres) || 0);
  const g = groups.get(key) || { name: shown, state, acres: 0, wx: 0, wy: 0, parcels: 0 };
  const w = acres || 1;
  g.acres += acres; g.wx += f.centroid.x * w; g.wy += f.centroid.y * w; g.parcels++;
  groups.set(key, g);
}

const parks = [];
const usedIds = new Set();
for (const [key, g] of groups) {
  const w = g.acres || g.parcels;
  const lat = +(g.wy / w).toFixed(4);
  const lng = +(g.wx / w).toFixed(4);
  // Visit-detection radius from area (km), padded for parking/approach, clamped to sane bounds.
  const areaKm2 = g.acres * 0.00404686;
  const radiusKm = Math.min(40, Math.max(2, Math.round((Math.sqrt(areaKm2 / Math.PI) * 1.5 + 1) * 10) / 10));
  let id = existing.get(key) || `sp_${g.state.toLowerCase()}_${slug(g.name)}`;
  while (usedIds.has(id)) id += '_';
  usedIds.add(id);
  parks.push({ id, name: g.name, state: g.state, lat, lng, radiusKm, acres: Math.round(g.acres) });
}
// Legacy entries PAD-US didn't match: keep them so old visits still resolve to a park.
let carried = 0;
for (const [id, row] of legacyRows) {
  if (usedIds.has(id)) continue;
  usedIds.add(id); parks.push(row); carried++;
}
parks.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

const preserved = parks.filter((p) => [...existing.values()].includes(p.id)).length;
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const lines = parks.map((p) => `  { id: '${p.id}', name: '${esc(p.name)}', state: '${p.state}', lat: ${p.lat}, lng: ${p.lng}, radiusKm: ${p.radiusKm}, npsCode: '', type: 'state' },`);
const out = `import { StatePark } from './parksData';

/**
 * US state parks — GENERATED by scripts/fetch-state-parks.mjs from USGS PAD-US (public domain).
 * ${parks.length} parks across ${new Set(parks.map((p) => p.state)).size} states/DC. Do not hand-edit; re-run the script.
 * IDs are stable: legacy hand-curated ids are preserved, new ones are sp_<state>_<slug>.
 */
export const STATE_PARKS: StatePark[] = [
${lines.join('\n')}
];
`;
writeFileSync(OUT, out);
console.log(`wrote ${parks.length} parks (${preserved}/${existing.size} legacy ids matched, ${carried} carried forward unmatched; dropped ${dropped.name} by name, ${dropped.access} closed, ${dropped.state} non-state) → ${OUT}`);
