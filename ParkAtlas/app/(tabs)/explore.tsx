import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  Pressable,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { ParkAtlas as C } from '@/constants/theme';
import { router } from 'expo-router';
import { PARKS, NationalPark } from '../../data/parksData';
import { STATE_PARKS } from '../../data/stateParksData';
import { useVisitedParks } from '../../hooks/useVisitedParks';
import { matchesWildcardQuery, stateNameFromCode } from '@/utils/search';
import { useAuth } from '@/hooks/useAuth';

const CHECKLIST_LEGACY_FILE = `${FileSystem.documentDirectory}park_checklist.json`;
const NEAR_ME_RADIUS_MILES = 150;
const NEAR_ME_RADIUS_KM = NEAR_ME_RADIUS_MILES * 1.60934;

const FILTERS = [
  { key: 'near',     label: 'Near Me' },
  { key: 'national', label: 'National Parks' },
  { key: 'to-visit', label: 'To Visit' },
  { key: 'visited',  label: 'Visited' },
] as const;

export default function ExploreScreen() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]['key']>('national');
  const [searchText, setSearchText] = useState('');
  const [visitView, setVisitView] = useState<'visited' | 'unvisited'>('unvisited');
  const [mapFilter, setMapFilter] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [parkTypeFilter, setParkTypeFilter] = useState<'all' | 'national' | 'state'>('all');
  const [selectedMapPark, setSelectedMapPark] = useState<NationalPark | null>(null);
  const [checklistIds, setChecklistIds] = useState<string[]>([]);
  const [checklistModalVisible, setChecklistModalVisible] = useState(false);
  const [checklistSearchText, setChecklistSearchText] = useState('');
  const [optimisticVisitedIds, setOptimisticVisitedIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearMeStatus, setNearMeStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'error'>('idle');
  const [nearMeZipInput, setNearMeZipInput] = useState('');
  const [nearMeZipCode, setNearMeZipCode] = useState<string | null>(null);
  const [nearMeLocationSource, setNearMeLocationSource] = useState<'device' | 'zip'>('device');
  const [nearMeZipError, setNearMeZipError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 39.5,
    longitude: -98.35,
    latitudeDelta: 40,
    longitudeDelta: 70,
  });
  const mapRef = React.useRef<MapView | null>(null);
  const { hasVisited, logVisit } = useVisitedParks();
  const { user } = useAuth();

  const allParks = useMemo<NationalPark[]>(() => {
    return [...PARKS.map((p) => ({ ...p, type: 'national' as const })), ...STATE_PARKS];
  }, []);

  const nationalParkIds = useMemo(() => new Set(PARKS.map((p) => p.id)), []);

  const hasVisitedUI = useCallback((parkId: string) => {
    return optimisticVisitedIds.includes(parkId) || hasVisited(parkId);
  }, [optimisticVisitedIds, hasVisited]);

  const distanceKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }, []);

  const ensureNearMeLocation = useCallback(async (force = false) => {
    if (!force && nearMeStatus === 'loading') return;
    setNearMeStatus('loading');
    setNearMeZipError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearMeStatus('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setNearMeLocationSource('device');
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        const postalCode = reverse?.[0]?.postalCode;
        setNearMeZipCode(postalCode || null);
      } catch {
        setNearMeZipCode(null);
      }
      setNearMeStatus('ready');
    } catch {
      setNearMeStatus('error');
    }
  }, [nearMeStatus]);

  const applyNearMeZip = useCallback(async () => {
    const normalized = nearMeZipInput.trim();
    if (!/^\d{5}$/.test(normalized)) {
      setNearMeZipError('Enter a valid 5-digit ZIP code.');
      return;
    }

    setNearMeStatus('loading');
    setNearMeZipError(null);
    try {
      const geocoded = await Location.geocodeAsync(normalized);
      if (!geocoded.length) {
        setNearMeStatus('error');
        setNearMeZipError('ZIP code not found.');
        return;
      }

      const chosen = geocoded[0];
      setUserLocation({ latitude: chosen.latitude, longitude: chosen.longitude });
      setNearMeZipCode(normalized);
      setNearMeLocationSource('zip');
      setNearMeStatus('ready');
    } catch {
      setNearMeStatus('error');
      setNearMeZipError('Unable to look up ZIP code. Try again.');
    }
  }, [nearMeZipInput]);

  const useDeviceLocation = useCallback(async () => {
    await ensureNearMeLocation(true);
  }, [ensureNearMeLocation]);

  function checklistFileForUser(userId: string): string {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${FileSystem.documentDirectory}park_checklist_${safeUserId}.json`;
  }

  useMemo(() => {
    // no-op placeholder to keep hook order stable if we add effects below
    return undefined;
  }, []);

  React.useEffect(() => {
    if (activeFilter === 'near' && nearMeStatus === 'idle') {
      ensureNearMeLocation();
    }
  }, [activeFilter, nearMeStatus, ensureNearMeLocation]);

  React.useEffect(() => {
    (async () => {
      if (!user?.id) {
        setChecklistIds([]);
        return;
      }

      try {
        const filePath = checklistFileForUser(user.id);
        const userFileInfo = await FileSystem.getInfoAsync(filePath);
        if (userFileInfo.exists) {
          const raw = await FileSystem.readAsStringAsync(filePath);
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setChecklistIds(parsed.filter((id): id is string => typeof id === 'string'));
            return;
          }
        }

        const legacyInfo = await FileSystem.getInfoAsync(CHECKLIST_LEGACY_FILE);
        if (legacyInfo.exists) {
          const legacyRaw = await FileSystem.readAsStringAsync(CHECKLIST_LEGACY_FILE);
          const legacyParsed = JSON.parse(legacyRaw);
          if (Array.isArray(legacyParsed)) {
            const ids = legacyParsed.filter((id): id is string => typeof id === 'string');
            setChecklistIds(ids);
            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(ids));
            return;
          }
        }
      } catch {
        // Ignore parse/read errors and start from empty list.
      }

      setChecklistIds([]);
    })();
  }, [user?.id]);

  async function persistChecklist(nextIds: string[]) {
    if (!user?.id) {
      setChecklistIds(nextIds);
      return;
    }
    await FileSystem.writeAsStringAsync(checklistFileForUser(user.id), JSON.stringify(nextIds));
    setChecklistIds(nextIds);
  }

  async function toggleChecklistPark(parkId: string) {
    const exists = checklistIds.includes(parkId);
    const next = exists ? checklistIds.filter((id) => id !== parkId) : [...checklistIds, parkId];
    await persistChecklist(next);
  }

  async function markParkVisited(park: NationalPark) {
    if (hasVisitedUI(park.id)) return;
    if (!checklistIds.includes(park.id)) {
      await persistChecklist([...checklistIds, park.id]);
    }
    setOptimisticVisitedIds((prev) => (prev.includes(park.id) ? prev : [...prev, park.id]));
    try {
      await logVisit(park.id, park.name, '', { dateUnknown: true });
    } finally {
      setOptimisticVisitedIds((prev) => prev.filter((id) => id !== park.id));
    }
  }

  const isSearching = searchText.trim().length > 0;
  const filteredParks = useMemo<NationalPark[]>(() => {
    if (!isSearching) return [];
    const q = searchText.trim().toLowerCase();
    return allParks.filter((p) => matchesWildcardQuery(q, [p.name, p.state, stateNameFromCode(p.state), p.npsCode]));
  }, [searchText, isSearching, allParks]);

  const visitedCount = useMemo(() => allParks.filter((p) => hasVisitedUI(p.id)).length, [hasVisitedUI, allParks]);
  const checklistParksAll = useMemo(() => {
    const set = new Set(checklistIds);
    return allParks.filter((park) => set.has(park.id));
  }, [checklistIds, allParks]);

  const checklistParks = useMemo(() => {
    if (visitView === 'visited') {
      return allParks.filter((park) => hasVisitedUI(park.id)).slice(0, 8);
    }
    return checklistParksAll.filter((park) => !hasVisitedUI(park.id)).slice(0, 8);
  }, [visitView, hasVisitedUI, checklistParksAll, allParks]);

  const nationalVisitedCount = useMemo(
    () => PARKS.filter((park) => hasVisitedUI(park.id)).length,
    [hasVisitedUI],
  );
  const parksToGo = Math.max(0, PARKS.length - nationalVisitedCount);

  const nearMeRankedEntries = useMemo(() => {
    if (!userLocation) return [] as { park: NationalPark; distance: number }[];
    const ranked = allParks
      .map((park) => ({
        park,
        distance: distanceKm(userLocation.latitude, userLocation.longitude, park.lat, park.lng),
      }))
      .sort((a, b) => a.distance - b.distance);
    const withinRadius = ranked.filter((entry) => entry.distance <= NEAR_ME_RADIUS_KM);
    return withinRadius.length > 0 ? withinRadius : ranked.slice(0, 20);
  }, [userLocation, allParks, distanceKm]);

  const nearMeRankedParks = useMemo(
    () => nearMeRankedEntries.map((entry) => entry.park),
    [nearMeRankedEntries],
  );

  const nearMeParkIds = useMemo(() => {
    if (nearMeRankedParks.length === 0) return null;
    return new Set(nearMeRankedParks.map((park) => park.id));
  }, [nearMeRankedParks]);

  const nextAdventurePark = useMemo(() => {
    const nearbyUnvisited = nearMeRankedParks.find((park) => !hasVisitedUI(park.id));
    if (nearbyUnvisited) return nearbyUnvisited;

    const fromList = checklistParksAll.find((park) => !hasVisitedUI(park.id));
    if (fromList) return fromList;
    return allParks.find((park) => !hasVisitedUI(park.id)) ?? null;
  }, [nearMeRankedParks, checklistParksAll, allParks, hasVisitedUI]);

  const nextAdventureDistanceKm = useMemo(() => {
    if (!nextAdventurePark) return null;
    const match = nearMeRankedEntries.find((entry) => entry.park.id === nextAdventurePark.id);
    return match ? Math.round(match.distance) : null;
  }, [nearMeRankedEntries, nextAdventurePark]);

  const nextAdventureReason = useMemo(() => {
    if (!nextAdventurePark) return '';
    const isNearby = nearMeRankedParks.some((park) => park.id === nextAdventurePark.id);
    if (isNearby) {
      return nextAdventureDistanceKm !== null
        ? `Nearest unvisited park (${nextAdventureDistanceKm} km away)`
        : 'Picked because it is near you';
    }
    const isFromList = checklistParksAll.some((park) => park.id === nextAdventurePark.id);
    if (isFromList) return 'Picked from your To Visit list';
    return 'Picked from all unvisited parks';
  }, [nextAdventurePark, nearMeRankedParks, checklistParksAll, nextAdventureDistanceKm]);

  const checklistPickerParks = useMemo(() => {
    const q = checklistSearchText.trim();
    if (!q) return allParks;
    return allParks.filter((p) => matchesWildcardQuery(q, [p.name, p.state, stateNameFromCode(p.state), p.npsCode]));
  }, [checklistSearchText, allParks]);

  const nearMeStatusText = useMemo(() => {
    if (activeFilter !== 'near') return '';
    if (nearMeStatus === 'loading') {
      return nearMeLocationSource === 'zip'
        ? `Looking up ZIP ${nearMeZipInput.trim() || nearMeZipCode || ''}...`
        : 'Finding parks near you...';
    }
    if (nearMeStatus === 'denied') return 'Location permission denied. Enter a ZIP code or retry device location.';
    if (nearMeStatus === 'error') return nearMeZipError || 'Unable to determine location. Enter a ZIP code or retry.';
    if (nearMeStatus === 'ready' && nearMeParkIds) {
      const sourceLabel = nearMeLocationSource === 'zip' && nearMeZipCode
        ? `Using ZIP ${nearMeZipCode}`
        : nearMeZipCode
          ? `Using device location (ZIP ${nearMeZipCode})`
          : 'Using device location';
      return `${sourceLabel} · Showing ${nearMeParkIds.size} nearest parks within ${NEAR_ME_RADIUS_MILES} mi.`;
    }
    return 'Enter a ZIP code or use device location to find nearby parks.';
  }, [
    activeFilter,
    nearMeStatus,
    nearMeParkIds,
    nearMeLocationSource,
    nearMeZipCode,
    nearMeZipInput,
    nearMeZipError,
  ]);

  const mappedParks = useMemo(() => {
    return allParks.filter((park) => {
      const isNational = nationalParkIds.has(park.id);

      if (activeFilter === 'near' && nearMeParkIds && !nearMeParkIds.has(park.id)) return false;

      if (activeFilter === 'national' && !isNational) return false;
      if (activeFilter === 'to-visit' && hasVisitedUI(park.id)) return false;
      if (activeFilter === 'visited' && !hasVisitedUI(park.id)) return false;

      if (parkTypeFilter === 'national' && !isNational) return false;
      if (parkTypeFilter === 'state' && isNational) return false;

      if (mapFilter === 'all') return true;
      if (mapFilter === 'visited') return hasVisitedUI(park.id);
      return !hasVisitedUI(park.id);
    });
  }, [activeFilter, mapFilter, parkTypeFilter, hasVisitedUI, allParks, nationalParkIds, nearMeParkIds]);

  function zoomMap(multiplier: number) {
    const next: Region = {
      ...mapRegion,
      latitudeDelta: Math.max(0.2, Math.min(70, mapRegion.latitudeDelta * multiplier)),
      longitudeDelta: Math.max(0.2, Math.min(120, mapRegion.longitudeDelta * multiplier)),
    };
    setMapRegion(next);
    mapRef.current?.animateToRegion(next, 180);
  }

  function openParkDetails(park: NationalPark) {
    if (park.type === 'state') {
      Alert.alert('State Park', 'State park details view is coming soon.');
      return;
    }
    router.push(`/park/${park.id}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroRow}>
            <Image
              source={require('../../assets/images/parkatlas-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Explore Parks</Text>
              <Text style={styles.heroSubtitle}>Find your next adventure.</Text>
            </View>
          </View>
        </View>

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
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              blurOnSubmit={false}
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

        {activeFilter === 'near' ? (
          <View style={styles.nearMePanel}>
            <View style={styles.nearMeZipRow}>
              <TextInput
                style={styles.nearMeZipInput}
                value={nearMeZipInput}
                onChangeText={(text) => {
                  const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 5);
                  setNearMeZipInput(digitsOnly);
                  if (nearMeZipError) setNearMeZipError(null);
                }}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="Enter ZIP"
                placeholderTextColor={C.outlineVariant}
              />
              <TouchableOpacity style={styles.nearMeZipApplyBtn} activeOpacity={0.75} onPress={applyNearMeZip}>
                <Text style={styles.nearMeZipApplyBtnText}>Use ZIP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nearMeDeviceBtn} activeOpacity={0.75} onPress={useDeviceLocation}>
                <Text style={styles.nearMeDeviceBtnText}>Use Device</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.nearMeStatusText}>{nearMeStatusText}</Text>
          </View>
        ) : null}

          <View style={styles.nextAdventureCard}>
            <View style={styles.nextAdventureTitleRow}>
              <Text style={styles.nextAdventureTitle}>Next up for you</Text>
              {nextAdventurePark ? (
                <View style={styles.nextAdventureReasonPill}>
                  <Text style={styles.nextAdventureReasonPillText}>{nextAdventureReason}</Text>
                </View>
              ) : null}
            </View>
            {nextAdventurePark ? (
              <>
                <View style={styles.nextAdventureTopRow}>
                  <View style={styles.nextAdventureThumb}>
                    <MaterialCommunityIcons name="pine-tree" size={22} color={C.primary} />
                  </View>
                  <View style={styles.nextAdventureTextWrap}>
                    <Text style={styles.nextAdventureParkName}>{nextAdventurePark.name}</Text>
                    <Text style={styles.nextAdventureParkMeta}>{nextAdventurePark.state} · {stateNameFromCode(nextAdventurePark.state)}</Text>
                  </View>
                </View>
                <View style={styles.nextAdventureActions}>
                  <TouchableOpacity
                    style={styles.nextAdventureViewBtn}
                    activeOpacity={0.8}
                    onPress={() => openParkDetails(nextAdventurePark)}
                  >
                    <Text style={styles.nextAdventureViewBtnText}>View park</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.nextAdventureListBtn,
                      checklistIds.includes(nextAdventurePark.id) && styles.nextAdventureListBtnActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleChecklistPark(nextAdventurePark.id)}
                  >
                    <Text
                      style={[
                        styles.nextAdventureListBtnText,
                        checklistIds.includes(nextAdventurePark.id) && styles.nextAdventureListBtnTextActive,
                      ]}
                    >
                      {checklistIds.includes(nextAdventurePark.id) ? 'In list' : 'Add to list'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.nextAdventureEmptyText}>You are all caught up. Add new parks to your list to keep exploring.</Text>
            )}
          </View>

        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>All Parks Map</Text>
              <Text style={styles.mapSubtitle}>{visitedCount} visited · {Math.max(0, allParks.length - visitedCount)} remaining</Text>
            </View>
            <View style={styles.mapLegend}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
                <Text style={styles.legendText}>Visited</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: C.outlineVariant }]} />
                <Text style={styles.legendText}>To Visit</Text>
              </View>
            </View>
          </View>

          <View style={styles.mapFilterRow}>
            {(['all', 'visited', 'unvisited'] as const).map((key) => {
              const label = key === 'all' ? 'All' : key === 'visited' ? 'Visited' : 'To Visit';
              const active = mapFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.mapFilterPill, active && styles.mapFilterPillActive]}
                  activeOpacity={0.7}
                  onPress={() => setMapFilter(key)}
                >
                  <Text style={[styles.mapFilterPillText, active && styles.mapFilterPillTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.mapFilterRow}>
            {(['all', 'national', 'state'] as const).map((key) => {
              const label = key === 'all' ? 'All Parks' : key === 'national' ? 'National' : 'State';
              const active = parkTypeFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.mapFilterPill, active && styles.mapFilterPillActive]}
                  activeOpacity={0.7}
                  onPress={() => setParkTypeFilter(key)}
                >
                  <Text style={[styles.mapFilterPillText, active && styles.mapFilterPillTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              zoomEnabled
              zoomTapEnabled
              scrollEnabled
              pitchEnabled
              rotateEnabled
              onRegionChangeComplete={(region) => setMapRegion(region)}
            >
              {mappedParks.map((park) => {
                const visited = hasVisitedUI(park.id);
                return (
                  <Marker
                    key={park.id}
                    coordinate={{ latitude: park.lat, longitude: park.lng }}
                    pinColor={visited ? C.primary : C.outlineVariant}
                    title={park.name}
                    description={`${park.state} · ${visited ? 'Visited' : 'To Visit'}`}
                    onPress={() => setSelectedMapPark(park)}
                  />
                );
              })}
            </MapView>

              <View style={styles.mapOverlayLabel}>
                <Text style={styles.mapOverlayLabelText}>Explore map</Text>
              </View>

            <View style={styles.mapZoomControls}>
              <TouchableOpacity
                style={styles.mapZoomBtn}
                activeOpacity={0.8}
                onPress={() => zoomMap(0.6)}
              >
                <Ionicons name="add" size={18} color={C.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapZoomBtn}
                activeOpacity={0.8}
                onPress={() => zoomMap(1.5)}
              >
                <Ionicons name="remove" size={18} color={C.onSurface} />
              </TouchableOpacity>
            </View>

              {selectedMapPark ? (
                <View style={styles.mapBottomSheet}>
                  <View style={styles.mapBottomSheetHeader}>
                    <Text style={styles.mapBottomSheetTitle}>{selectedMapPark.name}</Text>
                    <Text style={styles.mapBottomSheetMeta}>{selectedMapPark.state} · {hasVisitedUI(selectedMapPark.id) ? 'Visited' : 'To Visit'}</Text>
                  </View>
                  <View style={styles.mapBottomSheetActions}>
                    <TouchableOpacity
                      style={[styles.selectedParkActionBtn, styles.mapBottomSheetActionBtn]}
                      activeOpacity={0.85}
                      onPress={() => openParkDetails(selectedMapPark)}
                    >
                      <Text style={styles.selectedParkActionText}>View park</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.selectedParkActionBtn,
                        styles.selectedParkVisitedBtn,
                        styles.mapBottomSheetActionBtn,
                        hasVisitedUI(selectedMapPark.id) && styles.selectedParkVisitedBtnDone,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => markParkVisited(selectedMapPark)}
                      disabled={hasVisitedUI(selectedMapPark.id)}
                    >
                      <Text
                        style={[
                          styles.selectedParkActionText,
                          styles.selectedParkVisitedText,
                          hasVisitedUI(selectedMapPark.id) && styles.selectedParkVisitedTextDone,
                        ]}
                      >
                        {hasVisitedUI(selectedMapPark.id) ? 'Visited' : 'Mark as visited'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.selectedParkActionBtn,
                        styles.mapBottomSheetActionBtn,
                        checklistIds.includes(selectedMapPark.id) && styles.nextAdventureListBtnActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleChecklistPark(selectedMapPark.id)}
                    >
                      <Text
                        style={[
                          styles.selectedParkActionText,
                          checklistIds.includes(selectedMapPark.id) && styles.nextAdventureListBtnTextActive,
                        ]}
                      >
                        {checklistIds.includes(selectedMapPark.id) ? 'In list' : 'Add to list'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
          </View>
        </View>

        {isSearching ? (
          <View style={styles.searchResults}>
            {filteredParks.length > 0 ? (
              <>
                <Text style={styles.resultsCount}>
                  {filteredParks.length} PARK{filteredParks.length !== 1 ? 'S' : ''} FOUND
                </Text>
                {filteredParks.map((park) => (
                  <TouchableOpacity
                    key={park.id}
                    style={styles.parkResultCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      const nextRegion: Region = {
                        latitude: park.lat,
                        longitude: park.lng,
                        latitudeDelta: 4,
                        longitudeDelta: 4,
                      };
                      setSelectedMapPark(park);
                      setMapRegion(nextRegion);
                      mapRef.current?.animateToRegion(nextRegion, 250);
                    }}
                  >
                    <View style={styles.parkResultIcon}>
                      <MaterialCommunityIcons name="pine-tree" size={20} color={C.primary} />
                    </View>
                    <View style={styles.parkResultBody}>
                      <Text style={styles.parkResultName}>{park.name}</Text>
                      <Text style={styles.parkResultState}>{park.state}</Text>
                    </View>
                    <View style={styles.parkResultBadge}>
                      <Text style={styles.parkResultCode}>{park.npsCode ? park.npsCode.toUpperCase() : (park.type === 'state' ? 'STATE' : 'PARK')}</Text>
                    </View>
                    {hasVisitedUI(park.id) && (
                      <Ionicons name="checkmark-circle" size={18} color={C.primary} style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="pine-tree" size={36} color={C.outlineVariant} />
                <Text style={styles.emptyText}>No parks found for {'"'}{searchText}{'"'}</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <View style={styles.checklistTitleWrap}>
                    <Text style={styles.checklistTitle}>Your Parks</Text>
                    <Text style={styles.checklistSubtitle}>{nationalVisitedCount} visited • {parksToGo} to go</Text>
                </View>
                <View style={styles.checklistPills}>
                  <TouchableOpacity
                    style={styles.checklistManageBtn}
                    activeOpacity={0.7}
                    onPress={() => setChecklistModalVisible(true)}
                  >
                    <Text style={styles.checklistManageBtnText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checklistPill, visitView === 'unvisited' && styles.checklistPillActive]}
                    activeOpacity={0.7}
                    onPress={() => setVisitView('unvisited')}
                  >
                    <Text style={[styles.checklistPillText, visitView === 'unvisited' && styles.checklistPillTextActive]}>To Visit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checklistPill, visitView === 'visited' && styles.checklistPillActive]}
                    activeOpacity={0.7}
                    onPress={() => setVisitView('visited')}
                  >
                    <Text style={[styles.checklistPillText, visitView === 'visited' && styles.checklistPillTextActive]}>Visited</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.checklistRows}>
                {checklistParks.length > 0 ? checklistParks.map((park) => (
                  <TouchableOpacity
                    key={`${visitView}_${park.id}`}
                    style={styles.checklistRow}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/park/${park.id}`)}
                  >
                    <Text style={styles.checklistParkName}>{park.name}</Text>
                    <View style={styles.checklistRight}>
                      <Text style={styles.checklistState}>{park.state}</Text>
                      {hasVisitedUI(park.id)
                        ? <Ionicons name="checkmark-circle" size={16} color={C.primary} />
                        : <Ionicons name="ellipse-outline" size={16} color={C.outlineVariant} />}
                    </View>
                  </TouchableOpacity>
                )) : (
                  <View style={styles.checklistEmptyState}>
                    <Text style={styles.checklistEmptyText}>
                      {visitView === 'visited'
                        ? 'No visited parks yet. Mark a park as visited to see it here.'
                        : checklistParksAll.length === 0
                          ? 'No parks in your checklist yet. Tap Manage to add parks.'
                          : 'No to-visit parks in your checklist.'}
                    </Text>
                  </View>
                )}
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
                    <Text style={styles.challengeGoal}>6 PARKS TO GO</Text>
                </View>
                  <TouchableOpacity style={styles.challengeBtn} activeOpacity={0.8}>
                    <Text style={styles.challengeBtnText}>View challenge</Text>
                  </TouchableOpacity>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      <Modal visible={checklistModalVisible} transparent animationType="slide" onRequestClose={() => setChecklistModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setChecklistModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Checklist</Text>
                <Text style={styles.modalSubtitle}>Choose parks you want in your checklist.</Text>
              </View>
              <TouchableOpacity onPress={() => setChecklistModalVisible(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <Ionicons name="search" size={16} color={C.outlineVariant} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search park or state"
                placeholderTextColor={C.outlineVariant}
                value={checklistSearchText}
                onChangeText={setChecklistSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={checklistPickerParks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => {
                const selected = checklistIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.modalParkRow, selected && styles.modalParkRowSelected]}
                    activeOpacity={0.8}
                    onPress={() => toggleChecklistPark(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalParkName}>{item.name}</Text>
                      <Text style={styles.modalParkMeta}>{item.state} · {item.npsCode.toUpperCase()}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={20}
                      color={selected ? C.primary : C.outlineVariant}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroLogo: {
    width: 96,
    height: 96,
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: C.onSurface,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: C.onSurfaceVariant,
    lineHeight: 19,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 15,
    color: C.onSurface,
  },
  chipsRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  nearMePanel: {
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 4,
    gap: 7,
  },
  nearMeZipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nearMeZipInput: {
    flex: 1,
    minWidth: 0,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.background,
    color: C.onSurface,
    fontSize: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  nearMeZipApplyBtn: {
    borderRadius: 9,
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nearMeZipApplyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onPrimary,
  },
  nearMeDeviceBtn: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nearMeDeviceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  nearMeStatusText: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  nextAdventureCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
    padding: 14,
    gap: 12,
  },
  nextAdventureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
  },
  nextAdventureTitleRow: {
    gap: 8,
  },
  nextAdventureReasonPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    backgroundColor: `${C.primary}12`,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  nextAdventureReasonPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.2,
  },
  nextAdventureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextAdventureThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: `${C.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextAdventureTextWrap: {
    flex: 1,
    gap: 3,
  },
  nextAdventureParkName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  nextAdventureParkMeta: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  nextAdventureActions: {
    flexDirection: 'row',
    gap: 8,
  },
  nextAdventureViewBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  nextAdventureViewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.onPrimary,
  },
  nextAdventureListBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.secondary,
    backgroundColor: `${C.secondary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  nextAdventureListBtnActive: {
    borderColor: C.primary,
    backgroundColor: `${C.primary}18`,
  },
  nextAdventureListBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secondary,
  },
  nextAdventureListBtnTextActive: {
    color: C.primary,
  },
  nextAdventureEmptyText: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  mapSection: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
  },
  mapSubtitle: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  mapLegend: {
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
  mapFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mapFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.background,
  },
  mapFilterPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  mapFilterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  mapFilterPillTextActive: {
    color: C.onPrimary,
  },
  mapWrap: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  map: {
    flex: 1,
  },
    mapOverlayLabel: {
      position: 'absolute',
      left: 10,
      top: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 99,
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderWidth: 1,
      borderColor: C.outlineVariant,
    },
    mapOverlayLabelText: {
      fontSize: 11,
      fontWeight: '700',
      color: C.onSurface,
      letterSpacing: 0.4,
    },
  mapZoomControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 8,
  },
  mapZoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
    mapBottomSheet: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.outlineVariant,
      backgroundColor: 'rgba(255,255,255,0.98)',
      padding: 10,
      gap: 8,
    },
    mapBottomSheetHeader: {
      gap: 2,
    },
    mapBottomSheetTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: C.onSurface,
    },
    mapBottomSheetMeta: {
      fontSize: 12,
      color: C.onSurfaceVariant,
    },
    mapBottomSheetActions: {
      flexDirection: 'row',
      gap: 6,
    },
    mapBottomSheetActionBtn: {
      paddingVertical: 7,
      paddingHorizontal: 6,
    },
  selectedParkCard: {
    gap: 10,
    backgroundColor: C.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedParkMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectedParkLeft: {
    flex: 1,
    gap: 2,
  },
  selectedParkName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  selectedParkMeta: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  selectedParkActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.secondary,
    backgroundColor: `${C.secondary}14`,
    paddingVertical: 8,
  },
  selectedParkActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secondary,
  },
  selectedParkActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedParkVisitedBtn: {
    borderColor: C.primary,
    backgroundColor: `${C.primary}14`,
  },
  selectedParkVisitedBtnDone: {
    backgroundColor: C.primary,
  },
  selectedParkVisitedText: {
    color: C.primary,
  },
  selectedParkVisitedTextDone: {
    color: C.onPrimary,
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
  checklistCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
    padding: 14,
    gap: 10,
  },
  checklistHeader: {
    gap: 10,
  },
  checklistTitleWrap: {
    paddingRight: 4,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
  },
  checklistSubtitle: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  checklistPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  checklistManageBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: C.surfaceContainerHighest,
  },
  checklistManageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.secondary,
  },
  checklistPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.background,
  },
  checklistPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checklistPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  checklistPillTextActive: {
    color: C.onPrimary,
  },
  checklistRows: {
    gap: 6,
  },
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  checklistParkName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurface,
    paddingRight: 10,
  },
  checklistRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistState: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
  checklistEmptyState: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  checklistEmptyText: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  challengeCard: {
    marginHorizontal: 20,
    marginTop: 12,
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
  challengeBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${C.primary}12`,
  },
  challengeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  // ── Park search results ──────────────────────────────
  searchResults: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  resultsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  parkResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    padding: 14,
  },
  parkResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${C.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkResultBody: {
    flex: 1,
    gap: 2,
  },
  parkResultName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  parkResultState: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  parkResultBadge: {
    backgroundColor: C.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  parkResultCode: {
    fontSize: 10,
    fontWeight: '800',
    color: C.onPrimary,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    maxHeight: Dimensions.get('window').height * 0.82,
    backgroundColor: C.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
  },
  modalSubtitle: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerLow,
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: C.onSurface,
    minWidth: 0,
  },
  modalListContent: {
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  modalParkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  modalParkRowSelected: {
    borderColor: C.primary,
    backgroundColor: `${C.primary}10`,
  },
  modalParkName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  modalParkMeta: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
});
