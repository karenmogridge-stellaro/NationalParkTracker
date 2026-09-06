import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AUTH_USER_KEY, BIOMETRIC_ENABLED_KEY, credentialsKey } from '@/constants/authConfig';
import { mergeDuplicateAccountsForEmail } from '@/utils/accountMerge';
import { hasProfileWithoutPassword, resolveAccountIdentity, socialProviderFor } from '@/utils/accountLinking';
import { fetchUserProfile, isPlaceholderName, isPrivateRelayEmail, upsertProductionUserProfile } from '@/utils/userDirectoryApi';
import { signOutOfGoogle } from '@/utils/googleSignIn';
import { db } from '@/utils/firebase';

// ─── Types ─────────────────────────────────────────────────────────────────────────────

export type AuthProvider = 'apple' | 'email' | 'google';

export interface AuthUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  provider: AuthProvider;
}

/** Normalized identity handed to signInWithGoogle after the OAuth dance completes. */
export interface GoogleProfile {
  /** Google's stable `sub` claim. */
  id: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

interface StoredCredentials {
  passwordHash: string;
  salt: string;
}

type FirestoreCredentialsLookup = {
  creds: StoredCredentials | null;
  /** Canonical account id the credentials resolve to (may be a social id after a merge). */
  userId: string | null;
  unavailable: boolean;
};

type FirestoreEmailAuthDoc = {
  email?: string;
  passwordHash?: string;
  salt?: string;
  userId?: string;
};

const STRAVA_ACCESS_TOKEN_KEY = 'strava_access_token';
const STRAVA_REFRESH_TOKEN_KEY = 'strava_refresh_token';
const STRAVA_TOKEN_EXPIRY_KEY = 'strava_token_expiry';
const STRAVA_CACHE_FILE = `${FileSystem.documentDirectory}strava_data.json`;

function appleProfileKey(appleUserId: string): string {
  return `parkatlas_apple_profile_${appleUserId}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailAuthDocId(email: string): string {
  return encodeURIComponent(normalizeEmail(email));
}

function legacyEmailAuthDocId(email: string): string {
  return normalizeEmail(email);
}

let secureStoreFailedRef = { current: false };

async function safeSecureStoreGetItemAsync(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn('[useAuth] SecureStore read unavailable:', error);
    secureStoreFailedRef.current = true;
    return null;
  }
}

async function safeSecureStoreSetItemAsync(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn('[useAuth] SecureStore write unavailable:', error);
    secureStoreFailedRef.current = true;
  }
}

async function safeSecureStoreDeleteItemAsync(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn('[useAuth] SecureStore delete unavailable:', error);
    secureStoreFailedRef.current = true;
  }
}

async function getFirestoreEmailCredentials(email: string): Promise<FirestoreCredentialsLookup> {
  try {
    const docIds = [emailAuthDocId(email), legacyEmailAuthDocId(email)];

    for (const docId of docIds) {
      const snap = await getDoc(doc(db, 'email_auth', docId));
      if (!snap.exists()) continue;

      const data = snap.data() as FirestoreEmailAuthDoc & {
        password_hash?: string;
      };
      const passwordHash =
        typeof data.passwordHash === 'string'
          ? data.passwordHash
          : typeof data.password_hash === 'string'
            ? data.password_hash
            : null;
      const salt = typeof data.salt === 'string' ? data.salt : null;

      if (!passwordHash || !salt) {
        continue;
      }

      return {
        creds: { passwordHash, salt },
        userId: typeof data.userId === 'string' && data.userId.trim() ? data.userId.trim() : null,
        unavailable: false,
      };
    }

    return { creds: null, userId: null, unavailable: false };
  } catch {
    return { creds: null, userId: null, unavailable: true };
  }
}

async function setFirestoreEmailCredentials(email: string, creds: StoredCredentials, userId: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const payload = {
    email: normalizedEmail,
    passwordHash: creds.passwordHash,
    salt: creds.salt,
    userId,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(doc(db, 'email_auth', emailAuthDocId(normalizedEmail)), payload, { merge: true }),
    setDoc(doc(db, 'email_auth', legacyEmailAuthDocId(normalizedEmail)), payload, { merge: true }),
  ]);
}

async function getLocalEmailCredentials(email: string): Promise<StoredCredentials | null> {
  const normalizedEmail = normalizeEmail(email);
  const raw = await safeSecureStoreGetItemAsync(credentialsKey(normalizedEmail));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (typeof parsed.passwordHash !== 'string' || typeof parsed.salt !== 'string') {
      await safeSecureStoreDeleteItemAsync(credentialsKey(normalizedEmail));
      return null;
    }
    return {
      passwordHash: parsed.passwordHash,
      salt: parsed.salt,
    };
  } catch {
    await safeSecureStoreDeleteItemAsync(credentialsKey(normalizedEmail));
    return null;
  }
}

// ─── Auth Error ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    public code:
      | 'EMAIL_EXISTS'
      | 'INVALID_CREDENTIALS'
      | 'USER_NOT_FOUND'
      | 'WEAK_PASSWORD'
      | 'INVALID_EMAIL'
      | 'SERVICE_UNAVAILABLE'
      | 'APPLE_SIGN_IN_REQUIRED'
      | 'GOOGLE_SIGN_IN_REQUIRED'
      | 'PASSWORD_NOT_SET',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the persisted session is being loaded */
  loading: boolean;
  /** Device supports biometric hardware and has enrollments */
  biometricAvailable: boolean;
  /** User has opted in to biometric lock */
  biometricEnabled: boolean;
  /** Session exists but is locked behind biometrics */
  pendingBiometricUser: AuthUser | null;
  /** Signed in but we never learned a real name (e.g. Apple on a new device) — prompt for one. */
  needsProfileName: boolean;
  /** Resolves false when the user cancels the Apple sheet. */
  signInWithApple: () => Promise<boolean>;
  signInWithGoogle: (profile: GoogleProfile) => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Prompts Face ID / Touch ID and unlocks the pending session on success */
  unlockWithBiometrics: () => Promise<boolean>;
  /** User opt-in/out of biometric lock from settings */
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  /** Dismiss the biometric prompt and fall through to manual sign-in */
  dismissBiometricPrompt: () => void;
  /** Dev-only bypass (never shown in production builds) */
  signInDev: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (name: string, avatarUrl?: string, phone?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  biometricAvailable: false,
  biometricEnabled: false,
  pendingBiometricUser: null,
  needsProfileName: false,
  signInWithApple: async () => false,
  signInWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  unlockWithBiometrics: async () => false,
  setBiometricEnabled: async () => {},
  dismissBiometricPrompt: () => {},
  signInDev: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
});

// ─── Password helpers ─────────────────────────────────────────────────────────

function generateSalt(): string {
  // Prefer Expo Crypto native random bytes for reliability in production builds.
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + password);
}

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pendingBiometricUser, setPendingBiometricUser] = useState<AuthUser | null>(null);
  const [secureStoreAvailable, setSecureStoreAvailable] = useState(true);

  // ── Load session on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const deviceSupports = hasHardware && isEnrolled;
        setBiometricAvailable(deviceSupports);

        const bioRaw = await safeSecureStoreGetItemAsync(BIOMETRIC_ENABLED_KEY);
        const isBioEnabled = bioRaw === 'true';
        setBiometricEnabledState(isBioEnabled);

        const stored = await safeSecureStoreGetItemAsync(AUTH_USER_KEY);
        
        // If SecureStore failed, mark it as unavailable
        if (secureStoreFailedRef.current) {
          setSecureStoreAvailable(false);
        }
        
        if (stored) {
          const storedUser: AuthUser = JSON.parse(stored);
          if (isBioEnabled && deviceSupports && secureStoreFailedRef.current === false) {
            // Lock the session — show biometric prompt on login screen
            // Only if SecureStore is actually working
            setPendingBiometricUser(storedUser);
          } else {
            setUser(storedUser);
          }
        }
      } catch {
        // First launch or SecureStore unavailable
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Helper: persist & unlock ──────────────────────────────────────────────────
  async function persistUser(authUser: AuthUser) {
    await safeSecureStoreSetItemAsync(AUTH_USER_KEY, JSON.stringify(authUser));
    if (authUser.provider === 'apple') {
      const appleUserId = authUser.id.replace(/^apple_/, '');
      await safeSecureStoreSetItemAsync(appleProfileKey(appleUserId), JSON.stringify(authUser));
    }
    setPendingBiometricUser(null);
    setUser(authUser);
    void upsertProductionUserProfile(authUser);
  }

  // ── Update Profile ────────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (name: string, avatarUrl?: string, phone?: string) => {
    if (!user) return;
    const { firstName, lastName } = splitDisplayName(name);
    const updated: AuthUser = {
      ...user,
      name: name.trim(),
      firstName,
      lastName,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
    };
    await persistUser(updated);
  }, [user]);

  // ── Social identity resolution ────────────────────────────────────────────────
  /**
   * Builds the AuthUser for a social sign-in. Precedence for each field:
   *   fresh provider data → Firestore profile → local caches → fallback.
   * Firestore is the cross-device source of truth because Apple only returns
   * name/email on the very first authorization.
   */
  async function resolveSocialUser(input: {
    provider: 'apple' | 'google';
    providerUserId: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<AuthUser> {
    const id = `${input.provider}_${input.providerUserId}`;

    const [remote, storedRaw, providerCachedRaw] = await Promise.all([
      fetchUserProfile(id),
      safeSecureStoreGetItemAsync(AUTH_USER_KEY),
      input.provider === 'apple' ? safeSecureStoreGetItemAsync(appleProfileKey(input.providerUserId)) : Promise.resolve(null),
    ]);
    const cached: AuthUser | null = storedRaw ? JSON.parse(storedRaw) : null;
    const sameUserCached = cached?.id === id ? cached : null;
    const providerCached: AuthUser | null = providerCachedRaw ? JSON.parse(providerCachedRaw) : null;

    const freshFirst = (input.firstName || '').trim();
    const freshLast = (input.lastName || '').trim();
    const freshFull = (input.fullName || [freshFirst, freshLast].filter(Boolean).join(' ')).trim();

    const firstName = freshFirst || remote?.firstName || providerCached?.firstName || sameUserCached?.firstName || undefined;
    const lastName = freshLast || remote?.lastName || providerCached?.lastName || sameUserCached?.lastName || undefined;
    const email = normalizeEmail(input.email || remote?.email || providerCached?.email || sameUserCached?.email || '');

    const name =
      freshFull ||
      remote?.name ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      (providerCached && !isPlaceholderName(providerCached.name) ? providerCached.name : '') ||
      (sameUserCached && !isPlaceholderName(sameUserCached.name) ? sameUserCached.name : '') ||
      (email && !isPrivateRelayEmail(email) ? email.split('@')[0] : '') ||
      'Explorer';

    const avatarUrl = input.avatarUrl || remote?.avatarUrl || providerCached?.avatarUrl || sameUserCached?.avatarUrl;
    const phone = remote?.phone || providerCached?.phone || sameUserCached?.phone;

    return {
      id,
      name,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      email,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(phone ? { phone } : {}),
      provider: input.provider,
    };
  }

  async function mergeEmailAliasesInto(authUser: AuthUser): Promise<void> {
    if (!authUser.email || isPrivateRelayEmail(authUser.email)) return;
    try {
      await mergeDuplicateAccountsForEmail(authUser.email, authUser.id);
    } catch {
      // Non-blocking: account merge failures should not block sign-in.
    }
  }

  // ── Apple Sign In ─────────────────────────────────────────────────────────────
  const signInWithApple = useCallback(async (): Promise<boolean> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const authUser = await resolveSocialUser({
        provider: 'apple',
        providerUserId: credential.user,
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
        email: credential.email ?? undefined,
      });

      await mergeEmailAliasesInto(authUser);
      await persistUser(authUser);
      return true;
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return false;
      if (e instanceof AuthError) throw e;
      // Unsigned/dev builds lack the Sign in with Apple entitlement; sim also needs an iCloud login.
      throw new AuthError(
        'SERVICE_UNAVAILABLE',
        "Apple Sign-In isn't available on this device right now. Make sure you're signed into iCloud, or use email instead."
      );
    }
  }, []);

  // ── Google Sign In ────────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (profile: GoogleProfile) => {
    if (!profile?.id) throw new AuthError('SERVICE_UNAVAILABLE', 'Google did not return an account id.');

    const authUser = await resolveSocialUser({
      provider: 'google',
      providerUserId: profile.id,
      firstName: profile.givenName,
      lastName: profile.familyName,
      fullName: profile.name,
      email: profile.email,
      avatarUrl: profile.picture,
    });

    await mergeEmailAliasesInto(authUser);
    await persistUser(authUser);
  }, []);

  // ── Email Sign Up ─────────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    const normalizedEmail = normalizeEmail(email);
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AuthError('INVALID_EMAIL', 'Please enter a valid email address.');
    }
    if (!cleanFirstName || !cleanLastName) {
      throw new Error('First and last name are required.');
    }
    if (password.length < 8) {
      throw new AuthError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    }

    const identity = await resolveAccountIdentity(normalizedEmail);
    const isRestoringProfileOnlyAccount = hasProfileWithoutPassword(identity);
    if (identity.kind !== 'none' && !isRestoringProfileOnlyAccount) {
      const social = socialProviderFor(identity);
      if (social === 'apple') {
        throw new AuthError(
          'APPLE_SIGN_IN_REQUIRED',
          'This email already belongs to an Apple Sign-In account. Tap Continue with Apple instead of creating a new password account.'
        );
      }
      if (social === 'google') {
        throw new AuthError(
          'GOOGLE_SIGN_IN_REQUIRED',
          'This email already belongs to a Google account. Tap Continue with Google instead of creating a new password account.'
        );
      }

      throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists. Please sign in instead.');
    }

    const [existingFirestoreLookup, existingLocal] = await Promise.all([
      getFirestoreEmailCredentials(normalizedEmail),
      getLocalEmailCredentials(normalizedEmail),
    ]);
    const existingFirestore = existingFirestoreLookup.creds;
    if (existingFirestore || existingLocal) {
      throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const credentials: StoredCredentials = { passwordHash, salt };
    await safeSecureStoreSetItemAsync(credentialsKey(normalizedEmail), JSON.stringify(credentials));

    // Restoring a profile-only account reuses its existing canonical id instead of minting
    // a new one, so friendships/activity/invites stay attached to the original identity.
    const userId = isRestoringProfileOnlyAccount && identity.userId ? identity.userId : `email_${normalizedEmail}`;
    await setFirestoreEmailCredentials(normalizedEmail, credentials, userId);

    const authUser: AuthUser = {
      id: userId,
      name: `${cleanFirstName} ${cleanLastName}`,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: normalizedEmail,
      provider: 'email',
    };

    try {
      await mergeDuplicateAccountsForEmail(normalizedEmail, userId);
    } catch {
      // Non-blocking: account merge failures should not block sign-up.
    }

    await persistUser(authUser);
  }, []);

  // ── Email Sign In ─────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const [firestoreLookup, localCreds] = await Promise.all([
      getFirestoreEmailCredentials(normalizedEmail),
      getLocalEmailCredentials(normalizedEmail),
    ]);

    const firestoreCreds = firestoreLookup.creds;

    let creds: StoredCredentials | null = firestoreCreds;
    if (!creds && localCreds) creds = localCreds;

    if (!creds) {
      if (firestoreLookup.unavailable) {
        throw new AuthError('SERVICE_UNAVAILABLE', 'Cloud sign-in is temporarily unavailable. Please try again.');
      }

      const identity = await resolveAccountIdentity(normalizedEmail);
      if (identity.kind !== 'none') {
        const social = socialProviderFor(identity);
        if (social === 'apple') {
          throw new AuthError(
            'APPLE_SIGN_IN_REQUIRED',
            'This account uses Apple Sign-In. Tap Continue with Apple to access it.'
          );
        }
        if (social === 'google') {
          throw new AuthError(
            'GOOGLE_SIGN_IN_REQUIRED',
            'This account uses Google Sign-In. Tap Continue with Google to access it.'
          );
        }

        throw new AuthError('PASSWORD_NOT_SET', 'This account exists, but no email password is set yet. Tap Sign up with this same email and password once to restore access.');
      }

      throw new AuthError('USER_NOT_FOUND', 'No account found with this email.');
    }

    const { passwordHash, salt } = creds;
    const inputHash = await hashPassword(password, salt);

    if (inputHash !== passwordHash) {
      throw new AuthError('INVALID_CREDENTIALS', 'Incorrect password.');
    }

    // Ensure both stores are kept in sync for compatibility across devices/versions.
    const normalizedCreds: StoredCredentials = { passwordHash, salt };
    await safeSecureStoreSetItemAsync(credentialsKey(normalizedEmail), JSON.stringify(normalizedCreds));
    if (!firestoreCreds) {
      await setFirestoreEmailCredentials(normalizedEmail, normalizedCreds, `email_${normalizedEmail}`);
    }

    // After an Apple/Google merge the credentials point at the social id; honor that
    // so password sign-in lands on the same account instead of an empty email_ one.
    const canonicalId = firestoreLookup.userId || `email_${normalizedEmail}`;

    // Restore any cached profile for this email (preserves any name updates)
    const stored = await safeSecureStoreGetItemAsync(AUTH_USER_KEY);
    const cached: AuthUser | null = stored ? JSON.parse(stored) : null;
    const isSame = cached?.id === canonicalId;

    const remote = await fetchUserProfile(canonicalId);
    const profileFirstName = remote?.firstName;
    const profileLastName = remote?.lastName;
    const profileDisplayName = remote?.name;

    const authUser: AuthUser = {
      id: canonicalId,
      name: profileDisplayName || (isSame ? cached!.name : normalizedEmail.split('@')[0]),
      ...((profileFirstName || (isSame && cached?.firstName)) ? { firstName: profileFirstName || cached?.firstName } : {}),
      ...((profileLastName || (isSame && cached?.lastName)) ? { lastName: profileLastName || cached?.lastName } : {}),
      email: normalizedEmail,
      ...(remote?.avatarUrl || (isSame && cached?.avatarUrl) ? { avatarUrl: remote?.avatarUrl || cached?.avatarUrl } : {}),
      ...(remote?.phone || (isSame && cached?.phone) ? { phone: remote?.phone || cached?.phone } : {}),
      provider: canonicalId.startsWith('apple_') ? 'apple' : canonicalId.startsWith('google_') ? 'google' : 'email',
    };

    try {
      await mergeDuplicateAccountsForEmail(normalizedEmail, authUser.id);
    } catch {
      // Non-blocking: account merge failures should not block sign-in.
    }

    await persistUser(authUser);
  }, []);

  // ── Biometrics ────────────────────────────────────────────────────────────────
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!pendingBiometricUser) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock ParkAtlas',
        cancelLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await persistUser(pendingBiometricUser);
        return true;
      }
    } catch (e) {
      console.error('[useAuth] Biometric error:', e);
    }
    return false;
  }, [pendingBiometricUser]);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await safeSecureStoreSetItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    setBiometricEnabledState(enabled);
  }, []);

  const dismissBiometricPrompt = useCallback(() => {
    setPendingBiometricUser(null);
  }, []);

  // ── Dev Sign In ───────────────────────────────────────────────────────────────
  const signInDev = useCallback(async () => {
    const devUser: AuthUser = {
      id: 'dev_user',
      name: 'Dev User',
      email: 'dev@parkatlas.app',
      provider: 'email',
    };
    await persistUser(devUser);
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await safeSecureStoreDeleteItemAsync(AUTH_USER_KEY);
    if (user?.provider === 'google') await signOutOfGoogle();
    setPendingBiometricUser(null);
    setUser(null);
  }, [user?.provider]);

  const deleteAccount = useCallback(async () => {
    const currentUser = user;
    if (currentUser?.provider === 'google') await signOutOfGoogle();

    await Promise.all([
      safeSecureStoreDeleteItemAsync(AUTH_USER_KEY),
      safeSecureStoreDeleteItemAsync(BIOMETRIC_ENABLED_KEY),
      safeSecureStoreDeleteItemAsync(STRAVA_ACCESS_TOKEN_KEY),
      safeSecureStoreDeleteItemAsync(STRAVA_REFRESH_TOKEN_KEY),
      safeSecureStoreDeleteItemAsync(STRAVA_TOKEN_EXPIRY_KEY),
      FileSystem.deleteAsync(STRAVA_CACHE_FILE, { idempotent: true }).catch(() => {}),
    ]);

    if (currentUser?.provider === 'email' && currentUser.email) {
      const normalizedEmail = currentUser.email.trim().toLowerCase();
      await safeSecureStoreDeleteItemAsync(credentialsKey(normalizedEmail));
      await deleteDoc(doc(db, 'email_auth', emailAuthDocId(normalizedEmail))).catch(() => {});
    }

    setBiometricEnabledState(false);
    setPendingBiometricUser(null);
    setUser(null);
  }, [user]);

  // ── Change Password (email accounts only) ───────────────────────────────────
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user || user.provider !== 'email') {
      throw new AuthError('INVALID_CREDENTIALS', 'Password changes are only available for email accounts.');
    }

    const nextPassword = newPassword.trim();
    if (nextPassword.length < 8) {
      throw new AuthError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    }

    const email = normalizeEmail(user.email);
    const [firestoreLookup, localCreds] = await Promise.all([
      getFirestoreEmailCredentials(email),
      getLocalEmailCredentials(email),
    ]);

    const firestoreCreds = firestoreLookup.creds;

    let creds: StoredCredentials | null = firestoreCreds;
    if (!creds && localCreds) creds = localCreds;

    if (!creds) {
      throw new AuthError('USER_NOT_FOUND', 'No account found with this email.');
    }

    const { passwordHash, salt } = creds;
    const inputHash = await hashPassword(currentPassword, salt);
    if (inputHash !== passwordHash) {
      throw new AuthError('INVALID_CREDENTIALS', 'Current password is incorrect.');
    }

    const nextSalt = generateSalt();
    const nextHash = await hashPassword(nextPassword, nextSalt);
    const updatedCredentials: StoredCredentials = { passwordHash: nextHash, salt: nextSalt };
    await safeSecureStoreSetItemAsync(credentialsKey(email), JSON.stringify(updatedCredentials));
    await setFirestoreEmailCredentials(email, updatedCredentials, user.id);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricAvailable: biometricAvailable && secureStoreAvailable,
        biometricEnabled,
        pendingBiometricUser: secureStoreAvailable ? pendingBiometricUser : null,
        needsProfileName: !!user && user.provider !== 'email' && isPlaceholderName(user.name) && !user.firstName,
        signInWithApple,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        unlockWithBiometrics,
        setBiometricEnabled,
        dismissBiometricPrompt,
        signInDev,
        signOut,
        deleteAccount,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}

