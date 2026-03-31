import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { useStravaData } from '../../hooks/useStravaData';
import { StravaActivity } from '../../hooks/useStrava';
import { useVisitedParks, ParkVisit } from '../../hooks/useVisitedParks';
import { LogOutingSheet } from '../../components/LogOutingSheet';
import { AppDrawer } from '@/components/AppDrawer';
import { useAuth } from '@/hooks/useAuth';

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type FeedItem =
  | { kind: 'strava'; data: StravaActivity }
  | { kind: 'manual'; data: ParkVisit };

export default function DirectoryScreen() {
  const { activities, parkForActivity, loading } = useStravaData();
  const { visits, removeVisit } = useVisitedParks();
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ParkVisit | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    activities.forEach((a) => years.add(new Date(a.start_date).getFullYear()));
    visits.forEach((v) => years.add(new Date(v.dateVisited).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [activities, visits]);

  const allItems = useMemo<FeedItem[]>(() => {
    const strava: FeedItem[] = activities.map((a) => ({ kind: 'strava', data: a }));
    const manual: FeedItem[] = visits.map((v) => ({ kind: 'manual', data: v }));
    return [...strava, ...manual].sort((a, b) => {
      const da = a.kind === 'strava' ? a.data.start_date : a.data.dateVisited;
      const db = b.kind === 'strava' ? b.data.start_date : b.data.dateVisited;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [activities, visits]);

  const filteredItems = useMemo<FeedItem[]>(() => {
    const q = searchText.trim().toLowerCase();
    return allItems.filter((item) => {
      if (selectedYear !== 'all') {
        const date = item.kind === 'strava' ? item.data.start_date : item.data.dateVisited;
        if (new Date(date).getFullYear() !== selectedYear) return false;
      }
      if (q) {
        if (item.kind === 'strava') {
          const park = parkForActivity(item.data);
          if (!item.data.name.toLowerCase().includes(q) && !(park?.name.toLowerCase().includes(q))) return false;
        } else {
          if (!item.data.parkName.toLowerCase().includes(q) && !item.data.trailName.toLowerCase().includes(q)) return false;
        }
      }
      return true;
    });
  }, [allItems, selectedYear, searchText, parkForActivity]);

  function handleDeleteVisit(visit: ParkVisit) {
    Alert.alert(
      'Delete Entry',
      `Remove "${visit.trailName || visit.parkName}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeVisit(visit.visitId) },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu" size={26} color={C.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>My Activity</Text>
        </View>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.7}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color={C.onPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={C.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search trails & parks..."
            placeholderTextColor={C.outline}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={C.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Year filter */}
      {availableYears.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, selectedYear === 'all' && styles.filterPillActive]}
            onPress={() => setSelectedYear('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, selectedYear === 'all' && styles.filterPillTextActive]}>All Years</Text>
          </TouchableOpacity>
          {availableYears.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.filterPill, selectedYear === y && styles.filterPillActive]}
              onPress={() => setSelectedYear(y)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, selectedYear === y && styles.filterPillTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Results count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredItems.length} {filteredItems.length === 1 ? 'outing' : 'outings'}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) =>
          item.kind === 'strava' ? `s_${item.data.id}` : `m_${item.data.visitId}`
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="hiking" size={40} color={C.outlineVariant} />
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No outings found'}
            </Text>
            <Text style={styles.emptyHint}>Log a new outing to get started</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'strava') {
            const act = item.data;
            const miles = (act.distance / 1609.34).toFixed(1);
            const elevFt = Math.round(act.total_elevation_gain * 3.28084);
            const park = parkForActivity(act);
            return (
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardParkTitle} numberOfLines={1}>{park?.name ?? 'Unknown Park'}</Text>
                    <Text style={styles.cardDate}>{relativeDate(act.start_date)}</Text>
                  </View>
                  <Text style={styles.cardTrailLine} numberOfLines={1}>{act.name}</Text>
                  <View style={styles.cardChips}>
                    {act.distance > 0 && <Text style={[styles.chip, styles.chipGreen]}>{miles} mi</Text>}
                    {act.total_elevation_gain > 0 && <Text style={[styles.chip, styles.chipBrown]}>+{elevFt} ft</Text>}
                  </View>
                </View>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>STRAVA</Text>
                </View>
              </View>
            );
          } else {
            const visit = item.data;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert(visit.trailName || visit.parkName, 'What would you like to do?', [
                    { text: 'Edit', onPress: () => { setEditingVisit(visit); setSheetVisible(true); } },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteVisit(visit) },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardParkTitle} numberOfLines={1}>{visit.parkName}</Text>
                    <Text style={styles.cardDate}>{relativeDate(visit.dateVisited)}</Text>
                  </View>
                  <Text style={styles.cardTrailLine} numberOfLines={1}>{visit.trailName || 'Park visit'}</Text>
                  <View style={styles.cardChips}>
                    {visit.distanceMiles ? <Text style={[styles.chip, styles.chipGreen]}>{visit.distanceMiles.toFixed(1)} mi</Text> : null}
                    {visit.activityType ? <Text style={styles.chip}>{visit.activityType}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setSheetVisible(true)}>
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      <LogOutingSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setEditingVisit(null); }}
        onSaved={() => { setSheetVisible(false); setEditingVisit(null); }}
        editVisit={editingVisit ?? undefined}
      />
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: C.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBrand: { fontSize: 24, fontWeight: '700', color: C.onPrimary, letterSpacing: -0.3 },
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
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: C.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.onSurface, padding: 0 },
  filterRow: { paddingVertical: 6 },
  filterScroll: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  filterPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterPillText: { fontSize: 12, fontWeight: '700', color: C.onSurfaceVariant },
  filterPillTextActive: { color: C.onPrimary },
  countRow: { paddingHorizontal: 20, paddingBottom: 6 },
  countText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: `${C.onSurface}66` },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardParkTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.onSurface },
  cardDate: { fontSize: 11, color: C.onSurfaceVariant, fontWeight: '600' },
  cardTrailLine: { fontSize: 12, color: C.primary, fontWeight: '600' },
  cardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  chip: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    backgroundColor: C.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipGreen: { color: C.primary, backgroundColor: `${C.primary}18` },
  chipBrown: { color: C.tertiary, backgroundColor: `${C.tertiary}18` },
  cardBadge: {
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  cardBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: C.onSurfaceVariant },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: C.onSurfaceVariant, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: C.outline },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
