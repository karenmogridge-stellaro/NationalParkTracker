import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

const TOP3 = [
  { rank: 2, name: 'Sarah W.', km: '32.4 km', avatar: 'https://i.pravatar.cc/80?img=47' },
  { rank: 1, name: 'Marcus K.', km: '45.8 km', avatar: 'https://i.pravatar.cc/80?img=12' },
  { rank: 3, name: 'Elena R.', km: '28.1 km', avatar: 'https://i.pravatar.cc/80?img=45' },
];

const LIST_ROWS = [
  { rank: 4, name: 'David Chen', trails: '12 TRAILS LOGGED', km: '24.2 km', isYou: false, avatar: 'https://i.pravatar.cc/80?img=33' },
  { rank: 5, name: 'You (Theo)', trails: '9 TRAILS LOGGED', km: '19.5 km', isYou: true, avatar: 'https://i.pravatar.cc/80?img=15' },
  { rank: 6, name: 'Lila Vance', trails: '7 TRAILS LOGGED', km: '15.1 km', isYou: false, avatar: 'https://i.pravatar.cc/80?img=49' },
];

export default function ActivityScreen() {
  const [cheered, setCheered] = useState(false);

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
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>SOCIAL CIRCLE</Text>
          <Text style={styles.heroTitle}>Weekly <Text style={styles.heroTitleItalic}>Expeditions</Text></Text>
          <Text style={styles.heroBody}>
            Your tribe has covered 142 miles this week. Keep the pace to maintain the lead in the regional bracket.
          </Text>
          <TouchableOpacity style={styles.findBtn} activeOpacity={0.85}>
            <Ionicons name="person-add" size={16} color={C.onPrimary} />
            <Text style={styles.findBtnText}>Find Explorers</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <Text style={styles.endsText}>ENDS IN 2D 14H</Text>
          </View>

          {/* Podium top 3 */}
          <View style={styles.podium}>
            {/* #2 left */}
            <View style={[styles.podiumItem, styles.podiumSide]}>
              <Image source={{ uri: TOP3[0].avatar }} style={styles.podiumAvatarSide} />
              <View style={styles.rankBadgeSide}><Text style={styles.rankBadgeText}>2</Text></View>
              <Text style={styles.podiumName}>{TOP3[0].name}</Text>
              <Text style={styles.podiumKm}>{TOP3[0].km}</Text>
            </View>

            {/* #1 center */}
            <View style={[styles.podiumItem, styles.podiumCenter]}>
              <View style={styles.podiumAvatarWrap}>
                <Image source={{ uri: TOP3[1].avatar }} style={styles.podiumAvatarCenter} />
              </View>
              <View style={styles.rankBadgeFirst}><Text style={styles.rankBadgeFirstText}>1</Text></View>
              <Text style={[styles.podiumName, styles.podiumNameBold]}>{TOP3[1].name}</Text>
              <Text style={[styles.podiumKm, styles.podiumKmBold]}>{TOP3[1].km}</Text>
            </View>

            {/* #3 right */}
            <View style={[styles.podiumItem, styles.podiumSide]}>
              <Image source={{ uri: TOP3[2].avatar }} style={styles.podiumAvatarSide} />
              <View style={styles.rankBadgeSide}><Text style={styles.rankBadgeText}>3</Text></View>
              <Text style={styles.podiumName}>{TOP3[2].name}</Text>
              <Text style={styles.podiumKm}>{TOP3[2].km}</Text>
            </View>
          </View>

          {/* List rows */}
          <View style={styles.leaderList}>
            {LIST_ROWS.map((row) => (
              <View key={row.rank} style={[styles.leaderRow, row.isYou && styles.leaderRowYou]}>
                <Text style={[styles.leaderRank, row.isYou && styles.leaderTextYou]}>{row.rank}</Text>
                <Image source={{ uri: row.avatar }} style={styles.leaderAvatar} />
                <View style={styles.leaderInfo}>
                  <Text style={[styles.leaderName, row.isYou && styles.leaderTextYou]}>{row.name}</Text>
                  <Text style={[styles.leaderTrails, row.isYou && styles.leaderTrailsYou]}>{row.trails}</Text>
                </View>
                <Text style={[styles.leaderKm, row.isYou && styles.leaderTextYou]}>{row.km}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Circle Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Circle Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Activity 1 — trail completion */}
          <View style={styles.activityCard}>
            <View style={styles.activityDot} />
            <View style={styles.activityCardInner}>
              <View style={styles.activityHeader}>
                <Image source={{ uri: 'https://i.pravatar.cc/80?img=12' }} style={styles.activityAvatar} />
                <View style={styles.activityMeta}>
                  <Text style={styles.activityDesc}>
                    <Text style={styles.activityName}>Marcus K.</Text>
                    {' '}completed{' '}
                    <Text style={styles.activityHighlight}>"Eagle{"'"}s Nest Summit"</Text>
                  </Text>
                  <Text style={styles.activityTime}>2 hours ago • Olympic National Park</Text>
                </View>
              </View>
              <View style={styles.trailPhotoWrap}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80' }}
                  style={styles.trailPhoto}
                  resizeMode="cover"
                />
                <View style={styles.trailPhotoOverlay} />
                <View style={styles.trailStats}>
                  <View>
                    <Text style={styles.trailStatLabel}>DISTANCE</Text>
                    <Text style={styles.trailStatValue}>12.4 km</Text>
                  </View>
                  <View style={styles.trailStatDivider} />
                  <View>
                    <Text style={styles.trailStatLabel}>GAIN</Text>
                    <Text style={styles.trailStatValue}>+640 m</Text>
                  </View>
                </View>
                <Text style={styles.trailViewLabel}>TRAIL VIEW</Text>
              </View>
              <View style={styles.activityActions}>
                <View style={styles.likeRow}>
                  <Ionicons name="heart" size={16} color={C.primary} />
                  <Text style={styles.likeCount}>+12</Text>
                </View>
                <TouchableOpacity
                  style={[styles.cheerBtn, cheered && styles.cheerBtnActive]}
                  activeOpacity={0.8}
                  onPress={() => setCheered(!cheered)}
                >
                  <MaterialCommunityIcons name="party-popper" size={15} color={cheered ? C.onPrimary : C.primary} />
                  <Text style={[styles.cheerBtnText, cheered && styles.cheerBtnTextActive]}>Cheer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.flagBtn} activeOpacity={0.7}>
                  <Ionicons name="flag-outline" size={18} color={C.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Activity 2 — badge earned */}
          <View style={styles.activityCard}>
            <View style={[styles.activityDot, styles.activityDotMuted]} />
            <View style={styles.activityCardInner}>
              <View style={styles.activityHeader}>
                <Image source={{ uri: 'https://i.pravatar.cc/80?img=47' }} style={styles.activityAvatar} />
                <View style={styles.activityMeta}>
                  <Text style={styles.activityDesc}>
                    <Text style={styles.activityName}>Sarah W.</Text>
                    {' '}earned a new badge
                  </Text>
                  <Text style={styles.activityTime}>5 hours ago</Text>
                </View>
              </View>
              <View style={styles.badgeCard}>
                <View style={styles.badgeIconWrap}>
                  <MaterialCommunityIcons name="image-filter-hdr" size={32} color={C.primary} />
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={styles.badgeName}>Peak Bagging{'\n'}Specialist</Text>
                  <Text style={styles.badgeDesc}>Logged 5 summits over 2,000m elevation this month.</Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.cheerLink}>Cheer on Sarah &gt;</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Activity 3 — new expedition */}
          <View style={styles.activityCard}>
            <View style={[styles.activityDot, styles.activityDotMuted]} />
            <View style={styles.activityCardInner}>
              <View style={styles.activityHeader}>
                <Image source={{ uri: 'https://i.pravatar.cc/80?img=45' }} style={styles.activityAvatar} />
                <View style={styles.activityMeta}>
                  <Text style={styles.activityDesc}>
                    <Text style={styles.activityName}>Elena R.</Text>
                    {' '}is starting a new expedition
                  </Text>
                  <Text style={styles.activityTime}>Yesterday • Redwood National Forest</Text>
                </View>
              </View>
              <View style={styles.expeditionCard}>
                <Text style={styles.expeditionLabel}>GROUP HIKE</Text>
                <View style={styles.expeditionRow}>
                  <Text style={styles.expeditionTitle}>Redwood Sentinel Loop</Text>
                  <TouchableOpacity style={styles.expeditionJoinBtn} activeOpacity={0.8}>
                    <Ionicons name="add" size={20} color={C.onPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.expeditionFooter}>
                  <View style={styles.expeditionAvatars}>
                    <View style={[styles.expeditionAvatar, { zIndex: 3 }]}>
                      <Image source={{ uri: 'https://i.pravatar.cc/40?img=45' }} style={styles.expeditionAvatarImg} />
                    </View>
                    <View style={[styles.expeditionAvatar, { zIndex: 2, marginLeft: -10 }]}>
                      <Image source={{ uri: 'https://i.pravatar.cc/40?img=33' }} style={styles.expeditionAvatarImg} />
                    </View>
                  </View>
                  <Text style={styles.expeditionGoingText}>+ 4 others are going</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Chat Button */}
      <TouchableOpacity style={styles.fabChat} activeOpacity={0.85}>
        <Ionicons name="chatbubble" size={22} color={C.onPrimary} />
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Hero
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.secondary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: C.primary,
    lineHeight: 56,
    letterSpacing: -1,
    marginBottom: 14,
  },
  heroTitleItalic: {
    fontSize: 48,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.primary,
    letterSpacing: -1,
  },
  heroBody: {
    fontSize: 15,
    color: C.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 20,
  },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 10,
  },
  findBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onPrimary,
  },

  // Section
  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  endsText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.secondary,
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.secondary,
  },

  // Podium
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  podiumItem: {
    alignItems: 'center',
    gap: 4,
  },
  podiumCenter: {
    marginBottom: 0,
  },
  podiumSide: {
    marginBottom: 10,
  },
  podiumAvatarWrap: {
    borderWidth: 2.5,
    borderColor: C.primary,
    borderRadius: 44,
    padding: 2,
  },
  podiumAvatarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  podiumAvatarSide: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  rankBadgeFirst: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  rankBadgeFirstText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.onPrimary,
  },
  rankBadgeSide: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  podiumName: {
    fontSize: 13,
    color: C.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  podiumNameBold: {
    fontWeight: '800',
    fontSize: 14,
  },
  podiumKm: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  podiumKmBold: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  // Leaderboard list
  leaderList: {
    gap: 8,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leaderRowYou: {
    backgroundColor: C.primary,
  },
  leaderRank: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    width: 18,
    textAlign: 'center',
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  leaderInfo: {
    flex: 1,
    gap: 2,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  leaderTrails: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  leaderTrailsYou: {
    color: 'rgba(255,255,255,0.65)',
  },
  leaderKm: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  leaderTextYou: {
    color: C.onPrimary,
  },

  // Activity feed
  activityCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.primary,
    marginTop: 16,
    flexShrink: 0,
  },
  activityDotMuted: {
    backgroundColor: C.outlineVariant,
  },
  activityCardInner: {
    flex: 1,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityMeta: {
    flex: 1,
    gap: 3,
  },
  activityDesc: {
    fontSize: 14,
    color: C.onSurface,
    lineHeight: 20,
  },
  activityName: {
    fontWeight: '700',
    color: C.onSurface,
  },
  activityHighlight: {
    fontStyle: 'italic',
  },
  activityTime: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },

  // Trail photo card
  trailPhotoWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 160,
    position: 'relative',
  },
  trailPhoto: {
    width: '100%',
    height: '100%',
  },
  trailPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  trailStats: {
    position: 'absolute',
    bottom: 28,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trailStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  trailStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  trailStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  trailViewLabel: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
  },

  // Actions row
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 2,
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  cheerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cheerBtnActive: {
    backgroundColor: C.primary,
  },
  cheerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  cheerBtnTextActive: {
    color: C.onPrimary,
  },
  flagBtn: {
    marginLeft: 'auto',
    padding: 4,
  },

  // Badge card
  badgeCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
  badgeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#c8e6c9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: {
    flex: 1,
    gap: 4,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '800',
    color: C.primary,
    lineHeight: 22,
  },
  badgeDesc: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 18,
  },
  cheerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: C.secondary,
    marginTop: 4,
  },

  // Expedition card
  expeditionCard: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  expeditionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  expeditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  expeditionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onPrimary,
    flex: 1,
    lineHeight: 24,
  },
  expeditionJoinBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expeditionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expeditionAvatars: {
    flexDirection: 'row',
  },
  expeditionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.primary,
  },
  expeditionAvatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  expeditionGoingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },

  // FAB
  fabChat: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
