import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { ParkVisit, useVisitedParks } from '@/hooks/useVisitedParks';
import { StravaActivity } from '@/hooks/useStrava';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.82;

export type StatType = 'miles' | 'trails' | 'parks';

interface Props {
  statType: StatType | null;
  yearVisits: ParkVisit[];
  yearActivities: StravaActivity[];
  selectedYear: number;
  onClose: () => void;
  onEditVisit: (visit: ParkVisit) => void;
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMovingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const TITLES: Record<StatType, string> = {
  miles: 'Miles Hiked',
  trails: 'Trail Outings',
  parks: 'Parks Visited',
};

const ICONS: Record<StatType, string> = {
  miles: 'map-marker-distance',
  trails: 'terrain',
  parks: 'pine-tree',
};

export function StatBreakdownSheet({ statType, yearVisits, yearActivities, selectedYear, onClose, onEditVisit }: Props) {
  const { removeVisit } = useVisitedParks();

  function handleDelete(visit: ParkVisit) {
    Alert.alert(
      'Delete Entry',
      `Remove "${visit.trailName || visit.parkName}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeVisit(visit.visitId),
        },
      ],
    );
  }

  type Row =
    | { kind: 'strava'; data: StravaActivity }
    | { kind: 'manual'; data: ParkVisit };

  // Build the relevant rows for the tapped stat
  const rows: Row[] = React.useMemo<Row[]>(() => {
    if (!statType) return [];
    if (statType === 'miles' || statType === 'trails') {
      // Strava activities for this year, sorted newest first
      const stravaRows: Row[] = yearActivities.map((a) => ({ kind: 'strava', data: a }));
      // Also include manual visits that have a distance for 'miles'
      const manualRows: Row[] = statType === 'miles'
        ? yearVisits.filter((v) => (v.distanceMiles ?? 0) > 0).map((v) => ({ kind: 'manual', data: v }))
        : yearVisits.map((v) => ({ kind: 'manual', data: v }));
      return [...stravaRows, ...manualRows].sort((a, b) => {
        const da = a.kind === 'strava' ? a.data.start_date : a.data.dateVisited;
        const db = b.kind === 'strava' ? b.data.start_date : b.data.dateVisited;
        return new Date(db).getTime() - new Date(da).getTime();
      });
    }
    // Parks — deduplicate by parkId, show one row per unique park
    const seenIds = new Set<string>();
    return yearVisits
      .filter((v) => {
        if (seenIds.has(v.parkId)) return false;
        seenIds.add(v.parkId);
        return true;
      })
      .map((v) => ({ kind: 'manual', data: v }));
  }, [statType, yearVisits, yearActivities]);

  function renderStrava(act: StravaActivity) {
    const miles = (act.distance / 1609.34).toFixed(1);
    const elevFt = Math.round(act.total_elevation_gain * 3.28084);
    return (
      <View key={`s_${act.id}`} style={styles.row}>
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name="hiking" size={20} color={C.outline} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{act.name}</Text>
          <View style={styles.rowChips}>
            <Text style={styles.chip}>{relativeDate(act.start_date)}</Text>
            {act.distance > 0 && <Text style={[styles.chip, styles.chipGreen]}>{miles} mi</Text>}
            {act.total_elevation_gain > 0 && <Text style={[styles.chip, styles.chipBrown]}>+{elevFt} ft</Text>}
            {act.moving_time > 0 && <Text style={styles.chip}>{formatMovingTime(act.moving_time)}</Text>}
          </View>
        </View>
        <View style={styles.rowBadge}>
          <Text style={styles.rowBadgeText}>STRAVA</Text>
        </View>
      </View>
    );
  }

  function renderManual(visit: ParkVisit) {
    return (
      <View key={`m_${visit.visitId}`} style={styles.row}>
        <View style={[styles.rowIcon, styles.rowIconGreen]}>
          <MaterialCommunityIcons name="map-marker-check" size={20} color={C.primary} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {visit.trailName || visit.parkName}
          </Text>
          <View style={styles.rowChips}>
            <Text style={styles.chip}>{relativeDate(visit.dateVisited)}</Text>
            {visit.parkName && visit.trailName ? <Text style={[styles.chip, styles.chipGreen]}>{visit.parkName}</Text> : null}
            {visit.distanceMiles ? <Text style={styles.chip}>{visit.distanceMiles.toFixed(1)} mi</Text> : null}
            {visit.activityType ? <Text style={styles.chip}>{visit.activityType}</Text> : null}
          </View>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => { onClose(); onEditVisit(visit); }}
          >
            <Ionicons name="pencil-outline" size={16} color={C.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => handleDelete(visit)}
          >
            <Ionicons name="trash-outline" size={16} color="#c0392b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!statType) return null;

  return (
    <Modal
      visible={!!statType}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name={ICONS[statType] as any} size={18} color={C.onPrimary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{TITLES[statType]}</Text>
                <Text style={styles.headerSub}>{selectedYear} · {rows.length} {rows.length === 1 ? 'entry' : 'entries'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {rows.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={C.outlineVariant} />
              <Text style={styles.emptyText}>No entries for {selectedYear}</Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item) => item.kind === 'strava' ? `s_${item.data.id}` : `m_${item.data.visitId}`}
              renderItem={({ item }) =>
                item.kind === 'strava'
                  ? renderStrava(item.data)
                  : renderManual(item.data)
              }
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: C.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconGreen: {
    backgroundColor: `${C.primary}18`,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  rowChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    backgroundColor: C.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipGreen: {
    color: C.primary,
    backgroundColor: `${C.primary}18`,
  },
  chipBrown: {
    color: C.tertiary,
    backgroundColor: `${C.tertiary}18`,
  },
  rowBadge: {
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  rowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.onSurfaceVariant,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
});
