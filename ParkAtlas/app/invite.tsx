import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';

// The parkatlas.app/invite/{code} deep link requires hosting/domain setup that isn't
// live yet, so invites share the store listing directly — it always works.
const APP_STORE_URL = 'https://apps.apple.com/app/id6760982981';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.parkatlas.mobile';

export default function InviteRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useAuth();
  const { recordInviteSent } = useFriends();
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const code = String(params.code || '').trim();
    if (code) {
      router.replace(`/invite/${encodeURIComponent(code)}`);
      return;
    }
  }, [params.code, router]);

  async function onShareInvite() {
    if (sharing) return;

    if (!user?.id) {
      router.push('/login');
      return;
    }

    setSharing(true);
    try {
      const inviterName = user.firstName || user.name || 'A friend';
      const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

      await Share.share({
        title: 'Join me on ParkAtlas',
        message: `${inviterName} invited you to join ParkAtlas — track visits, hikes, camps, and road-trip stops across the National Parks.\n\n${storeUrl}`,
        url: storeUrl,
      });

      await recordInviteSent(storeUrl);
    } catch {
      Alert.alert('Unable to share invite', 'Please try again.');
    } finally {
      setSharing(false);
    }
  }

  if (!params.code) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.wrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-add-outline" size={28} color={C.primary} />
          </View>
          <Text style={styles.title}>Invite friends</Text>
          <Text style={styles.body}>
            Share your ParkAtlas invite link and grow your connections.
          </Text>
          <TouchableOpacity style={styles.btn} activeOpacity={0.8} onPress={() => { void onShareInvite(); }} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator size="small" color={C.onPrimary} />
            ) : (
              <Text style={styles.btnText}>Share invite link</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)/directory')}>
            <Text style={styles.btnText}>Back to Friends</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf2ee',
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
