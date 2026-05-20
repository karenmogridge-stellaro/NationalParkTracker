import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParkAtlas as C } from '@/constants/theme';

export default function InviteRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/(tabs)/directory');
    }, 800);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <ActivityIndicator size="small" color={C.primary} />
        <Text style={styles.title}>Invite Link Opened</Text>
        <Text style={styles.body}>
          {params.code
            ? `Invite code: ${String(params.code)}`
            : 'No invite code was provided.'}
        </Text>
        <TouchableOpacity style={styles.btn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)/directory')}>
          <Text style={styles.btnText}>Continue to Friends</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnText: {
    color: C.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
