import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { PARKS } from '../../data/parksData';
import { getParkDetail } from '../../data/parkDetails';
import { useStravaData } from '../../hooks/useStravaData';
import { useVisitedParks } from '../../hooks/useVisitedParks';
import { LogVisitSheet } from '../../components/LogVisitSheet';

export default function ParkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const park = PARKS.find((p) => p.id === id);
  const detail = park ? getParkDetail(park.npsCode) : null;
  const { activities, parkForActivity } = useStravaData();
  const { hasVisited, logVisit, visitsForPark } = useVisitedParks();
  const [sheetVisible, setSheetVisible] = useState(false);

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
    Linking.openURL(url);
  }

  function openNPS() {
    Linking.openURL(`https://www.nps.gov/${park!.npsCode}/index.htm`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.onPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{park.name}</Text>
          <View style={styles.headerStateBadge}>
            <Text style={styles.headerStateText}>{park.state}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.npsBtn} onPress={openNPS} activeOpacity={0.7}>
          <Text style={styles.npsBtnText}>NPS</Text>
          <Ionicons name="open-outline" size={13} color={C.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Log Visit CTA */}
      <TouchableOpacity
        style={[styles.logVisitBtn, hasVisited(park.id) && styles.logVisitBtnVisited]}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={hasVisited(park.id) ? 'checkmark-circle' : 'add-circle-outline'}
          size={18}
          color={hasVisited(park.id) ? C.primary : C.onPrimary}
        />
        <Text style={[styles.logVisitBtnText, hasVisited(park.id) && styles.logVisitBtnTextVisited]}>
          {hasVisited(park.id)
            ? `Visited · ${visitsForPark(park.id).length} log${visitsForPark(park.id).length !== 1 ? 's' : ''}`
            : 'Log a Visit'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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
            <Ionicons name="calendar-outline" size={14} color={detail.openYear ? C.primary : '#7c5200'} />
            <Text style={[styles.statPillText, !detail.openYear && { color: '#7c5200' }]}>
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
          </View>
          <View style={styles.trailsRow}>
            <View style={styles.trailsStat}>
              <Text style={styles.trailsStatValue}>{detail.trailCount}+</Text>
              <Text style={styles.trailsStatLabel}>NAMED TRAILS</Text>
            </View>
            {myActivities.length > 0 && (
              <View style={[styles.trailsStat, styles.trailsStatHighlight]}>
                <Text style={[styles.trailsStatValue, { color: C.primary }]}>{myActivities.length}</Text>
                <Text style={[styles.trailsStatLabel, { color: C.primary }]}>YOUR HIKES</Text>
              </View>
            )}
          </View>
          {myActivities.length > 0 && (
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
                <Ionicons name="checkmark-circle" size={16} color="#1b4332" />
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

      </ScrollView>

      <LogVisitSheet
        visible={sheetVisible}
        parkName={park.name}
        onClose={() => setSheetVisible(false)}
        onSave={(trailName) => {
          logVisit(park.id, park.name, trailName);
          setSheetVisible(false);
        }}
      />
    </SafeAreaView>
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
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 13,
  },
  logVisitBtnVisited: {
    backgroundColor: C.surfaceContainerLow,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.primary,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onPrimary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  headerStateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  headerStateText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onPrimary,
    letterSpacing: 1,
  },
  npsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  npsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onPrimary,
    letterSpacing: 1,
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
    backgroundColor: 'rgba(255,193,7,0.15)',
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
  trailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trailsStat: {
    flex: 1,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  trailsStatHighlight: {
    backgroundColor: `${C.primary}14`,
  },
  trailsStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
  },
  trailsStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1,
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
    color: '#1b4332',
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
