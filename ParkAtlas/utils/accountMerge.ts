import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function migrateParkVisits(oldUserId: string, newUserId: string): Promise<void> {
  const snapshot = await getDocs(query(collection(db, 'park_visits'), where('userId', '==', oldUserId)));

  for (const snap of snapshot.docs) {
    const data = snap.data() as Record<string, unknown>;
    const visitId = readString(data.visitId) || snap.id.split('__').slice(1).join('__') || snap.id;
    const newDocId = `${newUserId}__${visitId}`;

    await setDoc(
      doc(db, 'park_visits', newDocId),
      {
        ...data,
        visitId,
        userId: newUserId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (snap.id !== newDocId) {
      await deleteDoc(snap.ref);
    }
  }
}

async function migrateFriendships(oldUserId: string, newUserId: string): Promise<void> {
  const snapshots = await Promise.all([
    getDocs(query(collection(db, 'friendships'), where('userAId', '==', oldUserId))),
    getDocs(query(collection(db, 'friendships'), where('userBId', '==', oldUserId))),
  ]);

  for (const snapshot of snapshots) {
    for (const snap of snapshot.docs) {
      const data = snap.data() as Record<string, unknown>;
      const userAId = readString(data.userAId) === oldUserId ? newUserId : readString(data.userAId) || newUserId;
      const userBId = readString(data.userBId) === oldUserId ? newUserId : readString(data.userBId) || newUserId;
      const [sortedA, sortedB] = [userAId, userBId].sort();
      const newDocId = `${sortedA}__${sortedB}`;

      await setDoc(
        doc(db, 'friendships', newDocId),
        {
          ...data,
          userAId: sortedA,
          userBId: sortedB,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (snap.id !== newDocId) {
        await deleteDoc(snap.ref);
      }
    }
  }
}

async function migrateFriendRequests(oldUserId: string, newUserId: string): Promise<void> {
  const snapshots = await Promise.all([
    getDocs(query(collection(db, 'friend_requests'), where('fromUserId', '==', oldUserId))),
    getDocs(query(collection(db, 'friend_requests'), where('toUserId', '==', oldUserId))),
  ]);

  for (const snapshot of snapshots) {
    for (const snap of snapshot.docs) {
      const data = snap.data() as Record<string, unknown>;
      const fromUserId = readString(data.fromUserId) === oldUserId ? newUserId : readString(data.fromUserId) || newUserId;
      const toUserId = readString(data.toUserId) === oldUserId ? newUserId : readString(data.toUserId) || newUserId;
      const newDocId = `${fromUserId}__${toUserId}`;

      await setDoc(
        doc(db, 'friend_requests', newDocId),
        {
          ...data,
          fromUserId,
          toUserId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (snap.id !== newDocId) {
        await deleteDoc(snap.ref);
      }
    }
  }
}

async function migrateKudos(oldUserId: string, newUserId: string): Promise<void> {
  const snapshots = await Promise.all([
    getDocs(query(collection(db, 'kudos'), where('fromUid', '==', oldUserId))),
    getDocs(query(collection(db, 'kudos'), where('toUid', '==', oldUserId))),
  ]);

  for (const snapshot of snapshots) {
    for (const snap of snapshot.docs) {
      const data = snap.data() as Record<string, unknown>;
      const fromUid = readString(data.fromUid) === oldUserId ? newUserId : readString(data.fromUid) || newUserId;
      const toUid = readString(data.toUid) === oldUserId ? newUserId : readString(data.toUid) || newUserId;

      await setDoc(
        snap.ref,
        {
          ...data,
          fromUid,
          toUid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
}

async function migrateActivity(oldUserId: string, newUserId: string): Promise<void> {
  const snapshots = await Promise.all([
    getDocs(query(collection(db, 'activity'), where('fromUid', '==', oldUserId))),
    getDocs(query(collection(db, 'activity'), where('toUid', '==', oldUserId))),
  ]);

  for (const snapshot of snapshots) {
    for (const snap of snapshot.docs) {
      const data = snap.data() as Record<string, unknown>;
      const fromUid = readString(data.fromUid) === oldUserId ? newUserId : readString(data.fromUid) || newUserId;
      const toUid = readString(data.toUid) === oldUserId ? newUserId : readString(data.toUid) || newUserId;

      await setDoc(
        snap.ref,
        {
          ...data,
          fromUid,
          toUid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
}

async function migrateInvites(oldUserId: string, newUserId: string): Promise<void> {
  const snapshot = await getDocs(query(collection(db, 'invites'), where('inviterUserId', '==', oldUserId)));

  for (const snap of snapshot.docs) {
    const data = snap.data() as Record<string, unknown>;

    await setDoc(
      snap.ref,
      {
        ...data,
        inviterUserId: newUserId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function migrateUserDoc(oldUserId: string, newUserId: string, normalizedEmail: string): Promise<void> {
  const snap = await getDoc(doc(db, 'users', oldUserId));
  if (!snap.exists()) return;

  const data = snap.data() as Record<string, unknown>;
  await setDoc(
    doc(db, 'users', newUserId),
    {
      ...data,
      id: newUserId,
      email: normalizedEmail,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (oldUserId !== newUserId) {
    await deleteDoc(snap.ref);
  }
}

async function migrateEmailAuth(normalizedEmail: string, newUserId: string): Promise<void> {
  // Credentials stay valid; they just resolve to the canonical id so a later
  // password sign-in lands on the same account as the social sign-in.
  for (const docId of [encodeURIComponent(normalizedEmail), normalizedEmail]) {
    const snap = await getDoc(doc(db, 'email_auth', docId));
    if (!snap.exists()) continue;
    if ((snap.data() as { userId?: string }).userId === newUserId) continue;
    await setDoc(snap.ref, { userId: newUserId, updatedAt: serverTimestamp() }, { merge: true });
  }
}

export async function mergeDuplicateAccountsForEmail(email: string, canonicalUserId: string): Promise<{ mergedAliasIds: string[] }> {
  const normalizedEmail = normalizeEmail(email);
  const userSnapshot = await getDocs(
    query(collection(db, 'users'), where('email', '==', normalizedEmail))
  );

  const aliasDocs = userSnapshot.docs.filter((snap) => snap.id !== canonicalUserId);
  const mergedAliasIds: string[] = [];

  await migrateUserDoc(canonicalUserId, canonicalUserId, normalizedEmail);

  for (const aliasDoc of aliasDocs) {
    const aliasId = aliasDoc.id;
    const aliasData = aliasDoc.data() as Record<string, unknown>;
    const isSocialAlias =
      aliasData.provider === 'apple' || aliasId.startsWith('apple_') ||
      aliasData.provider === 'google' || aliasId.startsWith('google_');
    if (isSocialAlias) {
      // Social identities are their own canonical account and must never
      // be merged away, even if they happen to share an email with another record.
      continue;
    }
    mergedAliasIds.push(aliasId);

    await migrateParkVisits(aliasId, canonicalUserId);
    await migrateFriendships(aliasId, canonicalUserId);
    await migrateFriendRequests(aliasId, canonicalUserId);
    await migrateKudos(aliasId, canonicalUserId);
    await migrateActivity(aliasId, canonicalUserId);
    await migrateInvites(aliasId, canonicalUserId);
    await migrateUserDoc(aliasId, canonicalUserId, normalizedEmail);
  }

  if (mergedAliasIds.length > 0) {
    await migrateEmailAuth(normalizedEmail, canonicalUserId);
  }

  return { mergedAliasIds };
}