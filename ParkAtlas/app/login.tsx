import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';

export default function LoginScreen() {
  const { signInWithApple } = useAuth();
  const [appleLoading, setAppleLoading] = useState(false);

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

  return (
    <View style={styles.root}>
      {/* ── Hero area ──────────────────────────────────────────────────── */}
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

      {/* ── Sign-in card ────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Get started</Text>
        <Text style={styles.cardSubtitle}>
          Sign in to track parks, trails and outings.
        </Text>

        {/* Apple */}
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

        <Text style={styles.legalText}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 40,
    fontWeight: '900',
    color: C.onPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  /* Card */
  card: {
    backgroundColor: C.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    gap: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    marginBottom: 8,
    lineHeight: 20,
  },
  /* Apple button */
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
  /* Legal */
  legalText: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
