#!/usr/bin/env node
/**
 * Builds a Firebase CLI `auth:import` file from the legacy `users` + `email_auth` collections.
 *
 * Every legacy account keeps its Firestore id as the Firebase UID, so park_visits / friendships /
 * kudos / activity / invites need no migration. Apple/Google ids are linked as providers so the
 * user's next native sign-in resolves to the same UID. Email users carry their SHA256(salt+password)
 * hash across; Firebase re-hashes with scrypt on first sign-in.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/secrets/parkatlas-sa.json node scripts/export-auth-users.mjs
 *   npx firebase-tools auth:import scripts/out/auth-import.json \
 *     --project parkatlas-e1816 --hash-algo=SHA256 --rounds=1 --hash-input-order=SALT_FIRST
 *
 * Re-running the import overwrites users with the same UID, so it is safe to iterate.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON (keep it outside the repo).');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const usersSnap = await db.collection('users').get();
const emailAuthSnap = await db.collection('email_auth').get();

/** @type {Map<string, {passwordHash: string, salt: string, userId?: string, email: string}>} */
const credsByEmail = new Map();
for (const d of emailAuthSnap.docs) {
  const data = d.data();
  const email = String(data.email || decodeURIComponent(d.id)).trim().toLowerCase();
  const passwordHash = data.passwordHash || data.password_hash;
  if (!email || !passwordHash || !data.salt) continue;
  // Encoded and raw doc ids are dual-written copies; either is fine.
  credsByEmail.set(email, { passwordHash, salt: data.salt, userId: data.userId, email });
}

const providerFor = (uid) => (uid.startsWith('apple_') ? 'apple' : uid.startsWith('google_') ? 'google' : uid.startsWith('email_') ? 'email' : null);

/** @type {Map<string, any>} uid → import record */
const records = new Map();
const warnings = [];

for (const d of usersSnap.docs) {
  const uid = d.id;
  const data = d.data();
  const provider = providerFor(uid);
  if (!provider) { warnings.push(`skip ${uid}: unrecognised id shape`); continue; }
  if (uid.includes('__')) { warnings.push(`skip ${uid}: '__' is reserved for composite doc ids`); continue; }

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined;
  const photoUrl = typeof data.avatarUrl === 'string' && /^https?:/.test(data.avatarUrl) ? data.avatarUrl : undefined;

  const rec = { localId: uid, ...(email ? { email, emailVerified: provider !== 'email' } : {}), ...(name ? { displayName: name } : {}), ...(photoUrl ? { photoUrl } : {}), providerUserInfo: [] };
  if (provider === 'apple') rec.providerUserInfo.push({ providerId: 'apple.com', rawId: uid.slice('apple_'.length), ...(email ? { email } : {}) });
  if (provider === 'google') rec.providerUserInfo.push({ providerId: 'google.com', rawId: uid.slice('google_'.length), ...(email ? { email } : {}), ...(name ? { displayName: name } : {}), ...(photoUrl ? { photoUrl } : {}) });
  records.set(uid, rec);
}

// Attach password hashes. email_auth.userId may point at a social uid after an old merge.
for (const [email, creds] of credsByEmail) {
  const target = (creds.userId && records.get(creds.userId)) || records.get(`email_${email}`);
  if (!target) { warnings.push(`no users doc for credentials of ${email}; skipping password`); continue; }
  target.passwordHash = Buffer.from(creds.passwordHash, 'hex').toString('base64');
  // The app hashed SHA256(saltHexString + password): the salt bytes Firebase must prepend are the hex text itself.
  target.salt = Buffer.from(creds.salt, 'utf8').toString('base64');
  if (!target.email) target.email = email;
}

// Firebase requires unique emails. When an email_… profile duplicates a social account's email,
// the social account wins and inherits the password (that matches the old merge direction).
const byEmail = new Map();
for (const rec of records.values()) {
  if (!rec.email) continue;
  const list = byEmail.get(rec.email) || [];
  list.push(rec);
  byEmail.set(rec.email, list);
}
for (const [email, list] of byEmail) {
  if (list.length < 2) continue;
  const social = list.find((r) => !r.localId.startsWith('email_'));
  if (!social) { warnings.push(`duplicate email ${email} across ${list.map((r) => r.localId).join(', ')} — keeping first, dropping email from others`); list.slice(1).forEach((r) => delete r.email); continue; }
  for (const r of list) {
    if (r === social) continue;
    if (r.passwordHash && !social.passwordHash) { social.passwordHash = r.passwordHash; social.salt = r.salt; }
    records.delete(r.localId);
    warnings.push(`dropped ${r.localId} (email owned by ${social.localId}); verify its visits were merged`);
  }
}

const out = { users: Array.from(records.values()) };
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'auth-import.json');
writeFileSync(outFile, JSON.stringify(out, null, 2));

const counts = { apple: 0, google: 0, email: 0, withPassword: 0 };
for (const r of out.users) { counts[providerFor(r.localId)]++; if (r.passwordHash) counts.withPassword++; }
console.log(`Wrote ${out.users.length} users → ${outFile}`);
console.log(counts);
if (warnings.length) { console.log('\nWarnings:'); warnings.forEach((w) => console.log(' -', w)); }
console.log(`\nNext:\n  npx firebase-tools auth:import ${outFile} --project parkatlas-e1816 --hash-algo=SHA256 --rounds=1 --hash-input-order=SALT_FIRST`);
