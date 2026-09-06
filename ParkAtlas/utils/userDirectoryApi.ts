import type { AuthUser } from '@/hooks/useAuth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/utils/firebase';

export type DirectoryUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
};

function mapDocToDirectoryUser(id: string, data: FirestoreUserDoc): DirectoryUser {
  const name = displayNameFromDoc(data);
  const username = data.username?.trim() || normalizeEmail(data.email).split('@')[0] || id.slice(0, 8);

  return {
    id: data.id || id,
    name,
    username,
    avatarUrl: data.avatarUrl || data.avatar,
  };
}

export type FriendActivity = {
  visitId?: string;
  userId: string;
  userName: string;
  parkId: string;
  parkName: string;
  trailName?: string;
  dateVisited?: string;
  createdAt?: string;
  distanceMiles?: number;
  photoUri?: string;
};

export type ParkVisitActivityInput = {
  visitId: string;
  userId: string;
  userName: string;
  parkId: string;
  parkName: string;
  trailName?: string;
  dateVisited?: string;
  datePrecision?: 'day' | 'month' | 'year';
  distanceMiles?: number;
  photoUri?: string;
};

function isRemotePhotoUri(uri?: string): boolean {
  return !!uri && (uri.startsWith('https://') || uri.startsWith('http://'));
}

