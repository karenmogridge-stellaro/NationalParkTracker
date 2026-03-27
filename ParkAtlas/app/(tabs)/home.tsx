import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

const journeys = [
  {
    id: '1',
    title: 'The Mist Trail Ascent',
    quote: '"Steady climb past Vernal Falls. Nevada Fall was unparalleled."',
    stats: [{ icon: 'routes', value: '5.4 mi', color: C.secondary }, { icon: 'elevation-rise', value: '+2,191 ft', color: C.tertiary }],
    daysAgo: '3 DAYS AGO',
  },
  {
    id: '2',
    title: 'Cathedral Grove Loop',
    quote: '"Silent morning among the giants. Perfect solitude."',
    stats: [{ icon: 'routes', value: '3.1 mi', color: C.secondary }, { icon: 'timer-outline', value: '1h 45m', color: C.tertiary }],
    daysAgo: '1 WEEK AGO',
  },
];

const milestones = [
  { label: 'First Peak', icon: 'trophy-outline', locked: false },
  { label: 'Forest Dweller', icon: 'tree-outline', locked: false },
  { label: '10-Day Streak', icon: 'fire', locked: false },
  { label: 'Locked', icon: 'lock-outline', locked: true },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="menu" size={24} color={C.primary} />
          <Text style={styles.headerBrand}>ParkAtlas</Text>
        </View>
        <View style={styles.avatar} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.section}>
          <Text style={styles.welcomeTitle}>Welcome back,{'\n'}Elias.</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={22} color={`${C.primary}66`} />
              <View>
                <Text style={styles.statValue}>128.4</Text>
                <Text style={styles.statLabel}>MILES</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="terrain" size={22} color={`${C.primary}66`} />
              <View>
                <Text style={styles.statValue}>24</Text>
                <Text style={styles.statLabel}>SUMMITS</Text>
              </View>
            </View>
            <View style={styles.statItemWide}>
              <MaterialCommunityIcons name="pine-tree" size={22} color={`${C.primary}66`} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={styles.statValue}>14</Text>
                  <Text style={styles.statLabelInline}>/ 63</Text>
                </View>
                <Text style={styles.statLabel}>PARKS</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '22%' }]} />
                </View>
              </View>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="timer-outline" size={22} color={`${C.primary}66`} />
              <View>
                <Text style={styles.statValue}>3.4</Text>
                <Text style={styles.statLabel}>AVG PACE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* My Journeys */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY JOURNEYS</Text>
            <TouchableOpacity style={styles.sectionLink} activeOpacity={0.6}>
              <Text style={styles.sectionLinkText}>VIEW ARCHIVE</Text>
              <MaterialCommunityIcons name="arrow-right" size={12} color={C.primary} style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          </View>

          {journeys.map((j) => (
            <TouchableOpacity key={j.id} style={styles.journeyCard} activeOpacity={0.7}>
              <View style={styles.journeyThumb}>
                <MaterialCommunityIcons name="image-outline" size={26} color={C.outlineVariant} />
              </View>
              <View style={styles.journeyBody}>
                <View style={styles.journeyTop}>
                  <Text style={styles.journeyTitle} numberOfLines={1}>{j.title}</Text>
                  <Text style={styles.journeyDate}>{j.daysAgo}</Text>
                </View>
                <Text style={styles.journeyQuote} numberOfLines={1}>{j.quote}</Text>
                <View style={styles.journeyStats}>
                  {j.stats.map((s) => (
                    <View key={s.value} style={styles.journeyStatChip}>
                      <MaterialCommunityIcons name={s.icon as any} size={12} color={s.color} />
                      <Text style={[styles.journeyStatText, { color: s.color }]}>{s.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.dashedButton} activeOpacity={0.6}>
            <Text style={styles.dashedButtonText}>LOG NEW OUTING</Text>
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

        {/* Connected Devices */}
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
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={26} color="#ffffff" />
      </TouchableOpacity>
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
    backgroundColor: C.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${C.surfaceContainerHighest}80`,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBrand: {
    fontSize: 22,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: `${C.primary}99`,
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: C.onSurface,
    lineHeight: 58,
    letterSpacing: -0.5,
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: `${C.surfaceContainerHighest}66`,
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statItemWide: {
    flex: 1,
    minWidth: '40%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: C.primary,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: `${C.onSurface}66`,
    marginTop: 1,
  },
  statLabelInline: {
    fontSize: 16,
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
    fontSize: 17,
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
    fontSize: 14,
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
    fontSize: 17,
    fontWeight: '700',
    color: C.primary,
    flex: 1,
  },
  journeyDate: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: `${C.onSurface}66`,
  },
  journeyQuote: {
    fontSize: 14,
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
  journeyStatText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  dashedButton: {
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${C.primary}33`,
    borderRadius: 12,
    alignItems: 'center',
  },
  dashedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: `${C.primary}99`,
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
    fontSize: 14,
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
    fontSize: 17,
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
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.onSurface,
  },
  deviceStatus: {
    fontSize: 14,
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
    fontSize: 14,
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
