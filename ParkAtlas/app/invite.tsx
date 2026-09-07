import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
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

// parkatlas.io/get redirects to the store listing (see web/vercel.json) and reads better in a text.
const INVITE_URL = 'https://parkatlas.io/get';

export default function InviteRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { user } = useAuth();
  const { recordInviteSent } = useFriends();
  const { visits, nationalParkCount } = useVisitedParks();
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  const inviterName = user?.firstName || user?.name?.split(/\s+/)[0] || '';
  const storeUrl = INVITE_URL;

  // Background for the invite card: the user's most recent national park (their photo if they added one).
  const latest = useMemo(() => {
    const national = visits.filter((v) => PARKS.some((p) => p.id === v.parkId));
    if (national.length === 0) return undefined;
    const newest = national[national.length - 1];
    const withPhoto = [...national].reverse().find((v) => v.photoUri);
    const park = PARKS.find((p) => p.id === (withPhoto ?? newest).parkId);
    return { parkId: park?.id, parkName: park?.name ?? newest.parkName, state: park?.state ?? '', photoUri: withPhoto?.photoUri };
  }, [visits]);

  const who = inviterName || 'A friend';
  const message = nationalParkCount > 0
    ? `${who}'s at ${nationalParkCount} of 63 national parks and wants you on ParkAtlas — log your visits, compare rings, and plan the next trip together.\n\n${storeUrl}`
    : `${who} invited you to join ParkAtlas — track visits, hikes, camps, and road-trip stops across all 63 national parks.\n\n${storeUrl}`;
  const onShared = () => {
    void recordInviteSent(storeUrl);
    toast.success('Invite sent', { icon: 'paper-plane' });
  };
  const onShareError = () => toast.error("Couldn't create the invite card. Try again.");
  // Card + link go out together so the recipient always has a tap-to-install path.
  const cardShare = useShareCard({ message, format: 'card', includeMessage: true, onShared, onError: onShareError });
  const busy = sharing || cardShare.sharing;

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
    void cardShare.share();
  }

  function onShareLink() {
    if (busy) return;
    if (!user?.id) {
      router.push('/login');
      return;
    }
    haptic.tap();
    void shareLinkOnly();
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
            Send a ParkAtlas invite card with your park count on it, plus a link to the app. Friends who join can compare rings and plan trips with you.
          </Text>
          <TouchableOpacity style={styles.btn} activeOpacity={0.8} onPress={onShareInvite} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color={C.onPrimary} />
            ) : (
              <Text style={styles.btnText}>Share invite</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} activeOpacity={0.8} onPress={onShareLink} disabled={busy}>
            <Text style={styles.btnGhostText}>Just send the App Store link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} activeOpacity={0.8} onPress={() => router.replace('/(tabs)/directory')}>
            <Text style={styles.btnGhostText}>Back to Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Off-screen card captured by useShareCard */}
        <View style={styles.offscreen} pointerEvents="none">
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
