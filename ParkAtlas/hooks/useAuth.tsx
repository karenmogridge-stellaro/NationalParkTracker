import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import { AUTH_USER_KEY, BIOMETRIC_ENABLED_KEY, credentialsKey } from '@/constants/authConfig';
import { upsertProductionUserProfile } from '@/utils/userDirectoryApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  provider: 'apple' | 'email';
}

interface StoredCredentials {
  passwordHash: string;
  salt: string;
}

const STRAVA_ACCESS_TOKEN_KEY = 'strava_access_token';
const STRAVA_REFRESH_TOKEN_KEY = 'strava_refresh_token';
const STRAVA_TOKEN_EXPIRY_KEY = 'strava_token_expiry';
const STRAVA_CACHE_FILE = `${FileSystem.documentDirectory}strava_data.json`;

function appleProfileKey(appleUserId: string): string {
  return `parkatlas_apple_profile_${appleUserId}`;
}

// ─── Auth Error ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    public code:
      | 'EMAIL_EXISTS'
      | 'INVALID_CREDENTIALS'
      | 'USER_NOT_FOUND'
      | 'WEAK_PASSWORD'
      | 'INVALID_EMAIL',
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
  signInWithApple: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
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
  signInWithApple: async () => {},
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pendingBiometricUser, setPendingBiometricUser] = useState<AuthUser | null>(null);

  // ── Load session on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const deviceSupports = hasHardware && isEnrolled;
        setBiometricAvailable(deviceSupports);

        const bioRaw = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        const isBioEnabled = bioRaw === 'true';
        setBiometricEnabledState(isBioEnabled);

        const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
        if (stored) {
          const storedUser: AuthUser = JSON.parse(stored);
          if (isBioEnabled && deviceSupports) {
            // Lock the session — show biometric prompt on login screen
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
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(authUser));
    if (authUser.provider === 'apple') {
      const appleUserId = authUser.id.replace(/^apple_/, '');
      await SecureStore.setItemAsync(appleProfileKey(appleUserId), JSON.stringify(authUser));
    }
    setPendingBiometricUser(null);
    setUser(authUser);
    void upsertProductionUserProfile(authUser);
  }

  // ── Update Profile ────────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (name: string, avatarUrl?: string, phone?: string) => {
    if (!user) return;
    const updated: AuthUser = {
      ...user,
      name: name.trim(),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
    };
    await persistUser(updated);
  }, [user]);

  // ── Apple Sign In ─────────────────────────────────────────────────────────────
  const signInWithApple = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
      const cached: AuthUser | null = stored ? JSON.parse(stored) : null;
      const isSameAppleUser =
        cached?.provider === 'apple' && cached.id === `apple_${credential.user}`;
      const appleCachedRaw = await SecureStore.getItemAsync(appleProfileKey(credential.user));
      const appleCached: AuthUser | null = appleCachedRaw ? JSON.parse(appleCachedRaw) : null;

      const firstName = credential.fullName?.givenName ?? '';
      const lastName = credential.fullName?.familyName ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      const email = credential.email ?? (appleCached?.email || (isSameAppleUser ? cached!.email : ''));

      const authUser: AuthUser = {
        id: `apple_${credential.user}`,
        name:
          fullName ||
          appleCached?.name ||
          (isSameAppleUser ? cached!.name : '') ||
          (email ? email.split('@')[0] : 'Explorer'),
        email,
        ...((isSameAppleUser && cached?.phone) || appleCached?.phone
          ? { phone: appleCached?.phone || cached?.phone }
          : {}),
        provider: 'apple',
      };
      await persistUser(authUser);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[useAuth] Apple sign-in error:', e);
      }
    }
  }, []);

  // ── Email Sign Up ─────────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    name: string,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AuthError('INVALID_EMAIL', 'Please enter a valid email address.');
    }
    if (password.length < 8) {
      throw new AuthError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    }

    const existing = await SecureStore.getItemAsync(credentialsKey(normalizedEmail));
    if (existing) {
      throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const credentials: StoredCredentials = { passwordHash, salt };
    await SecureStore.setItemAsync(credentialsKey(normalizedEmail), JSON.stringify(credentials));

    const authUser: AuthUser = {
      id: `email_${normalizedEmail}`,
      name: name.trim(),
      email: normalizedEmail,
      provider: 'email',
    };
    await persistUser(authUser);
  }, []);

  // ── Email Sign In ─────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const credsRaw = await SecureStore.getItemAsync(credentialsKey(normalizedEmail));
    if (!credsRaw) {
      throw new AuthError('USER_NOT_FOUND', 'No account found with this email.');
    }

    const { passwordHash, salt }: StoredCredentials = JSON.parse(credsRaw);
    const inputHash = await hashPassword(password, salt);

    if (inputHash !== passwordHash) {
      throw new AuthError('INVALID_CREDENTIALS', 'Incorrect password.');
    }

    // Restore any cached profile for this email (preserves any name updates)
    const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
    const cached: AuthUser | null = stored ? JSON.parse(stored) : null;
    const isSame = cached?.id === `email_${normalizedEmail}`;

    const authUser: AuthUser = {
      id: `email_${normalizedEmail}`,
      name: isSame ? cached!.name : normalizedEmail.split('@')[0],
      email: normalizedEmail,
      ...(isSame && cached?.phone ? { phone: cached.phone } : {}),
      provider: 'email',
    };
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
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
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
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    setPendingBiometricUser(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    const currentUser = user;

    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_USER_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(STRAVA_ACCESS_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(STRAVA_REFRESH_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(STRAVA_TOKEN_EXPIRY_KEY).catch(() => {}),
      FileSystem.deleteAsync(STRAVA_CACHE_FILE, { idempotent: true }).catch(() => {}),
    ]);

    if (currentUser?.provider === 'email' && currentUser.email) {
      await SecureStore.deleteItemAsync(credentialsKey(currentUser.email.trim().toLowerCase())).catch(() => {});
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

    const email = user.email.trim().toLowerCase();
    const credsRaw = await SecureStore.getItemAsync(credentialsKey(email));
    if (!credsRaw) {
      throw new AuthError('USER_NOT_FOUND', 'No account found with this email.');
    }

    const { passwordHash, salt }: StoredCredentials = JSON.parse(credsRaw);
    const inputHash = await hashPassword(currentPassword, salt);
    if (inputHash !== passwordHash) {
      throw new AuthError('INVALID_CREDENTIALS', 'Current password is incorrect.');
    }

    const nextSalt = generateSalt();
    const nextHash = await hashPassword(nextPassword, nextSalt);
    const updatedCredentials: StoredCredentials = { passwordHash: nextHash, salt: nextSalt };
    await SecureStore.setItemAsync(credentialsKey(email), JSON.stringify(updatedCredentials));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricAvailable,
        biometricEnabled,
        pendingBiometricUser,
        signInWithApple,
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

