import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';
import { Onboarding } from '@/components/Onboarding';

const ONBOARDING_SEEN_FILE = `${FileSystem.documentDirectory}onboarding_seen.json`;

export default function Index() {
  const { loading, user, signOut } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    FileSystem.getInfoAsync(ONBOARDING_SEEN_FILE)
      .then((info) => setOnboardingSeen(info.exists))
      .catch(() => setOnboardingSeen(true));
  }, []);

  async function markOnboardingSeen() {
    setOnboardingSeen(true);
    await FileSystem.writeAsStringAsync(ONBOARDING_SEEN_FILE, '1').catch(() => {});
  }

  async function continueWithoutAccount() {
    await markOnboardingSeen();
    // Only sign out if a session actually exists — a signed-in user landing
    // here (e.g. via back-navigation) shouldn't be silently logged out.
    if (user) {
      await signOut();
    }
    router.replace('/(tabs)/home');
  }

  async function goToLogin() {
    await markOnboardingSeen();
    router.push('/login');
  }

  if (loading || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // Returning signed-in users skip the launch screen entirely.
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (!onboardingSeen) {
    return (
      <Onboarding
        onSignIn={() => { void goToLogin(); }}
        onGuest={() => { void continueWithoutAccount(); }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.contentWrap}>
        <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>
          Find your next park with <Text style={styles.titleBrand}>ParkAtlas</Text>
        </Text>
        <Text style={styles.subtitle}>Sign in to sync your parks across devices and connect with friends.</Text>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => { void goToLogin(); }}>
          <Text style={styles.primaryBtnText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryLink} activeOpacity={0.75} onPress={() => { void continueWithoutAccount(); }}>
          <Text style={styles.secondaryLinkText}>Continue as a guest</Text>
          <Text style={styles.secondaryHint}>Visits save on this device only</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  contentWrap: {
    marginTop: '14%',
  },
  logo: {
    width: 136,
    height: 136,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    fontWeight: '700',
    color: C.onSurface,
    textAlign: 'center',
  },
  titleBrand: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 15,
    lineHeight: 21,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onPrimary,
  },
  secondaryLink: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
  },
  secondaryHint: {
    marginTop: 2,
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
});
