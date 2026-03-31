import React, { useState, useMemo } from 'react';
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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { useStravaData } from '@/hooks/useStravaData';
import { useVisitedParks, ParkVisit } from '@/hooks/useVisitedParks';
import { matchedParksFromCoords } from '@/utils/parkMatcher';
import { StravaActivity } from '@/hooks/useStrava';
import { LogOutingSheet } from '../../components/LogOutingSheet';
import { AppDrawer } from '@/components/AppDrawer';
import { StatBreakdownSheet, StatType } from '@/components/StatBreakdownSheet';
import { useAuth } from '@/hooks/useAuth';

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  if (days < 7) return `${days} DAYS AGO`;
  if (days < 14) return '1 WEEK AGO';
  return `${Math.floor(days / 7)} WEEKS AGO`;
}

function formatMovingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const milestones = [
  { label: 'First Peak', icon: 'trophy-outline', locked: false },
  { label: 'Forest Dweller', icon: 'tree-outline', locked: false },
  { label: '10-Day Streak', icon: 'fire', locked: false },
  { label: 'Locked', icon: 'lock-outline', locked: true },
];

export default function HomeScreen() {
  const { athlete, activities, totalMiles, trailCount, parksCount, visitedParks, parkForActivity, loading } = useStravaData();
  const { visits, removeVisit } = useVisitedParks();
  const { user } = useAuth();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ParkVisit | null>(null);
  const [activeStat, setActiveStat] = useState<StatType | null>(null);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Build the list of years represented in data (always includes current year)
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    activities.forEach((a) => years.add(new Date(a.start_date).getFullYear()));
    visits.forEach((v) => years.add(new Date(v.dateVisited).getFullYear()));
    return [...years].sort((a, b) => a - b);
  }, [activities, visits]);

  // Year-filtered activities and visits
  const yearActivities = useMemo(() =>
    activities.filter((a) => new Date(a.start_date).getFullYear() === selectedYear),
    [activities, selectedYear]
  );
  const yearVisits = useMemo(() =>
    visits.filter((v) => new Date(v.dateVisited).getFullYear() === selectedYear),
    [visits, selectedYear]
  );

  // Year-scoped stats
  const yearMiles = useMemo(() =>
    yearActivities.reduce((s, a) => s + (a.distance ?? 0), 0) / 1609.34,
    [yearActivities]
  );
  const yearTrailCount = yearActivities.length + yearVisits.length;
  const yearParksCount = useMemo(() => {
    const ids = new Set(matchedParksFromCoords(yearActivities.map((a) => a.start_latlng)).map((p) => p.id));
    yearVisits.forEach((v) => ids.add(v.parkId));
    return ids.size;
  }, [yearActivities, yearVisits]);

  // Merge Strava-detected park IDs + manually logged park IDs for combined count
  const combinedParksCount = useMemo(() => {
    const stravaIds = new Set(visitedParks.map((p) => p.id));
    visits.forEach((v) => stravaIds.add(v.parkId));
    return stravaIds.size;
  }, [visitedParks, visits]);

  // Combine Strava activities + manual visits for the activity feed (most recent 4)
  type FeedItem =
    | { type: 'strava'; data: StravaActivity }
    | { type: 'manual'; data: ParkVisit };

  const feedItems = useMemo<FeedItem[]>(() => {
    const strava: FeedItem[] = activities.slice(0, 4).map((a) => ({ type: 'strava', data: a }));
    const manual: FeedItem[] = visits.slice(0, 4).map((v) => ({ type: 'manual', data: v }));
    return [...strava, ...manual]
      .sort((a, b) => {
        const dateA = a.type === 'strava' ? a.data.start_date : a.data.dateVisited;
        const dateB = b.type === 'strava' ? b.data.start_date : b.data.dateVisited;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 4);
  }, [activities, visits]);

  const recentActivities = activities.slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu" size={26} color={C.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>ParkAtlas</Text>
        </View>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.7}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color={C.onPrimary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image
              source={require('../../assets/images/parkatlas-logo.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Welcome back, {athlete?.firstname ?? 'Explorer'}.</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          {/* Year selector */}
          <View style={styles.yearPickerRow}>
            <Text style={styles.yearLabel}>
              {selectedYear === currentYear ? `${selectedYear} YTD` : `${selectedYear}`}
            </Text>
            <View style={styles.yearPills}>
              {availableYears.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearPill, y === selectedYear && styles.yearPillActive]}
                  onPress={() => setSelectedYear(y)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearPillText, y === selectedYear && styles.yearPillTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.statsGrid}>
            <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => setActiveStat('miles')}>
              <MaterialCommunityIcons name="map-marker-distance" size={22} color={`${C.primary}66`} />
              <View>
                <Text style={styles.statValue}>{yearMiles > 0 ? yearMiles.toFixed(1) : (loading ? '—' : '0')}</Text>
                <Text style={styles.statLabel}>MILES</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => setActiveStat('trails')}>
              <MaterialCommunityIcons name="terrain" size={22} color={`${C.primary}66`} />
              <View>
                <Text style={styles.statValue}>{yearTrailCount > 0 ? yearTrailCount : (loading ? '—' : '0')}</Text>
                <Text style={styles.statLabel}>TRAILS</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => setActiveStat('parks')}>
              <MaterialCommunityIcons name="pine-tree" size={22} color={`${C.primary}66`} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={styles.statValue}>{yearParksCount > 0 ? yearParksCount : (loading ? '—' : '0')}</Text>
                  <Text style={styles.statLabelInline}>/ 63</Text>
                </View>
                <Text style={styles.statLabel}>PARKS</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round((yearParksCount / 63) * 100)}%` }]} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress by Region */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={C.primary} />
              <Text style={styles.sectionTitle}>PROGRESS BY REGION</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 8, rowGap: 20 }}>
            {[
              { name: 'Alaska',    visited: 0,  total: 1,  color: '#9e9e9e' },
              { name: 'Northeast', visited: 1,  total: 8,  color: '#e91e8c' },
              { name: 'Pacific',   visited: 1,  total: 15, color: '#3f51b5' },
              { name: 'Rockies',   visited: 1,  total: 12, color: '#9c27b0' },
              { name: 'Southeast', visited: 0,  total: 11, color: '#9e9e9e' },
              { name: 'Southwest', visited: 1,  total: 20, color: '#ff6d00' },
            ].map((r) => {
              const pct = r.total > 0 ? r.visited / r.total : 0;
              const SIZE = 64;
              const STROKE = 5;
              const R = (SIZE - STROKE) / 2;
              const CIRC = 2 * Math.PI * R;
              const dash = pct * CIRC;
              return (
                <View key={r.name} style={{ alignItems: 'center', gap: 6, width: '30%' }}>
                  <View style={{ width: SIZE, height: SIZE }}>
                    {/* background ring */}
                    <View style={{
                      position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
                      borderWidth: STROKE, borderColor: C.surfaceContainerHighest,
                    }} />
                    {/* progress arc via border trick — use a thin colored top border */}
                    {pct > 0 && (
                      <View style={{
                        position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
                        borderWidth: STROKE,
                        borderTopColor: r.color,
                        borderRightColor: pct > 0.25 ? r.color : 'transparent',
                        borderBottomColor: pct > 0.5 ? r.color : 'transparent',
                        borderLeftColor: pct > 0.75 ? r.color : 'transparent',
                        transform: [{ rotate: '-90deg' }],
                      }} />
                    )}
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.onSurface }}>{r.visited}/{r.total}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>{r.name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* My Journeys */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ACTIVITY</Text>
            <TouchableOpacity style={styles.sectionLink} activeOpacity={0.6}>
              <Text style={styles.sectionLinkText}>VIEW ALL</Text>
              <MaterialCommunityIcons name="arrow-right" size={12} color={C.primary} style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          </View>

          {feedItems.length > 0
            ? feedItems.map((item) => {
                if (item.type === 'strava') {
                  const act = item.data;
                  const miles = (act.distance / 1609.34).toFixed(1);
                  const elevFt = Math.round(act.total_elevation_gain * 3.28084);
                  const park = parkForActivity(act);
                  return (
                    <TouchableOpacity key={`s_${act.id}`} style={styles.journeyCard} activeOpacity={0.7}>
                      <View style={styles.journeyThumb}>
                        <MaterialCommunityIcons name="hiking" size={26} color={C.outlineVariant} />
                      </View>
                      <View style={styles.journeyBody}>
                        <View style={styles.journeyTop}>
                          <Text style={styles.journeyTitle} numberOfLines={1}>{act.name}</Text>
                          <Text style={styles.journeyDate}>{relativeDate(act.start_date)}</Text>
                        </View>
                        <View style={styles.journeyStats}>
                          <View style={styles.journeyStatChip}>
                            <MaterialCommunityIcons name="routes" size={12} color={C.secondary} />
                            <Text style={[styles.journeyStatText, { color: C.secondary }]}>{miles} mi</Text>
                          </View>
                          <View style={styles.journeyStatChip}>
                            <MaterialCommunityIcons name="elevation-rise" size={12} color={C.tertiary} />
                            <Text style={[styles.journeyStatText, { color: C.tertiary }]}>+{elevFt} ft</Text>
                          </View>
                          <View style={styles.journeyStatChip}>
                            <MaterialCommunityIcons name="timer-outline" size={12} color={`${C.onSurface}66`} />
                            <Text style={[styles.journeyStatText, { color: `${C.onSurface}66` }]}>{formatMovingTime(act.moving_time)}</Text>
                          </View>
                          {park && (
                            <View style={styles.journeyStatChip}>
                              <MaterialCommunityIcons name="pine-tree" size={12} color={C.primary} />
                              <Text style={[styles.journeyStatText, { color: C.primary }]}>{park.name}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  const visit = item.data;
                  return (
                    <TouchableOpacity
                      key={`m_${visit.visitId}`}
                      style={styles.journeyCard}
                      activeOpacity={0.7}
                      onPress={() =>
                        Alert.alert(
                          visit.trailName || visit.parkName,
                          'What would you like to do?',
                          [
                            { text: 'Edit', onPress: () => { setEditingVisit(visit); setSheetVisible(true); } },
                            { text: 'Delete', style: 'destructive', onPress: () =>
                              Alert.alert('Delete Entry', `Remove "${visit.trailName || visit.parkName}" from your log?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => removeVisit(visit.visitId) },
                              ])
                            },
                            { text: 'Cancel', style: 'cancel' },
                          ],
                        )
                      }
                    >
                      <View style={[styles.journeyThumb, styles.journeyThumbManual]}>
                        <MaterialCommunityIcons name="map-marker-check" size={22} color={C.primary} />
                      </View>
                      <View style={styles.journeyBody}>
                        <View style={styles.journeyTop}>
                          <Text style={styles.journeyTitle} numberOfLines={1}>
                            {visit.trailName || `${visit.parkName} Visit`}
                          </Text>
                          <Text style={styles.journeyDate}>{relativeDate(visit.dateVisited)}</Text>
                        </View>
                        <View style={styles.journeyStats}>
                          <View style={styles.journeyStatChip}>
                            <MaterialCommunityIcons name="pine-tree" size={12} color={C.primary} />
                            <Text style={[styles.journeyStatText, { color: C.primary }]}>{visit.parkName}</Text>
                          </View>
                          {visit.distanceMiles ? (
                            <View style={styles.journeyStatChip}>
                              <MaterialCommunityIcons name="routes" size={12} color={C.secondary} />
                              <Text style={[styles.journeyStatText, { color: C.secondary }]}>{visit.distanceMiles.toFixed(1)} mi</Text>
                            </View>
                          ) : null}
                          <View style={[styles.journeyStatChip, styles.journeyStatChipManual]}>
                            <Text style={styles.journeyStatTextManual}>LOGGED</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }
              })
            : null}

          <TouchableOpacity style={styles.dashedButton} activeOpacity={0.6} onPress={() => setSheetVisible(true)}>
            <Text style={styles.dashedButtonText}>+ LOG NEW OUTING</Text>
          </TouchableOpacity>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EARNED MILESTONES</Text>
            <TouchableOpacity style={styles.sectionLink} activeOpacity={0.6}>
              <Text style={styles.sectionLinkText}>VIEW ALL</Text>
              <MaterialCommunityIcons name="arrow-right" size={12} color={C.primary} style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          </View>
          <View style={styles.milestonesGrid}>
            {milestones.map((m) => (
              <View key={m.label} style={[styles.milestoneCard, m.locked && styles.milestoneCardLocked]}>
                <View style={[styles.milestoneIconBg, m.locked && styles.milestoneIconBgLocked]}>
                  <MaterialCommunityIcons
                    name={m.icon as any}
                    size={24}
                    color={m.locked ? C.outline : C.primary}
                  />
                </View>
                <Text style={[styles.milestoneLabel, m.locked && styles.milestoneLabelLocked]}>
                  {m.label.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Connected Devices — commented out for later
        <View style={[styles.section, { marginBottom: 48 }]}>
          <View style={styles.devicesCard}>
            <Text style={styles.devicesTitle}>Connected Devices</Text>
            <View style={styles.deviceRow}>
              <MaterialCommunityIcons name="watch" size={22} color={`${C.primary}80`} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>GARMIN FĒNIX 7</Text>
                <Text style={styles.deviceStatus}>SYNCED 2M AGO</Text>
              </View>
              <View style={[styles.dot, { backgroundColor: C.primary }]} />
            </View>
            <View style={[styles.deviceRow, styles.deviceRowBorder]}>
              <MaterialCommunityIcons name="heart" size={22} color={`${C.primary}99`} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>APPLE HEALTH</Text>
                <Text style={styles.deviceStatus}>ALWAYS ACTIVE</Text>
              </View>
              <View style={[styles.dot, { backgroundColor: `${C.primary}66` }]} />
            </View>
            <TouchableOpacity style={styles.pairButton} activeOpacity={0.6}>
              <Text style={styles.pairButtonText}>PAIR NEW DEVICE</Text>
            </TouchableOpacity>
          </View>
        </View>
        */}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setSheetVisible(true)}>
        <MaterialCommunityIcons name="plus" size={26} color="#ffffff" />
      </TouchableOpacity>

      <LogOutingSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setEditingVisit(null); }}
        onSaved={() => { setSheetVisible(false); setEditingVisit(null); }}
        editVisit={editingVisit ?? undefined}
      />
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <StatBreakdownSheet
        statType={activeStat}
        yearVisits={yearVisits}
        yearActivities={yearActivities}
        selectedYear={selectedYear}
        onClose={() => setActiveStat(null)}
        onEditVisit={(v) => { setActiveStat(null); setEditingVisit(v); setSheetVisible(true); }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: C.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBrand: {
    fontSize: 24,
    fontWeight: '700',
    color: C.onPrimary,
    letterSpacing: -0.3,
  },
  headerLogo: {
    width: 110,
    height: 34,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 16,
  },
  journalLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: `${C.primary}99`,
  },
  welcomeTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.5,
  },
  welcomeLogo: {
    width: 90,
    height: 90,
  },
  yearPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: `${C.onSurface}88`,
  },
  yearPills: {
    flexDirection: 'row',
    gap: 6,
  },
  yearPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: C.surfaceContainerHighest,
  },
  yearPillActive: {
    backgroundColor: C.primary,
  },
  yearPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  yearPillTextActive: {
    color: C.onPrimary,
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    backgroundColor: C.surfaceContainerLow,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.surfaceContainerHighest,
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: C.primary,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: `${C.onSurface}66`,
    marginTop: 1,
  },
  statLabelInline: {
    fontSize: 18,
    fontWeight: '700',
    color: `${C.onSurface}66`,
  },
  progressTrack: {
    height: 5,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 99,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 99,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.primary,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sectionLinkText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: `${C.primary}b3`,
  },
  journeyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: `${C.surfaceContainerHighest}99`,
    borderRadius: 12,
  },
  journeyThumb: {
    width: 60,
    height: 60,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  journeyBody: {
    flex: 1,
    gap: 3,
  },
  journeyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  journeyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.primary,
    flex: 1,
  },
  journeyDate: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: `${C.onSurface}66`,
  },
  journeyQuote: {
    fontSize: 16,
    color: `${C.onSurface}99`,
    fontStyle: 'italic',
    fontWeight: '300',
  },
  journeyStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  journeyStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  journeyStatChipManual: {
    backgroundColor: `${C.primary}14`,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  journeyStatTextManual: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.8,
  },
  journeyThumbManual: {
    backgroundColor: `${C.primary}14`,
  },
  journeyStatText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  dashedButton: {
    paddingVertical: 16,
    backgroundColor: C.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  dashedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: C.background,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  milestoneCard: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: `${C.surfaceContainerHighest}99`,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  milestoneCardLocked: {
    opacity: 0.3,
  },
  milestoneIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${C.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIconBgLocked: {
    backgroundColor: `${C.surfaceContainerHighest}80`,
  },
  milestoneLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: `${C.onSurface}b3`,
    textAlign: 'center',
  },
  milestoneLabelLocked: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  devicesCard: {
    backgroundColor: `${C.surfaceContainer}66`,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${C.surfaceContainerHighest}50`,
    gap: 0,
  },
  devicesTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: `${C.surface}cc`,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceRowBorder: {
    borderTopWidth: 0,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.onSurface,
  },
  deviceStatus: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: `${C.onSurface}66`,
    marginTop: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pairButton: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${C.primary}1a`,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  pairButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: `${C.primary}99`,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 96,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
