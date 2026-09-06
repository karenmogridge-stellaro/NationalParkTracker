import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useToast } from '@/components/ui/Toast';
import { ShareCard } from '@/components/ShareCard';
import { useShareCard } from '@/hooks/useShareCard';
import { useFriends } from '@/hooks/useFriends';
import { fetchFriendActivities } from '@/utils/userDirectoryApi';
import { PARKS } from '../../data/parksData';
import { getParkDetail } from '../../data/parkDetails';
import { PARK_TRAILS, type Trail } from '@/data/trailsData';
import { useStravaData } from '../../hooks/useStravaData';
import { useVisitedParks } from '../../hooks/useVisitedParks';
import { LogVisitSheet } from '../../components/LogVisitSheet';

const HERO_HEIGHT = 300;
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=160&q=80';

type FriendVisitor = { id: string; name: string; avatar: string; visits: number };

export default function ParkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const park = PARKS.find((p) => p.id === id);
  const detail = park ? getParkDetail(park.npsCode) : null;
  const { activities, parkForActivity } = useStravaData();
  const { hasVisited, logVisit, visitsForPark, nationalParkCount } = useVisitedParks();
  const { myFriends } = useFriends();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetTrail, setSheetTrail] = useState<Trail | null>(null);
  const [showAllTrails, setShowAllTrails] = useState(false);
  const [friendVisitors, setFriendVisitors] = useState<FriendVisitor[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const toast = useToast();

  const parkVisits = useMemo(() => (park ? visitsForPark(park.id) : []), [park, visitsForPark]);
  const visited = park ? hasVisited(park.id) : false;
  const curatedTrails = useMemo<Trail[]>(() => (park ? PARK_TRAILS[park.npsCode] || [] : []), [park]);
  const hikedTrailNames = useMemo(
    () => new Set(parkVisits.map((v) => v.trailName.trim().toLowerCase()).filter(Boolean)),
    [parkVisits],
  );

  function openLogSheet(trail?: Trail) {
    haptic.medium();
    setSheetTrail(trail ?? null);
    setSheetVisible(true);
  }
  const heroPhoto = useMemo(
    () => parkVisits.find((v) => v.photoUri && !/hike-default|unsplash/i.test(v.photoUri))?.photoUri,
    [parkVisits],
  );
  const totalMiles = useMemo(
    () => parkVisits.reduce((s, v) => s + (v.distanceMiles ?? 0), 0),
    [parkVisits],
  );

  const shareDetail = visited
    ? `${parkVisits.length} ${parkVisits.length === 1 ? 'visit' : 'visits'}${totalMiles > 0 ? ` · ${totalMiles.toFixed(1)} mi` : ''}`
    : undefined;

  const { ref: shareRef, share, sharing } = useShareCard({
    message: park
      ? `I've visited ${nationalParkCount} of 63 U.S. National Parks — latest: ${park.name}. Tracking them all on ParkAtlas.`
      : '',
    onError: () => toast.error("Couldn't create the share card. Try again."),
  });

  useEffect(() => {
    if (!park) return;
    const ids = myFriends.map((f) => f.id);
    if (ids.length === 0) {
      setFriendVisitors([]);
      return;
    }
    let active = true;
    setFriendsLoading(true);
    fetchFriendActivities(ids)
      .then((acts) => {
        if (!active) return;
        const byUser = new Map<string, FriendVisitor>();
        acts.filter((a) => a.parkId === park.id).forEach((a) => {
          const friend = myFriends.find((f) => f.id === a.userId);
          const existing = byUser.get(a.userId);
          if (existing) {
            existing.visits += 1;
          } else {
            byUser.set(a.userId, {
              id: a.userId,
              name: friend?.name || a.userName || 'Friend',
              avatar: friend?.avatar || FALLBACK_AVATAR,
              visits: 1,
            });
          }
        });
        setFriendVisitors(Array.from(byUser.values()));
      })
      .catch(() => { if (active) setFriendVisitors([]); })
      .finally(() => { if (active) setFriendsLoading(false); });
    return () => { active = false; };
  }, [park, myFriends]);

  if (!park || !detail) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.onPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.onSurface }}>Park not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const myActivities = activities.filter((act) => {
    const matched = parkForActivity(act);
    return matched?.id === park.id;
  });

  function openDirections() {
    const label = encodeURIComponent(park!.name + ' National Park');
    const url = Platform.OS === 'ios'
      ? `maps://?q=${label}&ll=${park!.lat},${park!.lng}`
      : `geo:${park!.lat},${park!.lng}?q=${label}`;
    const webFallback = `https://www.google.com/maps/search/?api=1&query=${park!.lat},${park!.lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(webFallback)).catch(() => {
      toast.error("Couldn't open a maps app");
    });
  }

  function openNPS() {
    Linking.openURL(`https://www.nps.gov/${park!.npsCode}/index.htm`);
  }

  const friendSummary = friendVisitors.length === 0
    ? null
    : friendVisitors.length === 1
      ? `${friendVisitors[0].name} has been here`
      : friendVisitors.length === 2
        ? `${friendVisitors[0].name} and ${friendVisitors[1].name} have been here`
        : `${friendVisitors[0].name} and ${friendVisitors.length - 1} others have been here`;

  return (
    <View style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {heroPhoto ? (
            <Image source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#2d6a4f', C.primary, '#0b2417']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {!heroPhoto ? (
            <MaterialCommunityIcons name="pine-tree" size={220} color="rgba(255,255,255,0.07)" style={styles.heroWatermark} />
          ) : null}
          <LinearGradient
            colors={['rgba(8,18,12,0.45)', 'rgba(8,18,12,0.0)', 'rgba(8,18,12,0.85)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.heroTopBar, { paddingTop: insets.top + 6 }]}>
            <TouchableOpacity style={styles.glassBtn} onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTopRight}>
              <TouchableOpacity style={styles.glassBtn} onPress={() => { void share(); }} activeOpacity={0.7} disabled={sharing} accessibilityRole="button" accessibilityLabel="Share this park">
                {sharing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.glassPill} onPress={openNPS} activeOpacity={0.7} accessibilityRole="link">
                <Text style={styles.glassPillText}>NPS</Text>
                <Ionicons name="open-outline" size={13} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.heroBadges}>
              <View style={styles.heroStateBadge}>
                <Text style={styles.heroStateText}>{park.state}</Text>
              </View>
              {visited ? (
                <View style={styles.heroVisitedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#d4f5dd" />
                  <Text style={styles.heroVisitedText}>Visited</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>{park.name}</Text>
            <Text style={styles.heroSub}>National Park · {detail.nearestCity}</Text>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.logVisitBtn, visited && styles.logVisitBtnVisited]}
          onPress={() => openLogSheet()}
          activeOpacity={0.85}
        >
          <Ionicons
            name={visited ? 'add-circle' : 'add-circle-outline'}
            size={18}
            color={visited ? C.primary : C.onPrimary}
          />
          <Text style={[styles.logVisitBtnText, visited && styles.logVisitBtnTextVisited]}>
            {visited
              ? `Log another visit · ${parkVisits.length} so far`
              : 'Log a Visit'}
          </Text>
        </TouchableOpacity>

        {/* Friends who've been here */}
        {friendsLoading || friendVisitors.length > 0 ? (
          <View style={styles.friendsRow}>
            {friendsLoading ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <>
                <View style={styles.avatarStack}>
                  {friendVisitors.slice(0, 3).map((f, i) => (
                    <Image
                      key={f.id}
                      source={{ uri: f.avatar }}
                      style={[styles.stackAvatar, i > 0 && { marginLeft: -10 }]}
                    />
                  ))}
                </View>
                <Text style={styles.friendsText} numberOfLines={2}>{friendSummary}</Text>
              </>
            )}
          </View>
        ) : null}

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <MaterialCommunityIcons name="pine-tree" size={14} color={C.primary} />
            <Text style={styles.statPillText}>{detail.trailCount}+ trails</Text>
          </View>
          {detail.camping && (
            <View style={styles.statPill}>
              <MaterialCommunityIcons name="tent" size={14} color={C.primary} />
              <Text style={styles.statPillText}>
                {detail.campsiteCount ? `${detail.campsiteCount} sites` : 'Camping'}
              </Text>
            </View>
          )}
          <View style={styles.statPill}>
            <Ionicons name="ticket-outline" size={14} color={C.primary} />
            <Text style={styles.statPillText}>{detail.entryFee}</Text>
          </View>
          <View style={[styles.statPill, detail.openYear ? styles.statPillGreen : styles.statPillAmber]}>
            <Ionicons name="calendar-outline" size={14} color={detail.openYear ? C.primary : C.warning} />
            <Text style={[styles.statPillText, !detail.openYear && { color: C.warning }]}>
              {detail.openYear ? 'Year-round' : 'Seasonal'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.body}>{detail.description}</Text>
        </View>

        {/* Directions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="navigate" size={18} color={C.primary} />
            <Text style={styles.cardTitle}>Directions</Text>
          </View>
          <Text style={styles.cardBody}>
            Nearest city: {detail.nearestCity}
          </Text>
          <Text style={styles.coordText}>
            {park.lat.toFixed(4)}° N, {Math.abs(park.lng).toFixed(4)}° W
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={openDirections} activeOpacity={0.85}>
            <Ionicons name="map-outline" size={16} color={C.onPrimary} />
            <Text style={styles.actionBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Trails */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="hiking" size={18} color={C.primary} />
            <Text style={styles.cardTitle}>Trails</Text>
            <Text style={styles.cardHeaderMeta}>{detail.trailCount}+ named</Text>
          </View>

          {curatedTrails.length > 0 ? (
            <>
              <Text style={styles.cardBody}>Popular routes — tap one to log it.</Text>
              <View style={styles.trailList}>
                {(showAllTrails ? curatedTrails : curatedTrails.slice(0, 5)).map((trail) => {
                  const hiked = hikedTrailNames.has(trail.name.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={trail.name}
                      style={[styles.trailRow, hiked && styles.trailRowHiked]}
                      onPress={() => openLogSheet(trail)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Log a hike on ${trail.name}, ${trail.miles} miles`}
                    >
                      <View style={[styles.trailIcon, hiked && styles.trailIconHiked]}>
                        <MaterialCommunityIcons name={hiked ? 'check-bold' : 'hiking'} size={15} color={hiked ? C.onPrimary : C.primary} />
                      </View>
                      <Text style={styles.trailName} numberOfLines={1}>{trail.name}</Text>
                      <Text style={styles.trailMiles}>{trail.miles.toFixed(1)} mi</Text>
                      <Ionicons name="add-circle-outline" size={18} color={C.outlineVariant} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {curatedTrails.length > 5 ? (
                <TouchableOpacity onPress={() => { haptic.select(); setShowAllTrails((v) => !v); }} activeOpacity={0.7} style={styles.trailToggle}>
                  <Text style={styles.trailToggleText}>
                    {showAllTrails ? 'Show fewer' : `Show all ${curatedTrails.length} trails`}
                  </Text>
                  <Ionicons name={showAllTrails ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.cardBody}>Roughly {detail.trailCount} named trails. Log a visit to record the one you hiked.</Text>
          )}

          {myActivities.length > 0 && (
            <>
              <View style={styles.subHeader}>
                <MaterialCommunityIcons name="routes" size={14} color={C.primary} />
                <Text style={styles.subHeaderText}>YOUR STRAVA HIKES · {myActivities.length}</Text>
              </View>
              <View style={styles.myHikesList}>
                {myActivities.map((act) => {
                  const miles = (act.distance / 1609.34).toFixed(1);
                  const elevFt = Math.round(act.total_elevation_gain * 3.28084);
                  return (
                    <View key={act.id} style={styles.myHikeRow}>
                      <MaterialCommunityIcons name="routes" size={14} color={C.secondary} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.myHikeName} numberOfLines={1}>{act.name}</Text>
                        <Text style={styles.myHikeStats}>{miles} mi · +{elevFt} ft</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Camping */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="tent" size={18} color={C.primary} />
            <Text style={styles.cardTitle}>Camping</Text>
          </View>
          {detail.camping ? (
            <>
              <View style={styles.availableBadge}>
                <Ionicons name="checkmark-circle" size={16} color={C.primary} />
                <Text style={styles.availableText}>Camping Available</Text>
              </View>
              {detail.campsiteCount ? (
                <Text style={styles.cardBody}>
                  Approximately {detail.campsiteCount} campsites across multiple campgrounds. Reservations are recommended during peak season.
                </Text>
              ) : (
                <Text style={styles.cardBody}>
                  Backcountry and primitive camping available. Check NPS.gov for permits.
                </Text>
              )}
            </>
          ) : (
            <>
              <View style={[styles.availableBadge, styles.notAvailableBadge]}>
                <Ionicons name="close-circle-outline" size={16} color={C.onSurfaceVariant} />
                <Text style={[styles.availableText, { color: C.onSurfaceVariant }]}>No Campgrounds</Text>
              </View>
              <Text style={styles.cardBody}>
                No NPS campgrounds within this park. Lodging and private camping may be available nearby.
              </Text>
            </>
          )}
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={18} color={C.primary} />
            <Text style={styles.cardTitle}>Best Time to Visit</Text>
          </View>
          <View style={styles.peakSeasonBadge}>
            <MaterialCommunityIcons name="weather-sunny" size={16} color={C.secondary} />
            <Text style={styles.peakSeasonText}>Peak season: {detail.peakSeason}</Text>
          </View>
          <Text style={styles.cardBody}>
            {detail.openYear
              ? 'This park is open year-round, though facilities and some roads may be limited in winter.'
              : 'This park has seasonal access — check NPS.gov for current opening and closing dates.'}
          </Text>
          {!detail.openYear && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={openNPS} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={16} color={C.primary} />
              <Text style={[styles.actionBtnText, { color: C.primary }]}>Check Dates on NPS.gov</Text>
            </TouchableOpacity>
          )}
        </View>

        {visited ? (
          <TouchableOpacity style={styles.shareCta} onPress={() => { void share(); }} activeOpacity={0.85} disabled={sharing}>
            <Ionicons name="share-social-outline" size={18} color={C.primary} />
            <Text style={styles.shareCtaText}>{sharing ? 'Preparing card…' : 'Share this park'}</Text>
          </TouchableOpacity>
        ) : null}

      </ScrollView>

      {/* Off-screen render target for the share image. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard
          ref={shareRef}
          parkName={park.name}
          state={park.state}
          nationalVisited={nationalParkCount}
          photoUri={heroPhoto}
          detail={shareDetail}
        />
      </View>

      <LogVisitSheet
        visible={sheetVisible}
        parkName={park.name}
        npsCode={park.npsCode}
        initialTrail={sheetTrail}
        onClose={() => { setSheetVisible(false); setSheetTrail(null); }}
        onSave={({ trailName, trailMiles, date }) => {
          const firstVisit = !hasVisited(park.id);
          void logVisit(park.id, park.name, trailName, {
            ...date,
            ...(trailMiles ? { distanceMiles: trailMiles } : {}),
          });
          setSheetVisible(false);
          setSheetTrail(null);
          // First-time parks get the full-screen celebration instead.
          if (!firstVisit) toast.success(trailName ? `Logged ${trailName}` : 'Visit logged', { icon: 'leaf' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  logVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: Radii.md,
    paddingVertical: 14,
  },
  logVisitBtnVisited: {
    backgroundColor: C.primaryContainer,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  logVisitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onPrimary,
  },
  logVisitBtnTextVisited: {
    color: C.primary,
  },
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: C.primary,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroWatermark: {
    position: 'absolute',
    right: -40,
    top: 40,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  glassPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  heroBottom: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 6,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroStateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroStateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.4,
  },
  heroVisitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(27, 115, 60, 0.85)',
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroVisitedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d4f5dd',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.md,
    backgroundColor: C.surfaceContainerLow,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.surfaceContainerLow,
    backgroundColor: C.surfaceContainerHighest,
  },
  friendsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: C.onSurface,
  },
  shareCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingVertical: 13,
  },
  shareCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primary,
  },
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${C.primary}14`,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statPillGreen: {
    backgroundColor: `${C.primary}14`,
  },
  statPillAmber: {
    backgroundColor: C.warningContainer,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  body: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    lineHeight: 21,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  cardBody: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 19,
  },
  coordText: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onPrimary,
  },
  trailList: {
    gap: 6,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
  },
  trailRowHiked: {
    backgroundColor: C.primaryContainer,
    borderColor: C.primaryContainer,
  },
  trailIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
  },
  trailIconHiked: {
    backgroundColor: C.primary,
  },
  trailName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurface,
  },
  trailMiles: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  trailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  trailToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  cardHeaderMeta: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  subHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.primary,
  },
  myHikesList: {
    gap: 8,
    marginTop: 4,
  },
  myHikeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 8,
    padding: 10,
  },
  myHikeName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurface,
  },
  myHikeStats: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46,125,50,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  notAvailableBadge: {
    backgroundColor: C.surfaceContainerHighest,
  },
  availableText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  peakSeasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${C.secondary}18`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  peakSeasonText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.secondary,
  },
});
