import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/utils/firebase';

export type AccountIdentityKind = 'email_password' | 'apple_linked' | 'google_linked' | 'profile_only' | 'none';

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

function looksLikeGoogleUserId(userId?: string): boolean {
  return typeof userId === 'string' && userId.startsWith('google_');
}

function socialKindFor(profileId: string | undefined, provider: string | undefined): AccountIdentityKind | null {
  if (provider === 'apple' || looksLikeAppleUserId(profileId)) return 'apple_linked';
  if (provider === 'google' || looksLikeGoogleUserId(profileId)) return 'google_linked';
  return null;
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
        const social = socialKindFor(identity.userId, undefined);
        if (social && !hasPassword) {
          identity.kind = social;
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
        identity.kind = socialKindFor(profileId, profile.provider) ?? 'profile_only';
      }
    } else {
      const canonicalProfile = await getDoc(doc(db, 'users', `email_${normalizedEmail}`));
      if (canonicalProfile.exists()) {
        identity.hasEmailProfile = true;
        const profile = canonicalProfile.data() as { id?: string; provider?: string };
        const profileId = profile.id || canonicalProfile.id;
        if (!identity.userId) identity.userId = profileId;

        if (identity.kind === 'none') {
          identity.kind = socialKindFor(profileId, profile.provider) ?? 'profile_only';
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

export function requiresGoogleSignIn(identity: AccountIdentity): boolean {
  return identity.kind === 'google_linked';
}

/** Which social provider owns this email, if any. */
export function socialProviderFor(identity: AccountIdentity): 'apple' | 'google' | null {
  if (identity.kind === 'apple_linked') return 'apple';
  if (identity.kind === 'google_linked') return 'google';
  return null;
}

export function hasProfileWithoutPassword(identity: AccountIdentity): boolean {
  return identity.kind === 'profile_only' && !identity.hasEmailCredentials;
}
