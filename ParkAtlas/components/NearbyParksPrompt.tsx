import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useSegments } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii, Shadows } from '@/constants/theme';
import { PARKS, type NationalPark } from '@/data/parksData';
import { STATE_PARKS } from '@/data/stateParksData';
import { useAuth } from '@/hooks/useAuth';
import { useVisitedParks } from '@/hooks/useVisitedParks';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/components/ui/Toast';
import { haptic } from '@/utils/haptics';
import { distanceMiles, type LatLng } from '@/utils/geo';
import { stateDisplayName } from '@/utils/search';

const RADIUS_MILES = 120;
const MAX_RESULTS = 6;
const COOLDOWN_MS = 20 * 60 * 60 * 1000; // once a day-ish
const STATE_FILE = `${FileSystem.documentDirectory}nearby_prompt_state.json`;

type PromptState = { shownAt: number; dismissedParkIds: string[] };

type NearbyPark = NationalPark & { miles: number; isNational: boolean };

async function readState(): Promise<PromptState> {
  try {
    const info = await FileSystem.getInfoAsync(STATE_FILE);
    if (!info.exists) return { shownAt: 0, dismissedParkIds: [] };
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(STATE_FILE)) as Partial<PromptState>;
    return {
      shownAt: typeof parsed.shownAt === 'number' ? parsed.shownAt : 0,
      dismissedParkIds: Array.isArray(parsed.dismissedParkIds) ? parsed.dismissedParkIds.filter((s): s is string => typeof s === 'string') : [],
    };
  } catch {
    return { shownAt: 0, dismissedParkIds: [] };
  }
}

async function writeState(state: PromptState): Promise<void> {
  await FileSystem.writeAsStringAsync(STATE_FILE, JSON.stringify(state)).catch(() => {});
}

/**
 * On launch (and again after each sign-in) quietly checks the device location and,
 * if there are unvisited national or state parks within range, offers them for the wishlist.
 * Never asks for permission itself — it only runs when permission is already granted,
 * or on the first launch where the user hasn't been asked yet.
 */
