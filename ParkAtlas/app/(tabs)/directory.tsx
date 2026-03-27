import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const NEARBY = [
  {
    id: '1',
    distance: '4.2 MI AWAY',
    name: 'Hurricane Ridge',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Hurricane_Ridge_in_the_Olympic_Mountains.jpg/640px-Hurricane_Ridge_in_the_Olympic_Mountains.jpg',
  },
  {
    id: '2',
    distance: '12.8 MI AWAY',
    name: 'Ruby Beach',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ruby_Beach_Sunset.jpg/640px-Ruby_Beach_Sunset.jpg',
  },
  {
    id: '3',
    distance: '8.5 MI AWAY',
    name: 'Sol Duc Falls',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Sol_Duc_Falls.jpg/640px-Sol_Duc_Falls.jpg',
  },
];

export default function DirectoryScreen() {
  const [progress] = useState(65);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/parkatlas-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerBrand}>Park Atlas</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
            <Ionicons name="search" size={20} color={C.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.7}>
            <Ionicons name="person" size={18} color={C.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Hoh_Rain_Forest%2C_Olympic_National_Park%2C_Washington.jpg/640px-Hoh_Rain_Forest%2C_Olympic_National_Park%2C_Washington.jpg' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroBadges}>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText}>WASHINGTON, USA</Text>
            </View>
            <View style={styles.badgeOutline}>
              <Text style={styles.badgeOutlineText}>HERITAGE</Text>
            </View>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Hoh Rain Forest Loop</Text>
            <Text style={styles.heroSub}>Olympic National Park</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={18} color={C.onSurfaceVariant} />
            <Text style={styles.statLabel}>LENGTH</Text>
            <Text style={styles.statValue}>1.2 mi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="triangle-outline" size={18} color={C.onSurfaceVariant} />
            <Text style={styles.statLabel}>ELEVATION</Text>
            <Text style={styles.statValue}>82 ft</Text>
          </View>
          <View style={[styles.statDivider, { marginTop: 16 }]} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={C.onSurfaceVariant} />
            <Text style={styles.statLabel}>EST. TIME</Text>
            <Text style={styles.statValue}>45m</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="signal-cellular-2" size={18} color={C.onSurfaceVariant} />
            <Text style={styles.statLabel}>DIFFICULTY</Text>
            <Text style={styles.statValue}>Easy</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Hall of Mosses</Text>
          <Text style={styles.body}>
            Experience the primeval beauty of one of the world's few temperate rainforests. This legendary loop takes you through a cathedral of ancient Bigleaf Maples and Sitka Spruces, draped in thick blankets of Clubmoss. The trail is mostly flat, making it an ideal exploration for all naturalist levels seeking the quiet solitude of the Olympic Peninsula.
          </Text>
          <View style={styles.photoRow}>
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Hall_of_Mosses.jpg/320px-Hall_of_Mosses.jpg' }}
              style={styles.photoThumb}
              resizeMode="cover"
            />
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Hoh_Rain_Forest%2C_Olympic_National_Park%2C_Washington.jpg/320px-Hoh_Rain_Forest%2C_Olympic_National_Park%2C_Washington.jpg' }}
              style={styles.photoThumb}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Expedition{' '}Progress</Text>
            <Text style={styles.progressPct}>{progress}% Discovered</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            Complete the Hall of Mosses loop to unlock the "Rainforest Pioneer" badge.
          </Text>
        </View>

        {/* Topographic Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapLabel}>TOPOGRAPHIC VIEW</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.mapFull}>Full Screen</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapBody}>
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Topographic_map_example.png/640px-Topographic_map_example.png' }}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <View style={styles.mapControls}>
              <TouchableOpacity style={styles.mapBtn} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color={C.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapBtn} activeOpacity={0.8}>
                <Ionicons name="remove" size={18} color={C.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mapBtn, { marginTop: 6 }]} activeOpacity={0.8}>
                <Ionicons name="location" size={18} color={C.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Current Conditions */}
        <View style={styles.condCard}>
          <Text style={styles.condLabel}>CURRENT CONDITIONS</Text>
          <View style={styles.condRow}>
            <View style={styles.condItem}>
              <Ionicons name="partly-sunny" size={22} color={C.onSurfaceVariant} />
              <Text style={styles.condValue}>54°F</Text>
              <Text style={styles.condSub}>Light Mist</Text>
            </View>
            <View style={styles.condSep} />
            <View style={styles.condItem}>
              <Ionicons name="eye-outline" size={22} color={C.onSurfaceVariant} />
              <Text style={styles.condValue}>Visibility</Text>
              <Text style={styles.condSub}>High (8.2 mi)</Text>
            </View>
          </View>
        </View>

        {/* Start Hike CTA */}
        <TouchableOpacity style={styles.startBtn} activeOpacity={0.85}>
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.startBtnText}>Start Hike</Text>
        </TouchableOpacity>
        <Text style={styles.essentials}>ALWAYS CARRY THE 10 ESSENTIALS</Text>

        {/* Nearby Discoveries */}
        <View style={styles.section}>
          <Text style={styles.nearbyTitle}>Nearby Discoveries</Text>
          {NEARBY.map((item) => (
            <TouchableOpacity key={item.id} style={styles.nearbyCard} activeOpacity={0.85}>
              <Image
                source={{ uri: item.image }}
                style={styles.nearbyImage}
                resizeMode="cover"
              />
              <View style={styles.nearbyOverlay} />
              <View style={styles.nearbyInfo}>
                <Text style={styles.nearbyDist}>{item.distance}</Text>
                <Text style={styles.nearbyName}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerBrand: {
    fontSize: 17,
    fontWeight: '700',
    color: C.onPrimary,
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    padding: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Hero
  hero: {
    width: SCREEN_WIDTH,
    height: 280,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  heroBadges: {
    position: 'absolute',
    top: 18,
    left: 18,
    flexDirection: 'row',
    gap: 8,
  },
  badgeGreen: {
    backgroundColor: C.secondary,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  badgeOutline: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOutlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 20,
    left: 18,
    right: 18,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 0,
    backgroundColor: C.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  statItem: {
    width: '47%',
    paddingVertical: 10,
    gap: 4,
  },
  statDivider: {
    width: '6%',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.3,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    color: C.onSurfaceVariant,
    lineHeight: 23,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  photoThumb: {
    flex: 1,
    height: 110,
    borderRadius: 10,
    backgroundColor: C.surfaceContainerHighest,
  },

  // Progress
  progressCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
    lineHeight: 22,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    textAlign: 'right',
    lineHeight: 18,
  },
  progressTrack: {
    height: 8,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 99,
  },
  progressHint: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    lineHeight: 19,
  },

  // Map
  mapCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.surfaceContainerLow,
  },
  mapLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1.2,
  },
  mapFull: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  mapBody: {
    height: 180,
    position: 'relative',
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 0,
  },
  mapBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Conditions
  condCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  condLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  condItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  condSep: {
    width: 1,
    height: 50,
    backgroundColor: C.outlineVariant,
  },
  condValue: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
  },
  condSub: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },

  // CTA
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  essentials: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 1.5,
    marginTop: 8,
  },

  // Nearby
  nearbyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  nearbyCard: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.surfaceContainerHighest,
  },
  nearbyImage: {
    ...StyleSheet.absoluteFillObject,
  },
  nearbyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  nearbyInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  nearbyDist: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  nearbyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
