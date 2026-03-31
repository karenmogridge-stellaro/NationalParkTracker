import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { AUTH_USER_KEY, BIOMETRIC_ENABLED_KEY, credentialsKey } from '@/constants/authConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'apple' | 'email';
}

interface StoredCredentials {
  passwordHash: string;
  salt: string;
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
  updateProfile: (name: string, avatarUrl?: string) => Promise<void>;
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
  updateProfile: async () => {},
});

// ─── Password helpers ─────────────────────────────────────────────────────────

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  Crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
    setPendingBiometricUser(null);
    setUser(authUser);
  }

  // ── Update Profile ────────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (name: string, avatarUrl?: string) => {
    if (!user) return;
    const updated: AuthUser = {
      ...user,
      name: name.trim(),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
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

      const firstName = credential.fullName?.givenName ?? '';
      const lastName = credential.fullName?.familyName ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      const authUser: AuthUser = {
        id: `apple_${credential.user}`,
        name: fullName || (isSameAppleUser ? cached!.name : 'Park Explorer'),
        email: credential.email ?? (isSameAppleUser ? cached!.email : ''),
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
        updateProfile,
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

