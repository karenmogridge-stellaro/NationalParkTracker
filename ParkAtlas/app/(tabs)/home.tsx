import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
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
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Mist_trail_yosemite.jpg/640px-Mist_trail_yosemite.jpg',
  },
  {
    id: '2',
    title: 'Cathedral Grove Loop',
    quote: '"Silent morning among the giants. Perfect solitude."',
    stats: [{ icon: 'routes', value: '3.1 mi', color: C.secondary }, { icon: 'timer-outline', value: '1h 45m', color: C.tertiary }],
    daysAgo: '1 WEEK AGO',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Clouds_on_Mount_Tamalpais.jpg/640px-Above_Clouds_on_Mount_Tamalpais.jpg',
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
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="menu" size={26} color={C.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>ParkAtlas</Text>
        </View>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.7}>
          <Ionicons name="person" size={20} color={C.onPrimary} />
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
            <Text style={styles.welcomeTitle}>Welcome back, Karen.</Text>
          </View>
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

          {journeys.map((j) => (
            <TouchableOpacity key={j.id} style={styles.journeyCard} activeOpacity={0.7}>
              {j.image ? (
                <Image source={{ uri: j.image }} style={styles.journeyThumb} />
              ) : (
                <View style={styles.journeyThumb}>
                  <MaterialCommunityIcons name="image-outline" size={26} color={C.outlineVariant} />
                </View>
              )}
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
  statsSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    backgroundColor: C.surfaceContainerLow,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.surfaceContainerHighest,
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
    fontSize: 18,
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
