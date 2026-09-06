import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityFeedCard } from '@/components/ActivityFeedCard';
import { LoginGateSheet } from '@/components/LoginGateSheet';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { haptic } from '@/utils/haptics';
import { setPendingAction, type PendingAction } from '@/utils/pendingAction';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { ParkAtlas as C } from '@/constants/theme';
import { acceptInvite, createFriendConnection, getInviteByCode, InviteAlreadyAcceptedError, InviteRecord } from '@/utils/inviteApi';
import { db } from '@/utils/firebase';
import { setPendingInviteCode } from '@/utils/pendingInvite';
import { fetchFriendActivities, FriendActivity } from '@/utils/userDirectoryApi';

function formatVisitedDate(value?: string): string {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type PreviewActivity = FriendActivity & {
  displayImageUri: string;
  isHero?: boolean;
};

export default function InviteByCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteCode?: string }>();
  const { user } = useAuth();
  const { myFriends } = useFriends();
  const toast = useToast();
  const inviteCode = String(params.inviteCode || '').trim();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviterActivities, setInviterActivities] = useState<FriendActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [highFivedIds, setHighFivedIds] = useState<Set<string>>(new Set());
  const [gateVisible, setGateVisible] = useState(false);
  const [gateAction, setGateAction] = useState<PendingAction | null>(null);

  const inviteTitle = useMemo(() => {
    if (!invite) return 'Invite expired';
    return `${invite.inviterName || 'A friend'} invited you to ParkAtlas`;
  }, [invite]);

  const alreadyConnected = useMemo(() => {
    if (!invite || !user?.id) return false;
    if (!invite.inviterUserId) return false;
    if (invite.inviterUserId === user.id) return true;
    return myFriends.some((friend) => friend.id === invite.inviterUserId);
  }, [invite, myFriends, user?.id]);

  const showConnectedState = useMemo(
    () => !!invite && (alreadyConnected || invite.status === 'accepted' || !!successMessage),
    [alreadyConnected, invite, successMessage]
  );

  const previewActivities = useMemo<PreviewActivity[]>(() => {
    if (!invite) return [];

    const realImageActivities = inviterActivities.filter((activity) => !!activity.photoUri);

    if (realImageActivities.length === 0) return [];

    return realImageActivities.slice(0, 2).map((activity, index) => ({
      ...activity,
      displayImageUri: activity.photoUri || '',
      isHero: index === 0,
    }));
  }, [invite, inviterActivities]);

  async function handleHighFive(activityKey: string, eventId: string, eventOwnerUid: string, displayName: string): Promise<void> {
    if (!user?.id) {
      const action: PendingAction = {
        type: 'highFive',
        displayName,
        eventId,
        eventOwnerUid,
      };
      setPendingAction(action);
      setGateAction(action);
      setGateVisible(true);
      return;
    }

    if (!eventId || !eventOwnerUid || eventOwnerUid === user.id) return;
    if (highFivedIds.has(activityKey)) return;

    setHighFivedIds((prev) => new Set(prev).add(activityKey));

    try {
      await setDoc(
        doc(db, 'kudos', `${eventId}__${user.id}`),
        {
          eventId,
          fromUid: user.id,
          toUid: eventOwnerUid,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(db, 'activity'), {
        toUid: eventOwnerUid,
        type: 'kudos_received',
        fromUid: user.id,
        eventId,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Keep the optimistic UI state; notification writes are best-effort.
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      if (!inviteCode) {
        setLoading(false);
        return;
      }

      try {
        const found = await getInviteByCode(inviteCode);
        if (!active) return;
        setInvite(found);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInvite();
    return () => {
      active = false;
    };
  }, [inviteCode]);

  useEffect(() => {
    let active = true;

    async function loadInviterActivity() {
      if (!showConnectedState || !invite?.inviterUserId) {
        if (active) {
          setInviterActivities([]);
          setActivitiesLoading(false);
        }
        return;
      }

      setActivitiesLoading(true);
      try {
        const items = await fetchFriendActivities([invite.inviterUserId]);
        if (!active) return;
        setInviterActivities(items.filter((item) => item.userId === invite.inviterUserId).slice(0, 8));
      } finally {
        if (active) setActivitiesLoading(false);
      }
    }

    void loadInviterActivity();
    return () => {
      active = false;
    };
  }, [showConnectedState, invite?.inviterUserId]);

  async function onAcceptInvite() {
    if (!invite) return;

    if (!user?.id) {
      setPendingInviteCode(invite.inviteCode);
      router.replace('/login');
      return;
    }

    if (alreadyConnected || invite.status === 'accepted') {
      router.replace('/(tabs)/directory');
      return;
    }

    if (!invite.inviterUserId || invite.inviterUserId === user.id) {
      toast.error("This invite can't be accepted on this account");
      return;
    }

    setAccepting(true);
    try {
      // Accept first: it's the guarded step, so a losing racer bails out here
      // instead of creating a friendship connection that shouldn't exist.
      await acceptInvite(invite.inviteCode, user.id);
      await createFriendConnection(invite.inviterUserId, user.id);
      setInvite((prev) => (prev ? { ...prev, status: 'accepted', acceptedByUserId: user.id, acceptedAt: Date.now() } : prev));
      setSuccessMessage('Invite accepted ✅');
      haptic.success();
    } catch (e) {
      if (e instanceof InviteAlreadyAcceptedError) {
        toast.info('This invite was already accepted');
        router.replace('/(tabs)/directory');
        return;
      }
      toast.error("Couldn't accept the invite. Try again.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../../assets/images/parkatlas-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {loading ? (
          <>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.body}>Loading invite...</Text>
          </>
        ) : !invite ? (
          <>
            <Text style={styles.title}>Invite expired</Text>
            <Text style={styles.subtitle}>Track parks. Share adventures.</Text>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={() => router.replace('/login')}>
              <Text style={styles.secondaryText}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </>
        ) : showConnectedState ? (
          <>
            <Text style={styles.title}>You&apos;re now connected with {invite.inviterName} ✅</Text>
            <Text style={styles.subtitle}>Start with {invite.inviterName}&apos;s recent park</Text>

            {activitiesLoading ? (
              <View style={styles.feedSection}>
                <FeedCardSkeleton />
              </View>
            ) : previewActivities.length > 0 ? (
              <View style={styles.feedSection}>
                {previewActivities.map((activity) => {
                  const activityKey = activity.visitId || `${activity.userId}_${activity.parkId}_${activity.dateVisited || activity.trailName || 'activity'}`;
                  const eventId = `visit_${activity.userId}_${activity.visitId || `${activity.parkId}_${activity.dateVisited || ''}`}`;
                  return (
                    <ActivityFeedCard
                      key={activityKey}
                      cardKey={activityKey}
                      imageUri={activity.displayImageUri}
                      parkName={activity.parkName}
                      trailName={activity.trailName}
                      dateLabel={formatVisitedDate(activity.dateVisited)}
                      actorLabel={invite ? `${invite.inviterName} visited` : undefined}
                      variant={activity.isHero ? 'hero' : 'standard'}
                      canHighFive
                      isHighFived={highFivedIds.has(activityKey)}
                      onHighFive={() => { void handleHighFive(activityKey, eventId, activity.userId, invite?.inviterName || 'them'); }}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Be the first to share your adventure</Text>
                <TouchableOpacity style={styles.emptyStateBtn} activeOpacity={0.85} onPress={() => router.replace('/(tabs)/explore')}>
                  <Text style={styles.emptyStateBtnText}>Add your first park</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.btn}
              activeOpacity={0.85}
              onPress={() => {
                if (!user?.id) {
                  const action: PendingAction = { type: 'keepExploring' };
                  setPendingAction(action);
                  setGateAction(action);
                  setGateVisible(true);
                  return;
                }
                router.replace('/(tabs)/home');
              }}
            >
              <Text style={styles.btnText}>Keep exploring</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)/directory')}>
              <Text style={styles.secondaryText}>Find more friends</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>{inviteTitle}</Text>
            <Text style={styles.subtitle}>Track parks. Share adventures.</Text>
            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : null}
            {alreadyConnected ? (
              <Text style={styles.acceptedText}>Already connected</Text>
            ) : invite.status === 'accepted' ? (
              <Text style={styles.acceptedText}>Already connected</Text>
            ) : (
              <TouchableOpacity style={styles.btn} activeOpacity={0.85} disabled={accepting} onPress={() => { void onAcceptInvite(); }}>
                {accepting ? <ActivityIndicator size="small" color={C.onPrimary} /> : <Text style={styles.btnText}>Accept Invite</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (!user?.id) {
                  setPendingInviteCode(invite.inviteCode);
                  router.replace('/login');
                } else {
                  router.replace('/(tabs)/directory');
                }
              }}
            >
              <Text style={styles.secondaryText}>
                {user?.id ? 'Find more friends' : 'Already have an account? Log in'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </SafeAreaView>

      {/* Login gate – overlays current context, then routes to auth on primary CTA */}
      <LoginGateSheet
        visible={gateVisible}
        action={gateAction}
        onLogin={() => {
          setGateVisible(false);
          router.push('/login');
        }}
        onDismiss={() => setGateVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  wrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 2,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: C.onSurfaceVariant,
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
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  btnText: {
    color: C.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  secondaryText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  acceptedText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  successText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  feedSection: {
    gap: 10,
    width: '100%',
  },
  feedCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 132,
    borderWidth: 1,
    borderColor: '#dbe4dc',
  },
  feedCardHero: {
    minHeight: 168,
  },
  feedCardStandard: {
    minHeight: 132,
  },
  feedCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  feedCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 27, 20, 0.45)',
  },
  feedCardBody: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 4,
  },
  feedCardBodyHero: {
    paddingTop: 18,
    paddingBottom: 14,
  },
  feedCardTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: '#fff',
    fontWeight: '800',
  },
  feedCardTrail: {
    fontSize: 14,
    color: '#f2f7f3',
    fontWeight: '600',
  },
  feedCardMeta: {
    fontSize: 12,
    color: '#e8f2eb',
  },
  highFiveBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  highFiveBtnActive: {
    backgroundColor: 'rgba(34, 139, 72, 0.92)',
    borderColor: 'rgba(34, 139, 72, 0.92)',
  },
  highFiveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  highFiveBtnTextActive: {
    color: '#fff',
  },
  stateCard: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#f7f8f5',
    borderWidth: 1,
    borderColor: '#e1e6dc',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyStateBtn: {
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyStateBtnText: {
    color: C.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
