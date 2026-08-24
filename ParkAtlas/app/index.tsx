import { router } from 'expo-router';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';

export default function Index() {
  const { loading, user, signOut } = useAuth();

  async function continueWithoutAccount() {
    // Only sign out if a session actually exists — a signed-in user landing
    // here (e.g. via back-navigation) shouldn't be silently logged out.
    if (user) {
      await signOut();
    }
    router.replace('/(tabs)/home');
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.contentWrap}>
        <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>
          Find your next park with <Text style={styles.titleBrand}>ParkAtlas</Text>
        </Text>
        <Text style={styles.subtitle}>Sign in to sync your parks or continue without an account.</Text>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => router.push('/login')}>
          <Text style={styles.primaryBtnText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryLink} activeOpacity={0.75} onPress={() => { void continueWithoutAccount(); }}>
          <Text style={styles.secondaryLinkText}>Continue without an account</Text>
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
    color: C.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
