import React, { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { useStravaData } from '@/hooks/useStravaData';
import { useVisitedParks, ParkVisit } from '@/hooks/useVisitedParks';
import { useFriends } from '@/hooks/useFriends';
import { LogOutingSheet } from '../../components/LogOutingSheet';
import { AppDrawer } from '@/components/AppDrawer';
import { useAuth } from '@/hooks/useAuth';
import { StravaActivity } from '@/hooks/useStrava';
import { PARKS } from '@/data/parksData';
import { STATE_PARKS } from '@/data/stateParksData';
import { fetchFriendActivities, FriendActivity } from '@/utils/userDirectoryApi';

const SEASON_MONTHS = [
  { label: 'APR', month: 3 },
  { label: 'MAY', month: 4 },
  { label: 'JUN', month: 5 },
  { label: 'JUL', month: 6 },
  { label: 'AUG', month: 7 },
  { label: 'SEP', month: 8 },
] as const;

const ADVENTURE_IMAGES = [
  'https://images.unsplash.com/photo-1601758261160-ecf8f9f4a4ea?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1508261305438-4f788f2f9d29?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
];

const STAT_RING_TRACK = '#D8D8D8';
const STAT_RING_PROGRESS = '#1F4D3A';

function fullMonthYear(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function firstName(name?: string): string {
  if (!name || !name.trim()) return 'Explorer';
  return name.trim().split(/\s+/)[0];
}

function imageForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ADVENTURE_IMAGES[hash % ADVENTURE_IMAGES.length];
}

type FeedItem =
  | { type: 'strava'; data: StravaActivity }
  | { type: 'manual'; data: ParkVisit }
  | { type: 'friend'; data: FriendActivity & { userName: string } };

type CommunityMode = 'mine' | 'friends';

type AdventureCardItem = {
  key: string;
  title: string;
  subtitle: string;
  distance: string;
  imageUri: string;
  tag: string;
  onPress?: () => void;
};

function StatProgress({ progress, value }: { progress: number; value: string }) {
  const pct = Math.max(0, Math.min(1, progress));
  const rotation = `${pct * 360}deg`;
  return (
    <View style={styles.statProgressWrap}>
      <View style={styles.statProgressTrack} />
      {pct > 0 ? (
        <View
          style={[
            styles.statProgressFill,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        />
      ) : null}
      <View style={styles.statProgressCenter}>
        <Text style={styles.statProgressText}>{value}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { activities, visitedParks, parkForActivity } = useStravaData();
  const { visits, removeVisit } = useVisitedParks();
  const { user } = useAuth();
  const { myFriends } = useFriends();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ParkVisit | null>(null);
  const [communityMode, setCommunityMode] = useState<CommunityMode>('mine');
  const [friendActivities, setFriendActivities] = useState<(FriendActivity & { userName: string })[]>([]);

  React.useEffect(() => {
    if (communityMode === 'friends' && myFriends.length > 0) {
      fetchFriendActivities(myFriends.map((f) => f.id)).then((activities) => {
        const enriched = activities.map((a) => ({
          ...a,
          userName: myFriends.find((f) => f.id === a.userId)?.name || a.userName,
        }));
        setFriendActivities(enriched);
      });
      return;
    }

    setFriendActivities([]);
  }, [communityMode, myFriends]);

  const parkById = useMemo(() => {
    const map = new Map<string, (typeof PARKS)[number] | (typeof STATE_PARKS)[number]>();
    PARKS.forEach((park) => map.set(park.id, park));
    STATE_PARKS.forEach((park) => map.set(park.id, park));
    return map;
  }, []);

  const nationalVisited = useMemo(() => {
    // Only count visits to national parks (PARKS dataset)
    const nationalIds = new Set(PARKS.map((p) => p.id));
    const visitedNationalIds = new Set(visitedParks.filter((p) => nationalIds.has(p.id)).map((p) => p.id));
    visits.forEach((v) => { if (nationalIds.has(v.parkId)) visitedNationalIds.add(v.parkId); });
    return visitedNationalIds.size;
  }, [visitedParks, visits]);

  const stateVisited = useMemo(() => {
    // Only count visits to state parks (STATE_PARKS dataset)
    const stateIds = new Set(STATE_PARKS.map((p) => p.id));
    const visitedStateIds = new Set<string>();
    visits.forEach((v) => { if (stateIds.has(v.parkId)) visitedStateIds.add(v.parkId); });
    return visitedStateIds.size;
  }, [visits]);

  const seasonalMiles = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const mileageByMonth = new Map<number, number>();
    const roundMiles = (value: number) => Math.round(value * 10) / 10;
    const dateForVisit = (visit: ParkVisit): Date => {
      if (visit.dateVisited) {
        const explicit = new Date(visit.dateVisited);
        if (!Number.isNaN(explicit.getTime())) return explicit;
      }

      // Fall back to timestamp embedded in visitId: <parkId>_<epochMs>
      const maybeTs = Number(String(visit.visitId || '').split('_').pop());
      if (Number.isFinite(maybeTs) && maybeTs > 0) {
        const fromId = new Date(maybeTs);
        if (!Number.isNaN(fromId.getTime())) return fromId;
      }

      return new Date();
    };

    SEASON_MONTHS.forEach(({ month }) => mileageByMonth.set(month, 0));

    activities.forEach((activity) => {
      const date = new Date(activity.start_date);
      if (date.getFullYear() !== currentYear) return;
      if (!mileageByMonth.has(date.getMonth())) return;
      const miles = (activity.distance ?? 0) / 1609.34;
      if (!Number.isFinite(miles) || miles <= 0) return;
      mileageByMonth.set(date.getMonth(), (mileageByMonth.get(date.getMonth()) ?? 0) + miles);
    });

    visits.forEach((visit) => {
      const date = dateForVisit(visit);
      if (date.getFullYear() !== currentYear) return;
      if (!mileageByMonth.has(date.getMonth())) return;
      const miles = visit.distanceMiles ?? 0;
      if (!Number.isFinite(miles) || miles <= 0) return;
      mileageByMonth.set(date.getMonth(), (mileageByMonth.get(date.getMonth()) ?? 0) + miles);
    });

    return SEASON_MONTHS.map(({ label, month }) => ({
      label,
      month,
      miles: roundMiles(mileageByMonth.get(month) ?? 0),
    }));
  }, [activities, visits]);

  const seasonalTotal = useMemo(
    () => seasonalMiles.reduce((sum, m) => sum + m.miles, 0),
    [seasonalMiles]
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    const strava: FeedItem[] = activities.slice(0, 10).map((a) => ({ type: 'strava', data: a }));
    const manual: FeedItem[] = visits.slice(0, 10).map((v) => ({ type: 'manual', data: v }));

    return [...strava, ...manual]
      .sort((a, b) => {
        const dateA = a.type === 'strava' ? a.data.start_date : (a.data.dateVisited || '1970-01-01');
        const dateB = b.type === 'strava' ? b.data.start_date : (b.data.dateVisited || '1970-01-01');
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 8);
  }, [activities, visits]);

  const displayedFeed = useMemo(() => {
    if (communityMode === 'mine') return feedItems;
    // In friends mode, convert friend activities to feed items
    return friendActivities
      .map((activity) => ({
        type: 'friend' as const,
        data: activity,
      }))
      .sort((a, b) => {
        const dateA = a.data.dateVisited || '1970-01-01';
        const dateB = b.data.dateVisited || '1970-01-01';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 8);
  }, [communityMode, feedItems, friendActivities]);

  const onCardPress = useCallback((item: FeedItem) => {
    if (item.type !== 'manual') return;

    const visit = item.data;
    Alert.alert(
      visit.trailName || visit.parkName,
      'What would you like to do?',
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingVisit(visit);
            setSheetVisible(true);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete Entry', `Remove "${visit.trailName || visit.parkName}" from your log?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => removeVisit(visit.visitId) },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [removeVisit]);

  const fallbackCards = useMemo<AdventureCardItem[]>(() => [
    {
      key: 'fallback_zion',
      title: 'Zion',
      subtitle: 'Utah · May 2024',
      distance: '24.5 mi',
      imageUri: imageForKey('fallback_zion'),
      tag: 'Sarah visited',
    },
    {
      key: 'fallback_teton',
      title: 'Grand Teton',
      subtitle: 'Wyoming · Apr 2024',
      distance: '18.2 mi',
      imageUri: imageForKey('fallback_teton'),
      tag: 'James explored',
    },
    {
      key: 'fallback_olympic',
      title: 'Olympic',
      subtitle: 'Washington · Mar 2024',
      distance: '31.0 mi',
      imageUri: imageForKey('fallback_olympic'),
      tag: 'You visited',
    },
  ], []);

  const adventureCards = useMemo<AdventureCardItem[]>(() => {
    if (displayedFeed.length === 0) {
      return communityMode === 'friends' ? [] : fallbackCards;
    }

    return displayedFeed.map((item) => {
      const isStrava = item.type === 'strava';
      const isFriend = item.type === 'friend';
      const date = isStrava ? item.data.start_date : (item.data as any).dateVisited;
      const key = isStrava ? `strava_${item.data.id}` : isFriend ? `friend_${(item.data as any).userId}_${(item.data as any).parkId}` : `manual_${(item.data as any).visitId}`;
      const park = isStrava ? parkForActivity(item.data as StravaActivity) : parkById.get((item.data as any).parkId);
      const parkName = park?.name || (isStrava ? 'Unknown Park' : (item.data as any).parkName);
      const parkState = park?.state || 'Park';
      const distance = isStrava
        ? `${((item.data as StravaActivity).distance / 1609.34).toFixed(1)} mi`
        : `${((item.data as any).distanceMiles ?? 0).toFixed(1)} mi`;
      const dateLabel = fullMonthYear(date);
      const friendName = isFriend ? (item.data as any).userName : firstName(user?.name);

      return {
        key,
        title: parkName,
        subtitle: dateLabel ? `${parkState} · ${dateLabel}` : parkState,
        distance,
        imageUri: !isStrava && !isFriend ? (item.data as ParkVisit).photoUri || imageForKey(key) : imageForKey(key),
        tag: `${friendName} visited`,
        onPress: isStrava || isFriend ? undefined : () => onCardPress(item as { type: 'manual'; data: ParkVisit }),
      };
    });
  }, [displayedFeed, fallbackCards, parkForActivity, parkById, communityMode, user?.name, onCardPress]);

  const isFirstTimeEmpty = activities.length === 0 && visits.length === 0 && visitedParks.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isFirstTimeEmpty && styles.scrollContentEmpty]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { marginBottom: 14 }]}>
          <View style={styles.greetingRow}>
            <Image
              source={require('../../assets/images/parkatlas-logo.png')}
              style={styles.greetingLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingTitle}>Hello, {firstName(user?.name)}.</Text>
              <Text style={styles.greetingSub}>Ready for your next expedition?</Text>
            </View>
          </View>
        </View>

        {isFirstTimeEmpty ? (
          <View style={styles.firstTimeEmptyWrap}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80' }}
              style={styles.firstTimeHeroImage}
            />
            <Text style={styles.firstTimeTitle}>Start your adventure</Text>
            <Text style={styles.firstTimeSub}>Track the parks you visit and build your journey over time.</Text>

            <TouchableOpacity
              style={styles.firstTimePrimaryBtn}
              activeOpacity={0.85}
              onPress={() => setSheetVisible(true)}
            >
              <Text style={styles.firstTimePrimaryBtnText}>Log your first park</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.firstTimeSecondaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.firstTimeSecondaryBtnText}>Explore parks</Text>
            </TouchableOpacity>

            <View style={styles.firstTimeSupportRow}>
              <Text style={styles.firstTimeSupportText}>0/63 National</Text>
              <Text style={styles.firstTimeSupportText}>0/120 State</Text>
              <Text style={styles.firstTimeSupportText}>0 mi</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statTile}>
                <View style={styles.statTileContentRow}>
                  <StatProgress
                    progress={nationalVisited / 63}
                    value={`${Math.round((nationalVisited / 63) * 100)}%`}
                  />
                  <View style={styles.statTileTextCol}>
                    <Text style={styles.statTileValue} numberOfLines={1}>{nationalVisited}/63</Text>
                    <Text style={styles.statTileLabel} numberOfLines={1}>National</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statTile}>
                <View style={styles.statTileContentRow}>
                  <StatProgress
                    progress={stateVisited / 120}
                    value={`${Math.round((stateVisited / 120) * 100)}%`}
                  />
                  <View style={styles.statTileTextCol}>
                    <Text style={styles.statTileValue} numberOfLines={1}>{stateVisited}/120</Text>
                    <Text style={styles.statTileLabel} numberOfLines={1}>State</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statTile}>
                <View style={styles.statTileContentRow}>
                  <View style={styles.statTileSpacer} />
                  <View style={styles.statTileTextCol}>
                    <Text style={styles.statTileValue} numberOfLines={1}>{Math.round(seasonalTotal)} mi</Text>
                    <Text style={styles.statTileLabel} numberOfLines={1}>Miles</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Adventures</Text>
                <View style={styles.toggleWrap}>
                  <TouchableOpacity
                    style={[styles.toggleButton, communityMode === 'mine' && styles.toggleButtonActive]}
                    onPress={() => setCommunityMode('mine')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleText, communityMode === 'mine' && styles.toggleTextActive]}>MINE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, communityMode === 'friends' && styles.toggleButtonActive]}
                    onPress={() => setCommunityMode('friends')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleText, communityMode === 'friends' && styles.toggleTextActive]}>FRIENDS</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardsList}>
                {adventureCards.length === 0 && communityMode === 'friends' ? (
                  <View style={styles.emptyFriendsFeed}>
                    {/* Ghost preview cards */}
                    <View style={styles.ghostCardsWrap} pointerEvents="none">
                      {[
                        { name: 'Alex', park: 'Zion', img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=60' },
                        { name: 'Jordan', park: 'Yosemite', img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=60' },
                      ].map((item, i) => (
                        <View key={i} style={[styles.ghostCard, i === 1 && styles.ghostCardOffset]}>
                          <Image source={{ uri: item.img }} style={styles.ghostCardImage} blurRadius={3} />
                          <View style={styles.ghostCardOverlay} />
                          <View style={styles.ghostCardLabel}>
                            <Text style={styles.ghostCardLabelText}>{item.name} • {item.park}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.emptyFriendsFeedTitle}>Follow friends to see their adventures</Text>
                    <Text style={styles.emptyFriendsFeedText}>See where your friends have been — and get inspired for your next trip.</Text>

                    <TouchableOpacity
                      style={styles.emptyFriendsCTA}
                      activeOpacity={0.85}
                      onPress={() => router.push('/(tabs)/directory')}
                    >
                      <Text style={styles.emptyFriendsCTAText}>Find Your People</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push('/(tabs)/directory')}
                    >
                      <Text style={styles.emptyFriendsInvite}>Invite a friend</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {adventureCards.map((card) => {
                  return (
                    <TouchableOpacity
                      key={card.key}
                      style={styles.adventureCard}
                      activeOpacity={0.9}
                      onPress={card.onPress}
                      disabled={!card.onPress}
                    >
                      <View style={styles.cardImageWrap}>
                        <Image source={{ uri: card.imageUri }} style={styles.cardImage} />
                        <View style={styles.imageTag}>
                          <Text style={styles.imageTagText}>{card.tag}</Text>
                        </View>
                      </View>

                      <View style={styles.cardMetaRow}>
                        <View style={styles.cardMetaLeft}>
                          <Text style={styles.cardTitle}>{card.title}</Text>
                          <Text style={styles.cardSub}>{card.subtitle}</Text>
                        </View>
                        <Text style={styles.cardDistance}>{card.distance}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {!isFirstTimeEmpty ? (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setSheetVisible(true)}>
          <MaterialCommunityIcons name="plus" size={26} color="#ffffff" />
        </TouchableOpacity>
      ) : null}

      <LogOutingSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingVisit(null);
        }}
        onSaved={() => {
          setSheetVisible(false);
          setEditingVisit(null);
        }}
        editVisit={editingVisit ?? undefined}
      />
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingLogo: {
    width: 68,
    height: 68,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.8,
  },
  greetingSub: {
    marginTop: 3,
    fontSize: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  firstTimeEmptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  firstTimeHeroImage: {
    width: '100%',
    maxWidth: 320,
    height: 240,
    borderRadius: 18,
    marginBottom: 22,
  },
  firstTimeTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  firstTimeSub: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 330,
  },
  firstTimePrimaryBtn: {
    marginTop: 26,
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  firstTimePrimaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onPrimary,
    letterSpacing: 0.2,
  },
  firstTimeSecondaryBtn: {
    marginTop: 10,
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  firstTimeSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  firstTimeSupportRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  firstTimeSupportText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: '#FFF',
    padding: 6,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statTileContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTileTextCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  statTileSpacer: {
    width: 36,
    height: 36,
  },
  statTileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  statTileLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#6f7772',
  },
  statProgressWrap: {
    width: 36,
    height: 36,
  },
  statProgressTrack: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: STAT_RING_TRACK,
  },
  statProgressFill: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: STAT_RING_PROGRESS,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  statProgressCenter: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statProgressText: {
    fontSize: 8,
    fontWeight: '700',
    color: C.onSurface,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  recentTitle: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: C.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#dde3df',
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  toggleButtonActive: {
    backgroundColor: C.primary,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#4a514e',
  },
  toggleTextActive: {
    color: '#fff',
  },
  cardsList: {
    gap: 14,
  },
  adventureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 165,
    backgroundColor: '#dce2de',
  },
  imageTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  imageTagText: {
    fontSize: 10,
    color: C.onSurface,
    fontWeight: '600',
  },
  cardMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardMetaLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 14,
    color: '#6a746f',
  },
  cardDistance: {
    fontSize: 16,
    color: C.onSurfaceVariant,
    fontWeight: '700',
    paddingTop: 2,
  },
  emptyFriendsFeed: {
    borderRadius: 20,
    backgroundColor: '#f5f7f6',
    overflow: 'hidden',
    paddingBottom: 24,
    alignItems: 'center',
    gap: 0,
  },
  ghostCardsWrap: {
    flexDirection: 'row',
    height: 120,
    width: '100%',
    marginBottom: 20,
  },
  ghostCard: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: '55%',
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ghostCardOffset: {
    left: undefined,
    right: 16,
    top: 20,
  },
  ghostCardImage: {
    width: '100%',
    height: '100%',
  },
  ghostCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,247,246,0.55)',
  },
  ghostCardLabel: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ghostCardLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  emptyFriendsFeedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  emptyFriendsFeedText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  emptyFriendsCTA: {
    backgroundColor: C.primary,
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 36,
    marginBottom: 14,
  },
  emptyFriendsCTAText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyFriendsInvite: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
    textDecorationLine: 'underline',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f2e0d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
});
