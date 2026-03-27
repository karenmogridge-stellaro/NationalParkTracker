import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const FILTERS = [
  { key: 'near',     label: 'Near Me' },
  { key: 'national', label: 'National Parks' },
  { key: 'pet',      label: 'Pet Friendly' },
  { key: 'easy',     label: 'Easy Trails' },
  { key: 'camping',  label: 'Camping' },
] as const;

const SEASONAL = [
  {
    id: '1',
    badge: "EDITOR'S CHOICE",
    title: 'Emerald Peak Basin',
    subtitle: 'Experience the rhythmic transition of gold and green in the heart of the Cascades.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Mist_trail_yosemite.jpg/640px-Mist_trail_yosemite.jpg',
    tall: true,
  },
  {
    id: '2',
    badge: null,
    title: 'Old Growth Redwoods',
    subtitle: 'COASTAL CALIFORNIA',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Muir_woods_2013.jpg/640px-Muir_woods_2013.jpg',
    tall: false,
  },
];

const TERRAIN = [
  { key: 'coastline', label: 'Coastline', parks: 124, icon: 'waves'     },
  { key: 'alpine',    label: 'Alpine',    parks: 89,  icon: 'terrain'   },
  { key: 'woodland',  label: 'Woodland',  parks: 312, icon: 'pine-tree' },
  { key: 'desert',    label: 'Desert',    parks: 56,  icon: 'grain'     },
] as const;

export default function ExploreScreen() {
  const [activeFilter, setActiveFilter] = useState<string>('near');
  const [searchText, setSearchText] = useState('');

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
        <TouchableOpacity style={styles.avatar} activeOpacity={0.7}>
          <Ionicons name="person" size={20} color={C.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={C.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Find your next expedition..."
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

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.7}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Seasonal Highlights */}
        <View style={styles.seasonalHeader}>
          <Text style={styles.seasonalTitle}>{'Seasonal\nHighlights'}</Text>
          <Text style={styles.seasonalDate}>{"AUTUMN\n'24"}</Text>
        </View>

        {/* Editorial Cards */}
        {SEASONAL.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[styles.editorialCard, card.tall && styles.editorialCardTall]}
            activeOpacity={0.9}
          >
            <Image source={{ uri: card.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={styles.editorialOverlay} />
            {card.badge && (
              <View style={styles.editorBadge}>
                <Text style={styles.editorBadgeText}>{card.badge}</Text>
              </View>
            )}
            <View style={[styles.editorialInfo, !card.tall && styles.editorialInfoCompact]}>
              <Text style={[styles.editorialTitle, !card.tall && styles.editorialTitleSmall]}>
                {card.title}
              </Text>
              {card.tall ? (
                <Text style={styles.editorialSubtitle}>{card.subtitle}</Text>
              ) : (
                <Text style={styles.editorialLocation}>{card.subtitle}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* CTA Card */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <MaterialCommunityIcons name="compass-outline" size={20} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.ctaTitle}>Ready for the Ridge?</Text>
          <Text style={styles.ctaBody}>Our new high-altitude gear guide is live for professional explorers.</Text>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>READ JOURNAL</Text>
          </TouchableOpacity>
        </View>

        {/* Browse by Terrain */}
        <View style={styles.terrainSection}>
          <View style={styles.terrainHeaderRow}>
            <View style={styles.terrainAccent} />
            <Text style={styles.terrainTitle}>Browse by Terrain</Text>
          </View>
          <View style={styles.terrainGrid}>
            {TERRAIN.map((t) => (
              <TouchableOpacity key={t.key} style={styles.terrainCard} activeOpacity={0.8}>
                <MaterialCommunityIcons name={t.icon as any} size={28} color={C.primary} />
                <Text style={styles.terrainLabel}>{t.label}</Text>
                <Text style={styles.terrainCount}>{t.parks} PARKS</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Challenge Card */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeIconWrap}>
            <MaterialCommunityIcons name="trophy" size={22} color={C.onPrimary} />
          </View>
          <View style={styles.challengeBody}>
            <Text style={styles.challengeTitle}>Fall Hiker Challenge</Text>
            <Text style={styles.challengeSubtitle}>4 of 10 parks visited this season</Text>
            <View style={styles.challengeTrack}>
              <View style={[styles.challengeFill, { width: '40%' }]} />
            </View>
            <View style={styles.challengeFooter}>
              <Text style={styles.challengeLevel}>BEGINNER</Text>
              <Text style={styles.challengeGoal}>6 TO GO FOR BADGE</Text>
            </View>
          </View>
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
    width: 32,
    height: 32,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onPrimary,
    letterSpacing: -0.2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.onSurface,
  },
  chipsRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurface,
  },
  chipLabelActive: {
    color: C.onPrimary,
  },
  seasonalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  seasonalTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.primary,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  seasonalDate: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1.5,
    textAlign: 'right',
    marginTop: 4,
  },
  editorialCard: {
    width: SCREEN_WIDTH,
    height: 220,
    overflow: 'hidden',
    marginBottom: 3,
  },
  editorialCardTall: {
    height: 300,
  },
  editorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  editorBadge: {
    position: 'absolute',
    top: 18,
    left: 20,
    backgroundColor: C.secondary,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
  },
  editorialInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 6,
  },
  editorialInfoCompact: {
    padding: 16,
    gap: 3,
  },
  editorialTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  editorialTitleSmall: {
    fontSize: 20,
    lineHeight: 24,
  },
  editorialSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  editorialLocation: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  ctaCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 24,
    gap: 10,
  },
  ctaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#c8e6c9',
    letterSpacing: -0.3,
  },
  ctaBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
  },
  terrainSection: {
    paddingTop: 32,
    paddingHorizontal: 20,
    gap: 18,
  },
  terrainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  terrainAccent: {
    width: 4,
    height: 26,
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  terrainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  terrainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  terrainCard: {
    width: '47%',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 18,
    gap: 8,
    alignItems: 'flex-start',
  },
  terrainLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  terrainCount: {
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  challengeCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  challengeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  challengeBody: {
    flex: 1,
    gap: 6,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  challengeSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  challengeTrack: {
    height: 6,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 2,
  },
  challengeFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 99,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  challengeLevel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1,
  },
  challengeGoal: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.5,
  },
});
