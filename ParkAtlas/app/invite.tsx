import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ActionSheetIOS, Alert, Share, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useVisitedParks } from '@/hooks/useVisitedParks';
import { useShareCard } from '@/hooks/useShareCard';
import { ShareCard } from '@/components/ShareCard';
import { PARKS } from '@/data/parksData';

// The parkatlas.io/invite/{code} deep link requires hosting/domain setup that isn't
// live yet, so invites share the store listing directly — it always works.
const APP_STORE_URL = 'https://apps.apple.com/app/id6760982981';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.parkatlas.mobile';

export default function InviteRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useAuth();
  const { recordInviteSent } = useFriends();
  const { visits, nationalParkCount } = useVisitedParks();
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  const inviterName = user?.firstName || user?.name?.split(/\s+/)[0] || '';
  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

  // Background for the invite card: the user's most recent national park (their photo if they added one).
  const latest = useMemo(() => {
    const national = visits.filter((v) => PARKS.some((p) => p.id === v.parkId));
    if (national.length === 0) return undefined;
    const newest = national[national.length - 1];
    const withPhoto = [...national].reverse().find((v) => v.photoUri);
    const park = PARKS.find((p) => p.id === (withPhoto ?? newest).parkId);
    return { parkId: park?.id, parkName: park?.name ?? newest.parkName, state: park?.state ?? '', photoUri: withPhoto?.photoUri };
  }, [visits]);

  const message = `${inviterName || 'A friend'} invited you to join ParkAtlas — track visits, hikes, camps, and road-trip stops across the National Parks.\n\n${storeUrl}`;
  const onShared = () => {
    void recordInviteSent(storeUrl);
    toast.success('Invite sent', { icon: 'paper-plane' });
  };
  const onShareError = () => toast.error("Couldn't create the invite card. Try again.");
  const storyShare = useShareCard({ message, format: 'story', onShared, onError: onShareError });
  const cardShare = useShareCard({ message, format: 'card', onShared, onError: onShareError });
  const busy = sharing || storyShare.sharing || cardShare.sharing;

  useEffect(() => {
    const code = String(params.code || '').trim();
    if (code) {
      router.replace(`/invite/${encodeURIComponent(code)}`);
      return;
    }
  }, [params.code, router]);

  async function shareLinkOnly() {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await Share.share({ title: 'Join me on ParkAtlas', message, url: storeUrl });
      if (result.action === Share.sharedAction) onShared();
    } catch {
      toast.error("Couldn't open the share sheet. Try again.");
    } finally {
      setSharing(false);
    }
  }

  function onShareInvite() {
    if (busy) return;
    if (!user?.id) {
      router.push('/login');
      return;
    }
    haptic.tap();
    const options = ['Share to Stories (9:16)', 'Share as card (3:4)', 'Share link only', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, title: 'Invite friends' },
        (i) => {
          if (i === 0) void storyShare.share();
          if (i === 1) void cardShare.share();
          if (i === 2) void shareLinkOnly();
        },
      );
      return;
    }
    Alert.alert('Invite friends', undefined, [
      { text: options[0], onPress: () => { void storyShare.share(); } },
      { text: options[1], onPress: () => { void cardShare.share(); } },
      { text: options[2], onPress: () => { void shareLinkOnly(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
            Send a ParkAtlas invite card with your park count on it. Friends who join can compare rings and plan trips with you.
          </Text>
          <TouchableOpacity style={styles.btn} activeOpacity={0.8} onPress={onShareInvite} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color={C.onPrimary} />
            ) : (
              <Text style={styles.btnText}>Share invite</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} activeOpacity={0.8} onPress={() => router.replace('/(tabs)/directory')}>
            <Text style={styles.btnGhostText}>Back to Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Off-screen cards captured by useShareCard */}
        <View style={styles.offscreen} pointerEvents="none">
          <ShareCard
            ref={storyShare.ref}
            variant="invite"
            format="story"
            parkId={latest?.parkId}
            parkName={latest?.parkName ?? ''}
            state={latest?.state ?? ''}
            photoUri={latest?.photoUri}
            nationalVisited={nationalParkCount}
            userName={inviterName || undefined}
          />
          <ShareCard
            ref={cardShare.ref}
            variant="invite"
            format="card"
            parkId={latest?.parkId}
            parkName={latest?.parkName ?? ''}
            state={latest?.state ?? ''}
            photoUri={latest?.photoUri}
            nationalVisited={nationalParkCount}
            userName={inviterName || undefined}
          />
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
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnGhostText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
});
