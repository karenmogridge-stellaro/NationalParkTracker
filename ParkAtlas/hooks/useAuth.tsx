import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { AUTH_USER_KEY } from '@/constants/authConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'apple';
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the persisted session is being loaded from SecureStore */
  loading: boolean;
  /** Launches the native Apple Sign In sheet (iOS only) */
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithApple: async () => {},
  signOut: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Load persisted session on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch {
        // No stored session — first launch or SecureStore unavailable
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Sign-in methods ───────────────────────────────────────────────────────────

  const signInWithApple = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Apple only provides name/email on the VERY FIRST sign-in per device.
      // If we already have a stored Apple user with the same ID, keep the cached name/email.
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
      // ERR_REQUEST_CANCELED = user tapped cancel; not an error worth logging loudly
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[useAuth] Apple sign-in error:', e);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    setUser(null);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  async function persistUser(authUser: AuthUser) {
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
