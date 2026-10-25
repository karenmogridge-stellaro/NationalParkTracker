#!/usr/bin/env node
/**
 * Counts how many distinct ParkAtlas users have logged each national park (from synced park_visits)
 * and writes web/park-stats.json for build-parks.mjs to bake into the site.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=~/secrets/parkatlas-sa.json node web/fetch-park-stats.mjs
 * Pages still build without this file; counts simply don't render.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON (kept outside the repo).');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const usersByPark = new Map();
const allUsers = new Set();
let visits = 0;
// Only the two fields needed; keeps the read cheap and avoids pulling photos/trail text.
const snap = await db.collection('park_visits').select('userId', 'parkId').get();
for (const doc of snap.docs) {
  const { userId, parkId } = doc.data();
  if (!userId || !parkId) continue;
  visits += 1;
  allUsers.add(userId);
  if (!usersByPark.has(parkId)) usersByPark.set(parkId, new Set());
  usersByPark.get(parkId).add(userId);
}

const parks = Object.fromEntries([...usersByPark].map(([id, users]) => [id, users.size]));
const out = { generatedAt: new Date().toISOString(), totalUsers: allUsers.size, totalVisits: visits, parks };
const WEB = path.dirname(fileURLToPath(import.meta.url));
await writeFile(path.join(WEB, 'park-stats.json'), JSON.stringify(out, null, 2) + '\n');
const top = [...usersByPark].map(([id, u]) => [id, u.size]).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`park-stats.json: ${allUsers.size} users, ${visits} visits, ${usersByPark.size} parks with logs; top: ${top.map(([id, n]) => `${id}=${n}`).join(' ')}`);
