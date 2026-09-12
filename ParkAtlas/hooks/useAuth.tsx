import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { AUTH_USER_KEY, BIOMETRIC_ENABLED_KEY } from '@/constants/authConfig';
import { fetchUserProfile, isPlaceholderName, isPrivateRelayEmail, upsertProductionUserProfile } from '@/utils/userDirectoryApi';
import { signOutOfGoogle } from '@/utils/googleSignIn';
import { auth, db } from '@/utils/firebase';

// ─── Types ─────────────────────────────────────────────────────────────────────────────

export type AuthProvider = 'apple' | 'email' | 'google';

export interface AuthUser {
  /** Firebase Auth UID. Pre-migration accounts keep their legacy `apple_…` / `google_…` / `email_…` ids. */
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  provider: AuthProvider;
}

/** Normalized identity handed to signInWithGoogle after the native Google sheet completes. */
export interface GoogleProfile {
  /** Google's stable `sub` claim. */
  id: string;
  /** OpenID token Firebase verifies server-side. */
  idToken: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

const STRAVA_ACCESS_TOKEN_KEY = 'strava_access_token';
const STRAVA_REFRESH_TOKEN_KEY = 'strava_refresh_token';
const STRAVA_TOKEN_EXPIRY_KEY = 'strava_token_expiry';
const STRAVA_CACHE_FILE = `${FileSystem.documentDirectory}strava_data.json`;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

// ─── Auth Error ───────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | 'EMAIL_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'SERVICE_UNAVAILABLE'
  | 'APPLE_SIGN_IN_REQUIRED'
  | 'GOOGLE_SIGN_IN_REQUIRED'
  | 'PASSWORD_NOT_SET'
  | 'REAUTH_REQUIRED'
  | 'TOO_MANY_ATTEMPTS';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Maps firebase/auth error codes onto the app's AuthError vocabulary. */
function toAuthError(e: unknown, fallback = 'Something went wrong. Please try again.'): AuthError {
  if (e instanceof AuthError) return e;
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new AuthError('EMAIL_EXISTS', 'An account with this email already exists. Please sign in instead.');
    case 'auth/invalid-email':
      return new AuthError('INVALID_EMAIL', 'Please enter a valid email address.');
    case 'auth/weak-password':
      return new AuthError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    case 'auth/user-not-found':
      return new AuthError('USER_NOT_FOUND', 'No account found with this email.');
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.');
    case 'auth/too-many-requests':
      return new AuthError('TOO_MANY_ATTEMPTS', 'Too many attempts. Please wait a few minutes and try again.');
    case 'auth/requires-recent-login':
      return new AuthError('REAUTH_REQUIRED', 'For your security, please sign out and back in, then try again.');
    case 'auth/network-request-failed':
    case 'auth/internal-error':
      return new AuthError('SERVICE_UNAVAILABLE', 'Cloud sign-in is temporarily unavailable. Please try again.');
    case 'auth/account-exists-with-different-credential':
      return new AuthError('EMAIL_EXISTS', 'This email is already linked to another sign-in method.');
    default:
      return new AuthError('SERVICE_UNAVAILABLE', fallback);
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
  /** Sends Firebase's password-reset email. Resolves silently for unknown emails (no enumeration). */
  sendPasswordReset: (email: string) => Promise<void>;
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
  sendPasswordReset: async () => {},
  unlockWithBiometrics: async () => false,
  setBiometricEnabled: async () => {},
  dismissBiometricPrompt: () => {},
  signInDev: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function providerFromFirebaseUser(fbUser: FirebaseUser): AuthProvider {
  const ids = fbUser.providerData.map((p) => p.providerId);
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('password')) return 'email';
  // Imported legacy accounts may carry no providerData until first sign-in; infer from the id.
  if (fbUser.uid.startsWith('apple_')) return 'apple';
  if (fbUser.uid.startsWith('google_')) return 'google';
  return 'email';
}

/**
 * Builds the app-level AuthUser for a Firebase session. Precedence per field:
 *   fresh provider data → Firestore profile → cached session → fallback.
 * Firestore is the cross-device source of truth because Apple only returns
 * name/email on the very first authorization.
 */
async function buildAuthUser(
  fbUser: FirebaseUser,
  fresh: { firstName?: string; lastName?: string; fullName?: string; email?: string; avatarUrl?: string } = {},
): Promise<AuthUser> {
  const id = fbUser.uid;
  const [remote, cachedRaw] = await Promise.all([
    fetchUserProfile(id).catch(() => null),
    safeSecureStoreGetItemAsync(AUTH_USER_KEY),
  ]);
  const cached: AuthUser | null = cachedRaw ? JSON.parse(cachedRaw) : null;
  const sameCached = cached?.id === id ? cached : null;

  const freshFirst = (fresh.firstName || '').trim();
  const freshLast = (fresh.lastName || '').trim();
  const freshFull = (fresh.fullName || [freshFirst, freshLast].filter(Boolean).join(' ')).trim();

  const firstName = freshFirst || remote?.firstName || sameCached?.firstName || undefined;
  const lastName = freshLast || remote?.lastName || sameCached?.lastName || undefined;
  const email = normalizeEmail(fresh.email || fbUser.email || remote?.email || sameCached?.email || '');

  const name =
    freshFull ||
    remote?.name ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    (fbUser.displayName || '').trim() ||
    (sameCached && !isPlaceholderName(sameCached.name) ? sameCached.name : '') ||
    (email && !isPrivateRelayEmail(email) ? email.split('@')[0] : '') ||
    'Explorer';

  const avatarUrl = fresh.avatarUrl || remote?.avatarUrl || fbUser.photoURL || sameCached?.avatarUrl;
  const phone = remote?.phone || sameCached?.phone;

  return {
    id,
    name,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    email,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(phone ? { phone } : {}),
    provider: providerFromFirebaseUser(fbUser),
  };
}

function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(16)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pendingBiometricUser, setPendingBiometricUser] = useState<AuthUser | null>(null);
  const [secureStoreAvailable, setSecureStoreAvailable] = useState(true);
  // Set while a sign-in flow owns the session so the auth listener doesn't double-resolve it.
  const signingInRef = useRef(false);

  // ── Session bootstrap ─────────────────────────────────────────────────────────
  useEffect(() => {
    let bioEnabled = false;
    let deviceSupports = false;

    const prep = (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        deviceSupports = hasHardware && isEnrolled;
        setBiometricAvailable(deviceSupports);
        bioEnabled = (await safeSecureStoreGetItemAsync(BIOMETRIC_ENABLED_KEY)) === 'true';
        setBiometricEnabledState(bioEnabled);
        if (secureStoreFailedRef.current) setSecureStoreAvailable(false);
      } catch {
        // First launch or SecureStore unavailable
      }
    })();

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      void (async () => {
        await prep;
        try {
          if (!fbUser) {
            // Guests get a silent anonymous session so security rules can require request.auth.
            setUser(null);
            setPendingBiometricUser(null);
            await signInAnonymously(auth).catch((e) => console.warn('[useAuth] anonymous sign-in failed:', e));
            return;
          }
          if (fbUser.isAnonymous) {
            setUser(null);
            return;
          }
          if (signingInRef.current) return;

          const cachedRaw = await safeSecureStoreGetItemAsync(AUTH_USER_KEY);
          const cached: AuthUser | null = cachedRaw ? JSON.parse(cachedRaw) : null;
          const resolved = cached?.id === fbUser.uid ? cached : await buildAuthUser(fbUser);
          if (bioEnabled && deviceSupports && !secureStoreFailedRef.current) {
            setPendingBiometricUser(resolved);
          } else {
            setUser(resolved);
          }
          // Refresh the profile in the background so cross-device edits show up.
          if (cached?.id === fbUser.uid) {
            void buildAuthUser(fbUser).then((fresh) => {
              void safeSecureStoreSetItemAsync(AUTH_USER_KEY, JSON.stringify(fresh));
              setUser((prev) => (prev?.id === fresh.id ? fresh : prev));
            }).catch(() => {});
          }
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  // ── Helper: persist & unlock ──────────────────────────────────────────────────
  async function persistUser(authUser: AuthUser) {
    await safeSecureStoreSetItemAsync(AUTH_USER_KEY, JSON.stringify(authUser));
    setPendingBiometricUser(null);
    setUser(authUser);
    void upsertProductionUserProfile(authUser);
  }

  /** Runs a Firebase credential sign-in and resolves the app user from it. */
  async function completeSignIn(
    run: () => Promise<FirebaseUser>,
    fresh: Parameters<typeof buildAuthUser>[1] = {},
  ): Promise<AuthUser> {
    signingInRef.current = true;
    try {
      const fbUser = await run();
      const authUser = await buildAuthUser(fbUser, fresh);
      await persistUser(authUser);
      return authUser;
    } finally {
      signingInRef.current = false;
    }
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

  // ── Apple Sign In ─────────────────────────────────────────────────────────────
  const signInWithApple = useCallback(async (): Promise<boolean> => {
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    const rawNonce = randomNonce();
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce),
      });
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return false;
      // Unsigned/dev builds lack the Sign in with Apple entitlement; sim also needs an iCloud login.
      throw new AuthError(
        'SERVICE_UNAVAILABLE',
        "Apple Sign-In isn't available on this device right now. Make sure you're signed into iCloud, or use email instead."
      );
    }
    if (!credential.identityToken) {
      throw new AuthError('SERVICE_UNAVAILABLE', 'Apple did not return an identity token. Please try again.');
    }

    try {
      const oauth = new OAuthProvider('apple.com').credential({ idToken: credential.identityToken, rawNonce });
      await completeSignIn(
        async () => (await signInWithCredential(auth, oauth)).user,
        {
          firstName: credential.fullName?.givenName ?? undefined,
          lastName: credential.fullName?.familyName ?? undefined,
          email: credential.email ?? undefined,
        },
      );
      return true;
    } catch (e) {
      throw toAuthError(e, "Couldn't sign in with Apple. Please try again.");
    }
  }, []);

  // ── Google Sign In ────────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (profile: GoogleProfile) => {
    if (!profile?.idToken) throw new AuthError('SERVICE_UNAVAILABLE', 'Google did not return a sign-in token.');
    try {
      const cred = GoogleAuthProvider.credential(profile.idToken);
      await completeSignIn(
        async () => (await signInWithCredential(auth, cred)).user,
        {
          firstName: profile.givenName,
          lastName: profile.familyName,
          fullName: profile.name,
          email: profile.email,
          avatarUrl: profile.picture,
        },
      );
    } catch (e) {
      throw toAuthError(e, "Couldn't sign in with Google. Please try again.");
    }
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

    try {
      await completeSignIn(
        async () => (await createUserWithEmailAndPassword(auth, normalizedEmail, password)).user,
        { firstName: cleanFirstName, lastName: cleanLastName, email: normalizedEmail },
      );
    } catch (e) {
      throw toAuthError(e);
    }
  }, []);

  // ── Email Sign In ─────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    try {
      await completeSignIn(async () => (await signInWithEmailAndPassword(auth, normalizedEmail, password)).user);
    } catch (e) {
      throw toAuthError(e);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AuthError('INVALID_EMAIL', 'Please enter a valid email address.');
    }
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (e) {
      const mapped = toAuthError(e);
      // Don't reveal whether an address is registered.
      if (mapped.code === 'USER_NOT_FOUND') return;
      throw mapped;
    }
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
    // Locked-out user chose manual sign-in: drop the Firebase session too so the next sign-in is clean.
    setPendingBiometricUser(null);
    void firebaseSignOut(auth).catch(() => {});
  }, []);

  // ── Dev Sign In ───────────────────────────────────────────────────────────────
  const signInDev = useCallback(async () => {
    if (!__DEV__) return;
    const email = 'dev@parkatlas.io';
    const password = 'parkatlas-dev-2026';
    try {
      await completeSignIn(
        async () => {
          try {
            return (await signInWithEmailAndPassword(auth, email, password)).user;
          } catch {
            return (await createUserWithEmailAndPassword(auth, email, password)).user;
          }
        },
        { firstName: 'Dev', lastName: 'User', email },
      );
    } catch (e) {
      throw toAuthError(e);
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await safeSecureStoreDeleteItemAsync(AUTH_USER_KEY);
    if (user?.provider === 'google') await signOutOfGoogle();
    setPendingBiometricUser(null);
    setUser(null);
    // The auth listener re-establishes an anonymous guest session.
    await firebaseSignOut(auth).catch(() => {});
  }, [user?.provider]);

  const deleteAccount = useCallback(async () => {
    const currentUser = user;
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.isAnonymous) return;

    // Firestore profile first (needs the still-valid session), then the auth record.
    await deleteDoc(doc(db, 'users', fbUser.uid)).catch(() => {});
    try {
      await deleteUser(fbUser);
    } catch (e) {
      throw toAuthError(e, "Couldn't delete your account. Please try again.");
    }

    if (currentUser?.provider === 'google') await signOutOfGoogle();
    await Promise.all([
      safeSecureStoreDeleteItemAsync(AUTH_USER_KEY),
      safeSecureStoreDeleteItemAsync(BIOMETRIC_ENABLED_KEY),
      safeSecureStoreDeleteItemAsync(STRAVA_ACCESS_TOKEN_KEY),
      safeSecureStoreDeleteItemAsync(STRAVA_REFRESH_TOKEN_KEY),
      safeSecureStoreDeleteItemAsync(STRAVA_TOKEN_EXPIRY_KEY),
      FileSystem.deleteAsync(STRAVA_CACHE_FILE, { idempotent: true }).catch(() => {}),
    ]);

    setBiometricEnabledState(false);
    setPendingBiometricUser(null);
    setUser(null);
  }, [user]);

  // ── Change Password (email accounts only) ───────────────────────────────────
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const fbUser = auth.currentUser;
    if (!user || user.provider !== 'email' || !fbUser) {
      throw new AuthError('INVALID_CREDENTIALS', 'Password changes are only available for email accounts.');
    }
    const nextPassword = newPassword.trim();
    if (nextPassword.length < 8) {
      throw new AuthError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    }
    try {
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(normalizeEmail(user.email), currentPassword));
    } catch (e) {
      const mapped = toAuthError(e);
      throw mapped.code === 'INVALID_CREDENTIALS' ? new AuthError('INVALID_CREDENTIALS', 'Current password is incorrect.') : mapped;
    }
    try {
      await updatePassword(fbUser, nextPassword);
    } catch (e) {
      throw toAuthError(e);
    }
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
        sendPasswordReset,
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
