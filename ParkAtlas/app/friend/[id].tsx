import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { ParkAtlas as C } from '@/constants/theme';
import { ListItemSkeleton } from '@/components/ui/Skeleton';
import { FriendActivity, fetchFriendActivities, fetchUserProfile } from '@/utils/userDirectoryApi';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { haptic } from '@/utils/haptics';
import { PARKS } from '@/data/parksData';
import { MILESTONES, RANKS, TOTAL_NATIONAL_PARKS, rankForCount } from '@/utils/ranks';

const NATIONAL_IDS = new Set(PARKS.map((p) => p.id));

function formatVisitedDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FriendProfileScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    username?: string;
    avatar?: string;
    meta?: string;
    badge?: string;
  }>();

  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name?: string; username?: string; avatarUrl?: string } | null>(null);
  const { user } = useAuth();
  const { myFriends, requestedIds, incomingRequests, sendFriendRequest, acceptRequest, cancelRequest, unfollow } = useFriends();
  const toast = useToast();

  const isFriend = myFriends.some((f) => f.id === params.id);
  const isRequested = requestedIds.has(params.id);
  const incoming = incomingRequests.find((f) => f.id === params.id);
  const isSelf = user?.id === params.id;

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      if (!params.id) {
        if (active) setLoading(false);
        return;
      }

      try {
        const [items, stored] = await Promise.all([fetchFriendActivities([params.id]), fetchUserProfile(params.id)]);
        if (!active) return;
        setActivities(items.filter((item) => item.userId === params.id));
        if (stored) setProfile({ name: stored.name, username: stored.username, avatarUrl: stored.avatarUrl });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivities();

    return () => {
      active = false;
    };
  }, [params.id]);

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.dateVisited || 0).getTime() - new Date(a.dateVisited || 0).getTime()),
    [activities]
  );

  // Badges are derived from their public visits: rank ladder + park-count milestones reached.
  const nationalCount = useMemo(
    () => new Set(activities.map((a) => a.parkId).filter((id) => NATIONAL_IDS.has(id))).size,
    [activities],
  );
  const rank = rankForCount(nationalCount);
  const earnedRanks = RANKS.filter((r) => r.minParks > 0 && nationalCount >= r.minParks);
  const earnedMilestones = MILESTONES.filter((m) => nationalCount >= m);
  const fallbackAvatar = myFriends.find((f) => f.id === params.id)?.avatar;

  const displayName = profile?.name || params.name || myFriends.find((f) => f.id === params.id)?.name || 'Friend';
  const firstName = displayName.split(/\s+/)[0];
  const username = profile?.username || params.username;
  const displayUsername = params.meta || (username ? `@${username}` : '');
  const avatarUri = profile?.avatarUrl || params.avatar || fallbackAvatar;

  function onFollowPress() {
    if (!user?.id) {
      router.push('/login');
      return;
    }
    haptic.select();
    if (isFriend) {
      Alert.alert(`Unfollow ${firstName}?`, "You'll stop seeing each other's park activity.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfollow', style: 'destructive', onPress: () => { void unfollow(params.id); toast.info(`Unfollowed ${firstName}`, { silent: true }); } },
      ]);
      return;
    }
    if (isRequested) {
      void cancelRequest(params.id);
      toast.info('Request cancelled', { silent: true });
      return;
    }
    if (incoming) {
      void acceptRequest(incoming);
      toast.success(`You and ${firstName} are now following each other`);
      return;
    }
    void sendFriendRequest(params.id);
    toast.success(`Request sent to ${firstName}`, { silent: true });
  }

  const followLabel = isFriend ? 'Following' : isRequested ? 'Requested' : incoming ? 'Accept' : 'Follow';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.75} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
          <Text style={styles.name}>{displayName}</Text>
          {displayUsername ? <Text style={styles.username}>{displayUsername}</Text> : null}
          <View style={styles.rankPill}>
            <MaterialCommunityIcons name={rank.icon} size={14} color={C.onPrimary} />
            <Text style={styles.rankPillText}>{rank.title}</Text>
            <Text style={styles.rankPillCount}>· {nationalCount} of {TOTAL_NATIONAL_PARKS}</Text>
          </View>
          {!isSelf ? (
            <TouchableOpacity
              style={[styles.followBtn, (isFriend || isRequested) && styles.followBtnGhost]}
              activeOpacity={0.8}
              onPress={onFollowPress}
              accessibilityRole="button"
            >
              <Text style={[styles.followBtnText, (isFriend || isRequested) && styles.followBtnGhostText]}>{followLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!loading && (earnedRanks.length > 0 || earnedMilestones.length > 0) ? (
          <View style={styles.badgesCard}>
            <Text style={styles.badgesTitle}>Badges</Text>
            <View style={styles.badgeGrid}>
              {earnedRanks.map((r) => (
                <View key={r.id} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <MaterialCommunityIcons name={r.icon} size={22} color={C.primary} />
                  </View>
                  <Text style={styles.badgeLabel} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.badgeSub}>{r.minParks} {r.minParks === 1 ? 'park' : 'parks'}</Text>
                </View>
              ))}
              {earnedMilestones
                .filter((m) => !RANKS.some((r) => r.minParks === m))
                .map((m) => (
                  <View key={`m${m}`} style={styles.badge}>
                    <View style={[styles.badgeIcon, styles.badgeIconMilestone]}>
                      <Text style={styles.badgeNumber}>{m}</Text>
                    </View>
                    <Text style={styles.badgeLabel} numberOfLines={1}>{m} parks</Text>
                    <Text style={styles.badgeSub}>milestone</Text>
                  </View>
                ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionMeta}>{sortedActivities.length} logged</Text>
        </View>

        {loading ? (
          <View style={styles.skeletonList}>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </View>
        ) : null}

        {!loading && sortedActivities.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <MaterialCommunityIcons name="compass-outline" size={28} color={C.primary} />
            </View>
            <Text style={styles.stateTitle}>No adventures yet</Text>
            <Text style={styles.stateText}>{displayName} hasn&apos;t logged a park visit. Send a High-Five when they do.</Text>
          </View>
        ) : null}

        {!loading
          ? sortedActivities.map((activity) => {
              const visitedDate = formatVisitedDate(activity.dateVisited);
              return (
                <View key={`${activity.userId}_${activity.parkId}_${activity.dateVisited || activity.trailName || 'activity'}`} style={styles.activityCard}>
                  <View style={styles.activityIconWrap}>
                    <MaterialCommunityIcons name="pine-tree" size={18} color={C.primary} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.parkName}>{activity.parkName}</Text>
                    {activity.trailName ? <Text style={styles.trailName}>{activity.trailName}</Text> : null}
                    <View style={styles.activityMetaRow}>
                      {visitedDate ? <Text style={styles.activityMeta}>{visitedDate}</Text> : null}
                      {activity.distanceMiles ? (
                        <Text style={styles.activityMeta}>{`${activity.distanceMiles.toFixed(1)} mi`}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerHigh,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onSurface,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
    backgroundColor: C.surfaceContainerHighest,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: C.onSurface,
  },
  username: {
    marginTop: 4,
    fontSize: 15,
    color: C.onSurfaceVariant,
  },
  badge: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
  },
  rankPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  rankPillText: { color: C.onPrimary, fontSize: 12, fontWeight: '800' },
  rankPillCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  followBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  followBtnGhost: { backgroundColor: C.surfaceContainerHigh },
  followBtnText: { color: C.onPrimary, fontSize: 14, fontWeight: '800' },
  followBtnGhostText: { color: C.onSurface },
  badgesCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
    gap: 12,
  },
  badgesTitle: { fontSize: 16, fontWeight: '800', color: C.onSurface },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
  },
  badgeIconMilestone: { backgroundColor: C.surfaceContainerHigh },
  badgeNumber: { fontSize: 16, fontWeight: '800', color: C.primary },
  badgeLabel: { fontSize: 13, fontWeight: '700', color: C.onSurface },
  badgeSub: { fontSize: 11, color: C.onSurfaceVariant },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.onSurface,
  },
  sectionMeta: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  skeletonList: {
    gap: 8,
    paddingHorizontal: 4,
  },
  stateCard: {
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 24,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onSurface,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: C.onSurfaceVariant,
  },
  activityCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
  },
  activityBody: {
    flex: 1,
    gap: 4,
  },
  parkName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.onSurface,
  },
  trailName: {
    fontSize: 15,
    color: C.onSurface,
  },
  activityMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  activityMeta: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
});