export function NearbyParksPrompt() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const inTabs = (segments[0] as string) === '(tabs)';
  const { user, loading: authLoading } = useAuth();
  const { hasVisited, loading: visitsLoading } = useVisitedParks();
  const { isWishlisted, add, loading: wishlistLoading } = useWishlist();
  const toast = useToast();

  const [nearby, setNearby] = useState<NearbyPark[]>([]);
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const checkedForUserRef = useRef<string | null>(null);

  const allParks = useMemo<NationalPark[]>(
    () => [...PARKS.map((p) => ({ ...p, type: 'national' as const })), ...STATE_PARKS],
    [],
  );

  const runCheck = useCallback(async () => {
    const state = await readState();
    if (Date.now() - state.shownAt < COOLDOWN_MS) return;

    const perm = await Location.getForegroundPermissionsAsync();
    let granted = perm.status === 'granted';
    if (!granted && perm.canAskAgain && state.shownAt === 0) {
      // First ever run: ask once. Explore's "Near Me" also asks, so this is the only proactive request.
      granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
    }
    if (!granted) return;

    let here: LatLng;
    try {
      const pos = await Location.getLastKnownPositionAsync() ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      return;
    }

    const dismissed = new Set(state.dismissedParkIds);
    const candidates = allParks
      .filter((p) => !hasVisited(p.id) && !isWishlisted(p.id) && !dismissed.has(p.id))
      .map((p) => ({ ...p, miles: distanceMiles(here, { latitude: p.lat, longitude: p.lng }), isNational: p.type !== 'state' }))
      .filter((p) => p.miles <= RADIUS_MILES)
      // National parks first, then by distance.
      .sort((a, b) => (a.isNational === b.isNational ? a.miles - b.miles : a.isNational ? -1 : 1))
      .slice(0, MAX_RESULTS);

    if (candidates.length === 0) return;

    setNearby(candidates);
    setAdded(new Set());
    setVisible(true);
    haptic.tap();
    await writeState({ ...state, shownAt: Date.now() });
  }, [allParks, hasVisited, isWishlisted]);

  useEffect(() => {
    if (!inTabs || authLoading || visitsLoading || wishlistLoading) return;
    const key = user?.id || 'guest';
    if (checkedForUserRef.current === key) return;
    checkedForUserRef.current = key;
    // Let the first screen settle before layering a sheet on top.
    const t = setTimeout(() => { void runCheck(); }, 1800);
    return () => clearTimeout(t);
  }, [inTabs, authLoading, visitsLoading, wishlistLoading, user?.id, runCheck]);

  async function dismiss() {
    setVisible(false);
    const state = await readState();
    // Don't re-suggest what they just skipped.
    const skipped = nearby.filter((p) => !added.has(p.id)).map((p) => p.id);
    await writeState({ ...state, dismissedParkIds: Array.from(new Set([...state.dismissedParkIds, ...skipped])).slice(-60) });
  }

  async function addPark(park: NearbyPark) {
    haptic.select();
    await add(park.id);
    setAdded((prev) => new Set(prev).add(park.id));
  }

  async function addAll() {
    haptic.success();
    for (const p of nearby) {
      if (!added.has(p.id)) await add(p.id);
    }
    setAdded(new Set(nearby.map((p) => p.id)));
    toast.success(`Added ${nearby.length} parks to your list`, { icon: 'bookmark', silent: true });
    setVisible(false);
  }

  function openPark(park: NearbyPark) {
    setVisible(false);
    if (park.isNational) router.push(`/park/${park.id}`);
    else router.push('/(tabs)/explore');
  }

  if (!visible) return null;

  const nationalCount = nearby.filter((p) => p.isNational).length;
  const headline = nationalCount > 0
    ? `${nearby.length} ${nearby.length === 1 ? 'park' : 'parks'} within ${RADIUS_MILES} miles`
    : `${nearby.length} state ${nearby.length === 1 ? 'park' : 'parks'} nearby`;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => { void dismiss(); }}>
      <Animated.View style={styles.root} entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)}>
        <Pressable style={styles.scrim} onPress={() => { void dismiss(); }} accessibilityLabel="Dismiss" />
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="location" size={20} color={C.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Parks near you</Text>
              <Text style={styles.sub}>{headline} you haven&apos;t visited yet</Text>
            </View>
            <TouchableOpacity onPress={() => { void dismiss(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {nearby.map((park) => {
              const isAdded = added.has(park.id);
              return (
                <View key={park.id} style={styles.row}>
                  <TouchableOpacity style={styles.rowMain} activeOpacity={0.75} onPress={() => openPark(park)}>
                    <View style={[styles.rowIcon, !park.isNational && styles.rowIconState]}>
                      <MaterialCommunityIcons name={park.isNational ? 'pine-tree' : 'tree-outline'} size={18} color={park.isNational ? C.primary : C.tertiary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowName} numberOfLines={1}>{park.name}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {park.isNational ? 'National Park' : 'State Park'} · {stateDisplayName(park.state)} · {Math.round(park.miles)} mi
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addBtn, isAdded && styles.addBtnDone]}
                    onPress={() => { void addPark(park); }}
                    disabled={isAdded}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={isAdded ? `${park.name} added to wishlist` : `Add ${park.name} to wishlist`}
                  >
                    <Ionicons name={isAdded ? 'bookmark' : 'bookmark-outline'} size={16} color={isAdded ? C.onPrimary : C.primary} />
                    <Text style={[styles.addBtnText, isAdded && styles.addBtnTextDone]}>{isAdded ? 'Added' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { void addAll(); }} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>Add all to my list</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { void dismiss(); }} hitSlop={8} accessibilityRole="button">
              <Text style={styles.laterText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 18, 12, 0.5)',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '78%',
    ...Shadows.floating,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: C.onSurface,
  },
  sub: {
    marginTop: 1,
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 6,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: C.surfaceContainerLow,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryContainer,
  },
  rowIconState: {
    backgroundColor: C.warningContainer,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  rowMeta: {
    marginTop: 1,
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnDone: {
    backgroundColor: C.primary,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
  },
  addBtnTextDone: {
    color: C.onPrimary,
  },
  footer: {
    marginTop: 14,
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Radii.pill,
    paddingVertical: 14,
    backgroundColor: C.primary,
  },
  primaryBtnText: {
    color: C.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  laterText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
});
