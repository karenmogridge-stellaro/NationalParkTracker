import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth, AuthError } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const {
    signInWithApple,
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // ── Apple ──────────────────────────────────────────────────────────────────
  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch {
      // Cancellations are silent; errors already logged in useAuth
    } finally {
      setAppleLoading(false);
    }
  }

  // ── Email / Password ───────────────────────────────────────────────────────
  async function handleEmailSubmit() {
    setFieldErrors({});
    const errors: typeof fieldErrors = {};

    if (mode === 'signup' && !name.trim()) {
      errors.name = 'Name is required.';
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
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e) {
      if (e instanceof AuthError) {
        switch (e.code) {
          case 'INVALID_EMAIL':    setFieldErrors({ email: e.message });    break;
          case 'WEAK_PASSWORD':    setFieldErrors({ password: e.message }); break;
          case 'EMAIL_EXISTS':     setFieldErrors({ email: e.message });    break;
          case 'USER_NOT_FOUND':   setFieldErrors({ email: e.message });    break;
          case 'INVALID_CREDENTIALS': setFieldErrors({ password: e.message }); break;
          default: setFieldErrors({ general: 'Something went wrong. Please try again.' });
        }
      } else {
        setFieldErrors({ general: 'Something went wrong. Please try again.' });
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
      }
    } finally {
      setBiometricLoading(false);
    }
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
            <MaterialCommunityIcons name="pine-tree" size={52} color={C.onPrimary} />
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
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              style={[styles.input, !!fieldErrors.name && styles.inputError]}
              placeholder="Jane Smith"
              placeholderTextColor={C.outlineVariant}
              value={name}
              onChangeText={v => {
                setName(v);
                setFieldErrors(e => ({ ...e, name: undefined }));
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {!!fieldErrors.name && (
              <Text style={styles.errorText}>{fieldErrors.name}</Text>
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
          <TouchableOpacity style={styles.devBtn} onPress={signInDev} activeOpacity={0.7}>
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
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
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

