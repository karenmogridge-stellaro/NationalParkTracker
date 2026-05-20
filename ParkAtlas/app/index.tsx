import { router } from 'expo-router';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ParkAtlas as C } from '@/constants/theme';

export default function Index() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Welcome to ParkAtlas</Text>
      <Text style={styles.subtitle}>Sign in to sync your profile, or continue without an account.</Text>

      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => router.push('/login')}>
        <Text style={styles.primaryBtnText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={() => router.replace('/(tabs)/home')}>
        <Text style={styles.secondaryBtnText}>Continue Without Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    fontWeight: '700',
    color: C.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
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
  secondaryBtn: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
});
