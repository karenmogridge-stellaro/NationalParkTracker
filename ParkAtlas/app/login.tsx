import React, { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, documentId, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { useAuth, AuthError } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';
import { GOOGLE_SIGN_IN_ENABLED, GoogleSignInCancelled, promptGoogleSignIn } from '@/utils/googleSignIn';
import { consumePendingInviteCode, peekPendingInviteCode } from '@/utils/pendingInvite';
import { findPendingInviteCodeForContact } from '@/utils/inviteApi';
import { peekPendingAction, consumePendingAction } from '@/utils/pendingAction';
import { db } from '@/utils/firebase';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const {
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    unlockWithBiometrics,
    dismissBiometricPrompt,
    signInDev,
    biometricAvailable,
    biometricEnabled,
    pendingBiometricUser,
  } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const hasPendingInvite = Boolean(peekPendingInviteCode());

  async function hasPendingIncomingRequest(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const pendingReqSnap = await getDocs(
        query(
          collection(db, 'friend_requests'),
          where('toUserId', '==', userId),
          where('status', '==', 'pending'),
          limit(1)
        )
      );
      return !pendingReqSnap.empty;
    } catch {
      return false;
    }
  }

  async function resolveUserIdsFromEmailAuth(emailHint?: string): Promise<string[]> {
    const normalizedEmail = emailHint?.trim().toLowerCase();
    if (!normalizedEmail) return [];

    const ids = new Set<string>();
    const docIds = [encodeURIComponent(normalizedEmail), normalizedEmail];

    for (const docId of docIds) {
      try {
        const snap = await getDoc(doc(db, 'email_auth', docId));
        if (!snap.exists()) continue;
        const data = snap.data() as { userId?: unknown };
        if (typeof data.userId === 'string' && data.userId.trim()) {
          ids.add(data.userId.trim());
        }
      } catch {
        // Ignore individual lookup failures.
      }
    }

    return Array.from(ids);
  }

  async function resolveUserIdsForEmail(emailHint?: string): Promise<string[]> {
    const normalizedEmail = emailHint?.trim().toLowerCase();
    if (!normalizedEmail) return [];

    try {
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('email', '==', normalizedEmail),
          limit(10)
        )
      );
      return snap.docs.map((docSnap) => docSnap.id).filter(Boolean);
    } catch {
      return [];
    }
  }

  async function hasPendingIncomingRequestForEmail(emailHint?: string): Promise<boolean> {
    const normalizedEmail = emailHint?.trim().toLowerCase();
    if (!normalizedEmail) return false;

    try {
      const pendingReqSnap = await getDocs(
        query(
          collection(db, 'friend_requests'),
          where('status', '==', 'pending'),
          limit(120)
        )
      );

      const toUserIds = Array.from(
        new Set(
          pendingReqSnap.docs
            .map((snap) => snap.data()?.toUserId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      );

      // Batch profile lookups (10 per Firestore 'in' query) instead of one getDoc per
      // candidate — this was previously up to 120 sequential round trips on every login.
      const chunks: string[][] = [];
      for (let i = 0; i < toUserIds.length; i += 10) {
        chunks.push(toUserIds.slice(i, i + 10));
      }

      const snapshots = await Promise.all(
        chunks.map((chunk) =>
          getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))).catch(() => null)
        )
      );

      return snapshots.some((snapshot) =>
        snapshot?.docs.some((userSnap) => {
          const data = userSnap.data() as { email?: unknown };
          const userEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
          return userEmail === normalizedEmail;
        })
      );
    } catch {
      return false;
    }
  }

  async function routeAfterAuthSuccess(emailHint?: string, userIdHint?: string) {
    const fallbackEmailUserId = emailHint?.trim()
      ? `email_${emailHint.trim().toLowerCase()}`
      : undefined;
    const resolvedUserId = userIdHint || fallbackEmailUserId;

    let pendingInviteCode = consumePendingInviteCode();

    if (!pendingInviteCode && emailHint?.trim()) {
      try {
        pendingInviteCode = await findPendingInviteCodeForContact(emailHint.trim().toLowerCase());
      } catch {
        // Non-blocking fallback: route normally if invite lookup fails.
      }
    }

    if (pendingInviteCode) {
      router.replace(`/invite/${encodeURIComponent(pendingInviteCode)}`);
      return;
    }

    const candidateUserIds = Array.from(
      new Set(
        [
          ...(resolvedUserId ? [resolvedUserId] : []),
          ...(await resolveUserIdsFromEmailAuth(emailHint)),
          ...(await resolveUserIdsForEmail(emailHint)),
        ].filter(Boolean)
      )
    );

    for (const candidateUserId of candidateUserIds) {
      const hasPendingRequest = await hasPendingIncomingRequest(candidateUserId);
      if (hasPendingRequest) {
        router.replace('/(tabs)/directory?pendingIncoming=1');
        return;
      }
    }

    if (await hasPendingIncomingRequestForEmail(emailHint)) {
      router.replace('/(tabs)/directory?pendingIncoming=1');
      return;
    }

    const pendingAction = peekPendingAction();

    if (pendingAction?.type === 'follow') {
      // Keep action pending so directory screen can complete it and show confirmation.
      router.replace('/(tabs)/directory');
      return;
    }

    if (pendingAction?.type === 'viewProfile') {
      const action = consumePendingAction();
      if (action && action.type === 'viewProfile') {
        router.replace(`/friend/${encodeURIComponent(action.userId)}`);
        return;
      }
    }

    if (pendingAction?.type === 'keepExploring' || pendingAction?.type === 'scrollFeed') {
      consumePendingAction();
      router.replace('/(tabs)/home');
      return;
    }

    // High-five pending actions are resumed on Home feed after auth.
    router.replace('/(tabs)/home');
  }

  // ── Apple ──────────────────────────────────────────────────────────────────
  async function handleAppleSignIn() {
    setAppleLoading(true);
    setFieldErrors({});
    try {
      const signedIn = await signInWithApple();
      if (signedIn) await routeAfterAuthSuccess();
    } catch (e) {
      // Cancellations never reach here; anything else is a real failure worth telling the user about.
      setFieldErrors({
        general: e instanceof AuthError ? e.message : "Couldn't sign in with Apple. Please try again.",
      });
    } finally {
      setAppleLoading(false);
    }
  }
  // ── Google ─────────────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setFieldErrors({});
    try {
      const profile = await promptGoogleSignIn();
      await signInWithGoogle(profile);
      await routeAfterAuthSuccess(profile.email, `google_${profile.id}`);
    } catch (e) {
      if (e instanceof GoogleSignInCancelled) return;
      console.error('[login] Google sign-in error:', e);
      setFieldErrors({ general: "Couldn't sign in with Google. Please try again." });
    } finally {
      setGoogleLoading(false);
    }
  }
  // ── Email / Password ───────────────────────────────────────────────────────
  async function handleEmailSubmit() {
    setFieldErrors({});
    const errors: typeof fieldErrors = {};

    if (mode === 'signup' && !firstName.trim()) {
      errors.firstName = 'First name is required.';
    }
    if (mode === 'signup' && !lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }
    if (!email.trim()) {
      errors.email = 'Email is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (mode === 'signup' && password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setEmailLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const derivedEmailUserId = `email_${normalizedEmail}`;
      if (mode === 'signup') {
        await signUpWithEmail(email, password, firstName, lastName);
      } else {
        await signInWithEmail(email, password);
      }
      await routeAfterAuthSuccess(email, derivedEmailUserId);
    } catch (e) {
      if (e instanceof AuthError) {
        switch (e.code) {
          case 'INVALID_EMAIL':    setFieldErrors({ email: e.message });    break;
          case 'WEAK_PASSWORD':    setFieldErrors({ password: e.message }); break;
          case 'EMAIL_EXISTS':     setFieldErrors({ email: e.message });    break;
          case 'SERVICE_UNAVAILABLE':
            setFieldErrors({
              general: 'Cloud sign-in is temporarily unavailable. Please try again in a moment.',
            });
            break;
          case 'APPLE_SIGN_IN_REQUIRED':
            setFieldErrors({
              general: 'This email is tied to an Apple account. Tap Continue with Apple to sign in.',
            });
            break;
          case 'GOOGLE_SIGN_IN_REQUIRED':
            setFieldErrors({
              general: 'This email is tied to a Google account. Tap Continue with Google to sign in.',
            });
            break;
          case 'PASSWORD_NOT_SET':
            setFieldErrors({
              email: 'Account found, but no email password is set yet. Tap Sign up with this same email/password once to restore access.',
            });
            break;
          case 'USER_NOT_FOUND':
            setFieldErrors({
              email: mode === 'signin'
                ? 'No cloud account found for that email yet. If this account was created before the Firestore migration, tap Sign up with the same email/password once to restore access.'
                : e.message,
            });
            break;
          case 'INVALID_CREDENTIALS': setFieldErrors({ password: e.message }); break;
          default: setFieldErrors({ general: 'Something went wrong. Please try again.' });
        }
      } else {
        const message = e instanceof Error && e.message
          ? e.message
          : 'Something went wrong. Please try again.';
        setFieldErrors({ general: message });
      }
    } finally {
      setEmailLoading(false);
    }
  }

  // ── Face ID / Biometrics ───────────────────────────────────────────────────
  async function handleBiometricUnlock() {
    setBiometricLoading(true);
    try {
      const success = await unlockWithBiometrics();
      if (!success) {
        Alert.alert(
          'Face ID failed',
          'Could not verify your identity. Please sign in manually.',
        );
      } else {
        await routeAfterAuthSuccess(pendingBiometricUser?.email, pendingBiometricUser?.id);
      }
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleDevSignIn() {
    await signInDev();
    await routeAfterAuthSuccess(undefined, 'dev_user');
  }

  const showBiometricPrompt = pendingBiometricUser != null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.heroSection}>
        <SafeAreaView edges={['top']}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/images/parkatlas-logo.png')}
              style={styles.heroLogoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>ParkAtlas</Text>
          <Text style={styles.tagline}>
            Track every adventure.{'\n'}Discover every peak.
          </Text>
        </SafeAreaView>
      </View>

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.card}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ── Biometric lock banner ──────────────────────────────────────── */}
        {showBiometricPrompt && (
          <View style={styles.bioLockBanner}>
            <View style={styles.bioAvatarCircle}>
              <Ionicons name="person" size={32} color={C.primary} />
            </View>
            <Text style={styles.bioLockName}>
              Welcome back, {pendingBiometricUser!.name.split(' ')[0]}!
            </Text>
            <Text style={styles.bioLockSub}>Use Face ID to unlock your account</Text>

            <TouchableOpacity
              style={styles.bioUnlockBtn}
              onPress={handleBiometricUnlock}
              activeOpacity={0.85}
              disabled={biometricLoading}
            >
              {biometricLoading ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={22} color={C.onPrimary} />
                  <Text style={styles.bioUnlockText}>Unlock with Face ID</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={dismissBiometricPrompt} style={styles.switchAccountLink}>
              <Text style={styles.switchAccountText}>Sign in with a different account</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>or sign in manually</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        )}

        {/* ── Form header ───────────────────────────────────────────────── */}
        <Text style={styles.cardTitle}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Text>
        <Text style={styles.cardSubtitle}>
          {mode === 'signin'
            ? 'Track parks, trails and outings.'
            : 'Join to start tracking your adventures.'}
        </Text>

        {hasPendingInvite && (
          <View style={styles.pendingInviteBanner}>
            <Ionicons name="mail-open-outline" size={16} color={C.primary} />
            <Text style={styles.pendingInviteText}>Resuming your invite after sign in</Text>
          </View>
        )}

        {/* General error */}
        {!!fieldErrors.general && (
          <View style={styles.generalError}>
            <Ionicons name="alert-circle-outline" size={16} color="#c0392b" style={{ marginTop: 1 }} />
            <Text style={styles.generalErrorText}>{fieldErrors.general}</Text>
          </View>
        )}

        {/* ── Name (sign-up only) ────────────────────────────────────────── */}
        {mode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First name *</Text>
            <TextInput
              ref={firstNameRef}
              style={[styles.input, !!fieldErrors.firstName && styles.inputError]}
              placeholder="Jane"
              placeholderTextColor={C.outlineVariant}
              value={firstName}
              onChangeText={v => {
                setFirstName(v);
                setFieldErrors(e => ({ ...e, firstName: undefined }));
              }}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="given-name"
              textContentType="givenName"
              importantForAutofill="yes"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
            {!!fieldErrors.firstName && (
              <Text style={styles.errorText}>{fieldErrors.firstName}</Text>
            )}
          </View>
        )}

        {mode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last name *</Text>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, !!fieldErrors.lastName && styles.inputError]}
              placeholder="Smith"
              placeholderTextColor={C.outlineVariant}
              value={lastName}
              onChangeText={v => {
                setLastName(v);
                setFieldErrors(e => ({ ...e, lastName: undefined }));
              }}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="family-name"
              textContentType="familyName"
              importantForAutofill="yes"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {!!fieldErrors.lastName && (
              <Text style={styles.errorText}>{fieldErrors.lastName}</Text>
            )}
          </View>
        )}

        {/* ── Email ─────────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            ref={emailRef}
            style={[styles.input, !!fieldErrors.email && styles.inputError]}
            placeholder="you@example.com"
            placeholderTextColor={C.outlineVariant}
            value={email}
            onChangeText={v => {
              setEmail(v);
              setFieldErrors(e => ({ ...e, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          {!!fieldErrors.email && (
            <Text style={styles.errorText}>{fieldErrors.email}</Text>
          )}
        </View>

        {/* ── Password ──────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.passwordRow, !!fieldErrors.password && styles.inputError]}>
            <TextInput
              ref={passwordRef}
              style={styles.passwordInput}
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter your password'}
              placeholderTextColor={C.outlineVariant}
              value={password}
              onChangeText={v => {
                setPassword(v);
                setFieldErrors(e => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleEmailSubmit}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(s => !s)}
              style={styles.eyeBtn}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={C.outline}
              />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.password && (
            <Text style={styles.errorText}>{fieldErrors.password}</Text>
          )}
        </View>

        {/* ── Submit button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleEmailSubmit}
          activeOpacity={0.85}
          disabled={emailLoading}
        >
          {emailLoading ? (
            <ActivityIndicator size="small" color={C.onPrimary} />
          ) : (
            <Text style={styles.submitBtnText}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Apple ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.appleBtn}
          onPress={handleAppleSignIn}
          activeOpacity={0.8}
          disabled={appleLoading}
        >
          {appleLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#fff" style={styles.appleIcon} />
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Google ──────────────────────────────────────────────────────────────── */}
        {GOOGLE_SIGN_IN_ENABLED ? (
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
            disabled={googleLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={C.onSurface} />
            ) : (
              <>
                <Ionicons name="logo-google" size={19} color="#4285F4" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* ── Face ID button (if enrolled but not showing the lock banner) ─ */}
        {biometricAvailable && biometricEnabled && !showBiometricPrompt && (
          <TouchableOpacity
            style={styles.faceIdBtn}
            onPress={handleBiometricUnlock}
            activeOpacity={0.8}
            disabled={biometricLoading}
          >
            {biometricLoading ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <>
                <Ionicons name="scan-outline" size={20} color={C.primary} />
                <Text style={styles.faceIdBtnText}>Use Face ID</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── Toggle sign-in / sign-up ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            setMode(m => (m === 'signin' ? 'signup' : 'signin'));
            setFieldErrors({});
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.toggleLink}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>
        </TouchableOpacity>

        {/* ── Dev bypass ────────────────────────────────────────────────── */}
        {__DEV__ && (
          <TouchableOpacity style={styles.devBtn} onPress={handleDevSignIn} activeOpacity={0.7}>
            <Text style={styles.devBtnText}>Skip Sign In (Dev)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.legalText}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.primary,
  },

  /* Hero */
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
    paddingTop: 16,
  },
  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  heroLogoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 38,
    fontWeight: '900',
    color: C.onPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  /* Card scroll */
  cardScroll: {
    flex: 1,
  },
  card: {
    backgroundColor: C.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    gap: 10,
    flexGrow: 1,
  },

  /* Biometric lock banner */
  bioLockBanner: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bioAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bioLockName: {
    fontSize: 20,
    fontWeight: '700',
    color: C.onSurface,
    textAlign: 'center',
  },
  bioLockSub: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  bioUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  bioUnlockText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onPrimary,
  },
  switchAccountLink: {
    marginTop: 12,
    marginBottom: 4,
    padding: 4,
  },
  switchAccountText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* Card header */
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 4,
  },

  /* Form inputs */
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: C.onSurface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#c0392b',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: C.onSurface,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#c0392b',
    marginTop: 2,
  },
  generalError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fef0ef',
    borderRadius: 10,
    padding: 12,
  },
  generalErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#c0392b',
    lineHeight: 18,
  },
  pendingInviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#e8f1ec',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingInviteText: {
    flex: 1,
    fontSize: 13,
    color: '#1b4332',
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Submit */
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onPrimary,
    letterSpacing: 0.2,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.outlineVariant,
  },
  dividerLabel: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    fontWeight: '500',
  },

  /* Apple */
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 15,
  },
  appleIcon: {
    marginBottom: 1,
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  /* Google */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    paddingVertical: 14,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
  },

  /* Face ID */
  faceIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: 'transparent',
  },
  faceIdBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
  },

  /* Toggle */
  toggleRow: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  toggleText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
  },
  toggleLink: {
    color: C.primary,
    fontWeight: '700',
  },

  /* Dev bypass */
  devBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 2,
  },
  devBtnText: {
    fontSize: 13,
    color: C.outline,
    fontStyle: 'italic',
  },

  /* Legal */
  legalText: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
});

