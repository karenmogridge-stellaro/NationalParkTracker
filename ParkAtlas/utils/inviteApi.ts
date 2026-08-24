import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';

export type InviteStatus = 'pending' | 'accepted';

export type InviteRecord = {
  inviteCode: string;
  inviterUserId: string;
  inviterName: string;
  contactValue: string;
  status: InviteStatus;
  createdAt: number;
  acceptedAt?: number;
  acceptedByUserId?: string;
};

function normalizeContactValue(value: string): string {
  const trimmed = value.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (isEmail) {
    return trimmed.toLowerCase();
  }
  return trimmed.replace(/\D+/g, '');
}

export async function createInvite(input: {
  inviteCode: string;
  inviterUserId: string;
  inviterName: string;
  contactValue: string;
}): Promise<InviteRecord> {
  const normalizedContactValue = normalizeContactValue(input.contactValue);
  const invite: InviteRecord = {
    inviteCode: input.inviteCode,
    inviterUserId: input.inviterUserId,
    inviterName: input.inviterName,
    contactValue: normalizedContactValue,
    status: 'pending',
    createdAt: Date.now(),
  };

  await setDoc(
    doc(db, 'invites', invite.inviteCode),
    {
      ...invite,
      createdAtServer: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return invite;
}

export async function findPendingInviteCodeForContact(contactValue: string): Promise<string | null> {
  const trimmed = contactValue.trim();
  if (!trimmed) return null;

  const normalized = normalizeContactValue(trimmed);
  const candidates = Array.from(new Set([normalized, trimmed, trimmed.toLowerCase()]));

  for (const candidate of candidates) {
    const lookup = candidate.trim();
    if (!lookup) continue;

    const q = query(
      collection(db, 'invites'),
      where('contactValue', '==', lookup),
      where('status', '==', 'pending'),
      limit(1)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as Partial<InviteRecord>;
      if (typeof data.inviteCode === 'string' && data.inviteCode.trim()) {
        return data.inviteCode;
      }
      return snap.docs[0].id;
    }
  }

  return null;
}

export async function getInviteByCode(inviteCode: string): Promise<InviteRecord | null> {
  const normalized = inviteCode.trim();
  if (!normalized) return null;

  const snap = await getDoc(doc(db, 'invites', normalized));
  if (!snap.exists()) return null;

  const data = snap.data() as Partial<InviteRecord>;
  if (!data || typeof data.inviteCode !== 'string') return null;

  return {
    inviteCode: data.inviteCode,
    inviterUserId: typeof data.inviterUserId === 'string' ? data.inviterUserId : '',
    inviterName: typeof data.inviterName === 'string' ? data.inviterName : 'A friend',
    contactValue: typeof data.contactValue === 'string' ? data.contactValue : '',
    status: data.status === 'accepted' ? 'accepted' : 'pending',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    ...(typeof data.acceptedAt === 'number' ? { acceptedAt: data.acceptedAt } : {}),
    ...(typeof data.acceptedByUserId === 'string' ? { acceptedByUserId: data.acceptedByUserId } : {}),
  };
}

export class InviteAlreadyAcceptedError extends Error {
  constructor() {
    super('This invite has already been accepted.');
    this.name = 'InviteAlreadyAcceptedError';
  }
}

export async function acceptInvite(inviteCode: string, acceptedByUserId: string): Promise<void> {
  // Runs as a transaction so two people accepting the same invite at nearly the same
  // moment can't both win the pending->accepted transition and each create a friendship.
  await runTransaction(db, async (transaction) => {
    const inviteRef = doc(db, 'invites', inviteCode);
    const snap = await transaction.get(inviteRef);
    const data = snap.data() as Partial<InviteRecord> | undefined;
    if (data?.status === 'accepted') {
      throw new InviteAlreadyAcceptedError();
    }

    transaction.set(
      inviteRef,
      {
        status: 'accepted',
        acceptedByUserId,
        acceptedAt: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function createFriendConnection(userAId: string, userBId: string): Promise<void> {
  const [a, b] = [userAId, userBId].sort();
  const friendshipId = `${a}__${b}`;

  await setDoc(
    doc(db, 'friendships', friendshipId),
    {
      userAId: a,
      userBId: b,
      status: 'active',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