async function uploadVisitPhotoIfNeeded(input: ParkVisitActivityInput): Promise<string | null> {
  const uri = input.photoUri;
  if (!uri) return null;
  if (isRemotePhotoUri(uri)) return uri;
  if (!uri.startsWith('file://')) return uri;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    const path = `visit_photos/${input.userId}/${input.visitId}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, {
      contentType: blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
    return await getDownloadURL(storageRef);
  } catch {
    // Preserve original URI so the owner can still see an image even if upload fails.
    return uri;
  }
}

function normalizeEmail(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return (value || '').replace(/\D+/g, '');
}

type FirestoreUserDoc = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
};

function displayNameFromDoc(data: FirestoreUserDoc): string {
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  return data.name?.trim() || fullName || 'ParkAtlas User';
}

type FirestoreFriendActivityDoc = {
  visitId?: string;
  userId?: string;
  userName?: string;
  parkId?: string;
  parkName?: string;
  trailName?: string;
  dateVisited?: string;
  distanceMiles?: number;
  photoUri?: string;
  createdAt?: { toDate?: () => Date };
};

function normalizeFriendActivity(docData: FirestoreFriendActivityDoc): FriendActivity | null {
  const userId = typeof docData.userId === 'string' ? docData.userId : '';
  const parkId = typeof docData.parkId === 'string' ? docData.parkId : '';
  if (!userId || !parkId) return null;

  const createdAtIso = typeof docData.createdAt?.toDate === 'function'
    ? docData.createdAt.toDate()?.toISOString()
    : undefined;
  const dateVisited =
    (typeof docData.dateVisited === 'string' && docData.dateVisited) ||
    createdAtIso;

  return {
    visitId: typeof docData.visitId === 'string' ? docData.visitId : undefined,
    userId,
    userName: (typeof docData.userName === 'string' && docData.userName.trim()) || 'ParkAtlas User',
    parkId,
    parkName: (typeof docData.parkName === 'string' && docData.parkName.trim()) || 'Park',
    trailName: typeof docData.trailName === 'string' ? docData.trailName : undefined,
    dateVisited,
    createdAt: createdAtIso,
    distanceMiles: typeof docData.distanceMiles === 'number' ? docData.distanceMiles : undefined,
    photoUri: typeof docData.photoUri === 'string' ? docData.photoUri : undefined,
  };
}

export function isDirectoryApiConfigured(): boolean {
  return true;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Matches a device contact list (phones/emails) against registered users, instead of
 * pulling every user in the app — this is how the Friends tab finds "people you know". */
export async function matchContactsToUsers(input: {
  phones: string[];
  emails: string[];
  excludeUserId?: string;
}): Promise<DirectoryUser[]> {
  const phones = Array.from(new Set(input.phones.map(normalizePhone).filter(Boolean)));
  const emails = Array.from(new Set(input.emails.map(normalizeEmail).filter(Boolean)));
  if (phones.length === 0 && emails.length === 0) return [];

  try {
    const snapshots = await Promise.all([
      ...chunk(phones, 10).map((c) => getDocs(query(collection(db, 'users'), where('phone', 'in', c)))),
      ...chunk(emails, 10).map((c) => getDocs(query(collection(db, 'users'), where('email', 'in', c)))),
    ]);

    const unique = new Map<string, DirectoryUser>();
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((snap) => {
        if (snap.id === input.excludeUserId) return;
        unique.set(snap.id, mapDocToDirectoryUser(snap.id, snap.data() as FirestoreUserDoc));
      });
    });
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

/** Explicit, typed search for a specific person by username — the alternative to
 * browsing everyone: only returns matches for what the user actually typed. */
export async function searchDirectoryUsersByUsername(input: {
  text: string;
  excludeUserId?: string;
  limit?: number;
}): Promise<DirectoryUser[]> {
  const prefix = input.text.trim().toLowerCase();
  if (!prefix) return [];

  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'users'),
        where('username', '>=', prefix),
        where('username', '<=', prefix + ''),
        limit(input.limit ?? 8)
      )
    );

    return snapshot.docs
      .map((snap) => mapDocToDirectoryUser(snap.id, snap.data() as FirestoreUserDoc))
      .filter((user) => user.id !== input.excludeUserId);
  } catch {
    return [];
  }
}

export type StoredUserProfile = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  provider?: string;
};

const PLACEHOLDER_NAMES = new Set(['explorer', 'parkatlas user', 'friend', 'user']);

/** True when a name is empty or one of the generic fallbacks the app synthesizes. */
export function isPlaceholderName(name?: string | null): boolean {
  const trimmed = (name || '').trim().toLowerCase();
  return !trimmed || PLACEHOLDER_NAMES.has(trimmed);
}

/** Apple "Hide My Email" relays aren't useful for usernames or contact matching. */
export function isPrivateRelayEmail(email?: string | null): boolean {
  return /@privaterelay\.appleid\.com$/i.test((email || '').trim());
}

/** Reads the canonical profile record for a user id; null when missing or unreachable. */
export async function fetchUserProfile(userId: string): Promise<StoredUserProfile | null> {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    const data = snap.data() as FirestoreUserDoc & { provider?: string };
    const first = data.first_name?.trim() || undefined;
    const last = data.last_name?.trim() || undefined;
    const name = data.name?.trim() || [first, last].filter(Boolean).join(' ') || undefined;
    return {
      id: data.id || snap.id,
      name: isPlaceholderName(name) ? undefined : name,
      firstName: isPlaceholderName(first) ? undefined : first,
      lastName: last,
      username: data.username?.trim() || undefined,
      email: normalizeEmail(data.email) || undefined,
      phone: normalizePhone(data.phone) || undefined,
      avatarUrl: data.avatarUrl || data.avatar || undefined,
      provider: data.provider,
    };
  } catch {
    return null;
  }
}

function usernameFor(user: AuthUser, existing?: string): string {
  if (existing) return existing;
  const email = normalizeEmail(user.email);
  if (email && !isPrivateRelayEmail(email)) return email.split('@')[0];
  const fromName = isPlaceholderName(user.name) ? '' : user.name.replace(/\s+/g, '').toLowerCase();
  if (fromName) return fromName;
  // Unique-ish fallback so anonymous Apple users don't all collide on "explorer".
  return `explorer-${user.id.replace(/^(apple|google|email)_/, '').slice(0, 6).toLowerCase()}`;
}

/**
 * Syncs the local AuthUser to the `users` collection. Never downgrades a real
 * profile: placeholder names, missing emails, and derived usernames are only
 * written when the stored record has nothing better.
 */
export async function upsertProductionUserProfile(user: AuthUser): Promise<void> {
  if (!user?.id) return;

  const existing = await fetchUserProfile(user.id);

  const fallbackNameParts = user.name.trim().split(/\s+/).filter(Boolean);
  const incomingFirst = (user.firstName || fallbackNameParts[0] || '').trim();
  const incomingLast = (user.lastName || fallbackNameParts.slice(1).join(' ') || '').trim();
  const incomingName = user.name.trim();
  const incomingEmail = normalizeEmail(user.email);

  const hasRealIncomingName = !isPlaceholderName(incomingName);
  const name = hasRealIncomingName ? incomingName : existing?.name || incomingName;
  const firstName = hasRealIncomingName ? incomingFirst : existing?.firstName || incomingFirst;
  const lastName = hasRealIncomingName ? incomingLast : existing?.lastName || incomingLast;
  const email = incomingEmail || existing?.email || null;
  const username = usernameFor({ ...user, name, email: email || '' }, existing?.username);

  const payload = {
    id: user.id,
    name,
    first_name: firstName,
    last_name: lastName,
    username,
    email,
    phone: normalizePhone(user.phone) || existing?.phone || null,
    avatarUrl: user.avatarUrl || existing?.avatarUrl || null,
    provider: user.provider,
  };

  try {
    await setDoc(
      doc(db, 'users', user.id),
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Non-blocking: profile sync failure should not block auth flows.
  }
}

export async function matchRegisteredUsersByContacts(input: {
  phones: string[];
  emails: string[];
  limit?: number;
}): Promise<DirectoryUser[]> {
  const phones = Array.from(new Set(input.phones.map(normalizePhone).filter(Boolean)));
  const emails = Array.from(new Set(input.emails.map(normalizeEmail).filter(Boolean)));
  if (phones.length === 0 && emails.length === 0) return [];

  try {
    const max = Math.max(1, Math.min(input.limit ?? 200, 1000));
    const snapshot = await getDocs(query(collection(db, 'users'), limit(max)));
    const matches = snapshot.docs
      .map((snap) => {
        const data = snap.data() as FirestoreUserDoc;
        const normalizedEmail = normalizeEmail(data.email);
        const normalizedPhone = normalizePhone(data.phone);
        const emailMatched = normalizedEmail.length > 0 && emails.includes(normalizedEmail);
        const phoneMatched = normalizedPhone.length > 0 && phones.includes(normalizedPhone);

        if (!emailMatched && !phoneMatched) return null;

        return mapDocToDirectoryUser(snap.id, data);
      })
      .filter((item): item is DirectoryUser => !!item);

    const unique = new Map<string, DirectoryUser>();
    matches.forEach((item) => unique.set(item.id, item));
    return Array.from(unique.values()).slice(0, input.limit ?? 200);
  } catch {
    return [];
  }
}

export async function fetchFriendActivities(friendIds: string[]): Promise<FriendActivity[]> {
  if (friendIds.length === 0) return [];

  try {
    const uniqueFriendIds = Array.from(new Set(friendIds.filter(Boolean)));
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueFriendIds.length; i += 10) {
      chunks.push(uniqueFriendIds.slice(i, i + 10));
    }

    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            collection(db, 'park_visits'),
            where('userId', 'in', chunk),
            limit(100)
          )
        )
      )
    );

    return snapshots
      .flatMap((snapshot) =>
        snapshot.docs
          .map((snap) => normalizeFriendActivity(snap.data() as FirestoreFriendActivityDoc))
          .filter((activity): activity is FriendActivity => !!activity)
      )
      .sort((a, b) => {
        const aTime = new Date(a.dateVisited || '1970-01-01').getTime();
        const bTime = new Date(b.dateVisited || '1970-01-01').getTime();
        return bTime - aTime;
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

export async function upsertParkVisitActivity(input: ParkVisitActivityInput): Promise<void> {
  if (!input.userId || !input.visitId || !input.parkId) return;

  const resolvedPhotoUri = await uploadVisitPhotoIfNeeded(input);
  const docId = `${input.userId}__${input.visitId}`;
  const docRef = doc(db, 'park_visits', docId);
  const existingSnap = await getDoc(docRef);
  const isNewVisit = !existingSnap.exists();

  await setDoc(
    docRef,
    {
      visitId: input.visitId,
      userId: input.userId,
      userName: input.userName,
      parkId: input.parkId,
      parkName: input.parkName,
      trailName: input.trailName || null,
      dateVisited: input.dateVisited || null,
      datePrecision: input.datePrecision && input.datePrecision !== 'day' ? input.datePrecision : null,
      distanceMiles: typeof input.distanceMiles === 'number' ? input.distanceMiles : null,
      photoUri: resolvedPhotoUri || null,
      updatedAt: serverTimestamp(),
      ...(isNewVisit ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );

  // Only notify friends when a visit is first logged, not on every edit.
  if (!isNewVisit) return;

  // Best-effort fan-out for social inbox; this should never block visit persistence.
  void (async () => {
    try {
      const [asUserA, asUserB] = await Promise.all([
        getDocs(
          query(
            collection(db, 'friendships'),
            where('userAId', '==', input.userId),
            where('status', '==', 'active'),
            limit(250)
          )
        ),
        getDocs(
          query(
            collection(db, 'friendships'),
            where('userBId', '==', input.userId),
            where('status', '==', 'active'),
            limit(250)
          )
        ),
      ]);

      const recipientIds = new Set<string>();
      asUserA.docs.forEach((snap) => {
        const id = snap.data()?.userBId;
        if (typeof id === 'string' && id && id !== input.userId) recipientIds.add(id);
      });
      asUserB.docs.forEach((snap) => {
        const id = snap.data()?.userAId;
        if (typeof id === 'string' && id && id !== input.userId) recipientIds.add(id);
      });

      await Promise.all(
        Array.from(recipientIds).map((toUid) =>
          addDoc(collection(db, 'activity'), {
            toUid,
            type: 'friend_logged',
            fromUid: input.userId,
            eventId: input.visitId,
            parkId: input.parkId,
            parkName: input.parkName,
            createdAt: serverTimestamp(),
          })
        )
      );
    } catch {
      // Ignore social fan-out failures to keep core visit write reliable.
    }
  })();
}

export async function deleteParkVisitActivity(userId: string, visitId: string): Promise<void> {
  if (!userId || !visitId) return;
  await deleteDoc(doc(db, 'park_visits', `${userId}__${visitId}`));
}
