import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';

export type AccountIdentityKind = 'email_password' | 'apple_linked' | 'profile_only' | 'none';

export type AccountIdentity = {
  kind: AccountIdentityKind;
  userId?: string;
  email: string;
  hasEmailProfile: boolean;
  hasEmailCredentials: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailAuthDocIds(email: string): string[] {
  const normalized = normalizeEmail(email);
  return [encodeURIComponent(normalized), normalized];
}

function looksLikeAppleUserId(userId?: string): boolean {
  return typeof userId === 'string' && userId.startsWith('apple_');
}

export async function resolveAccountIdentity(email: string): Promise<AccountIdentity> {
  const normalizedEmail = normalizeEmail(email);

  const identity: AccountIdentity = {
    kind: 'none',
    email: normalizedEmail,
    hasEmailProfile: false,
    hasEmailCredentials: false,
  };

  try {
    for (const docId of emailAuthDocIds(normalizedEmail)) {
      const snap = await getDoc(doc(db, 'email_auth', docId));
      if (!snap.exists()) continue;

      const data = snap.data() as {
        userId?: string;
        passwordHash?: string;
        password_hash?: string;
        salt?: string;
      };

      const hasPassword =
        (typeof data.passwordHash === 'string' && typeof data.salt === 'string') ||
        (typeof data.password_hash === 'string' && typeof data.salt === 'string');

      identity.hasEmailCredentials = identity.hasEmailCredentials || hasPassword;
      if (typeof data.userId === 'string' && data.userId.trim()) {
        identity.userId = data.userId.trim();
        if (looksLikeAppleUserId(identity.userId)) {
          identity.kind = 'apple_linked';
        } else if (hasPassword) {
          identity.kind = 'email_password';
        }
      } else if (hasPassword) {
        identity.kind = 'email_password';
      }
    }

    const profileByEmail = await getDocs(
      query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
    );

    if (!profileByEmail.empty) {
      identity.hasEmailProfile = true;
      const profile = profileByEmail.docs[0].data() as { id?: string; provider?: string };
      const profileId = profile.id || profileByEmail.docs[0].id;
      if (!identity.userId) identity.userId = profileId;

      if (identity.kind === 'none') {
        identity.kind = profile.provider === 'apple' || looksLikeAppleUserId(profileId)
          ? 'apple_linked'
          : 'profile_only';
      }
    } else {
      const canonicalProfile = await getDoc(doc(db, 'users', `email_${normalizedEmail}`));
      if (canonicalProfile.exists()) {
        identity.hasEmailProfile = true;
        const profile = canonicalProfile.data() as { id?: string; provider?: string };
        const profileId = profile.id || canonicalProfile.id;
        if (!identity.userId) identity.userId = profileId;

        if (identity.kind === 'none') {
          identity.kind = profile.provider === 'apple' || looksLikeAppleUserId(profileId)
            ? 'apple_linked'
            : 'profile_only';
        }
      }
    }
  } catch {
    // Keep the conservative default: unresolved identity.
  }

  return identity;
}

export function canCreatePasswordAccount(identity: AccountIdentity): boolean {
  return identity.kind === 'none';
}

export function requiresAppleSignIn(identity: AccountIdentity): boolean {
  return identity.kind === 'apple_linked';
}

export function hasProfileWithoutPassword(identity: AccountIdentity): boolean {
  return identity.kind === 'profile_only' && !identity.hasEmailCredentials;
}
