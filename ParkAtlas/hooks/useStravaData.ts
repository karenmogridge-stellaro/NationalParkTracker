import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { STRAVA_CACHE_FILE, StravaAthlete, StravaActivity, StravaSummary } from './useStrava';
import { matchPark, matchedParksFromCoords } from '../utils/parkMatcher';
import { NationalPark } from '../data/parksData';

const KEY_TOKEN = 'strava_access_token';
const HIKE_TYPES = ['Hike', 'Walk', 'TrailRun', 'Trail Run'];
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function useStravaData() {
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function fetchFresh(token: string) {
    try {
      const [athleteRes, page1Res, page2Res] = await Promise.all([
        fetch('https://www.strava.com/api/v3/athlete', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100&page=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100&page=2', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const athleteData: StravaAthlete = await athleteRes.json();
      const page1: any[] = await page1Res.json();
      const page2: any[] = await page2Res.json();

      const hikeActs: StravaActivity[] = [
        ...(Array.isArray(page1) ? page1 : []),
        ...(Array.isArray(page2) ? page2 : []),
      ].filter((a) => HIKE_TYPES.includes(a.type));

      const totalDistance = hikeActs.reduce((s, a) => s + (a.distance ?? 0), 0);
      const totalElevation = hikeActs.reduce((s, a) => s + (a.total_elevation_gain ?? 0), 0);
      const summary: StravaSummary = {
        hikeCount: hikeActs.length,
        totalDistanceKm: Math.round(totalDistance / 100) / 10,
        totalElevationM: Math.round(totalElevation),
        lastActivityName: hikeActs[0]?.name ?? null,
      };

      await FileSystem.writeAsStringAsync(
        STRAVA_CACHE_FILE,
        JSON.stringify({ athlete: athleteData, activities: hikeActs, summary, cachedAt: Date.now() }),
      );

      setAthlete(athleteData);
      setActivities(hikeActs);
    } catch {
      // Leave state as-is
    }
  }

  async function loadData() {
    try {
      const token = await SecureStore.getItemAsync(KEY_TOKEN);
      if (!token) {
        setLoading(false);
        return;
      }

      const info = await FileSystem.getInfoAsync(STRAVA_CACHE_FILE);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(STRAVA_CACHE_FILE);
        const cache = JSON.parse(raw);
        if (cache.athlete) setAthlete(cache.athlete);
        if (cache.activities) setActivities(cache.activities);

        // Background refresh if stale
        const age = Date.now() - (cache.cachedAt ?? 0);
        if (age > CACHE_TTL) fetchFresh(token);
      } else {
        await fetchFresh(token);
      }
    } catch {
      /* stay empty */
    } finally {
      setLoading(false);
    }
  }

  /** Force a network refresh, bypassing the cache TTL. No-op when Strava isn't linked. */
  const refresh = useCallback(async () => {
    const token = await SecureStore.getItemAsync(KEY_TOKEN);
    if (!token) return;
    await fetchFresh(token);
  }, []);

  const totalMiles = activities.reduce((s, a) => s + (a.distance ?? 0), 0) / 1609.34;
  const totalElevationFt = activities.reduce((s, a) => s + (a.total_elevation_gain ?? 0), 0) * 3.28084;
  const trailCount = activities.length;

  const visitedParks = matchedParksFromCoords(activities.map((a) => a.start_latlng));
  const parksCount = visitedParks.length;

  /** Returns the matched NationalPark for a single activity, or null. */
  function parkForActivity(activity: StravaActivity): NationalPark | null {
    if (!activity.start_latlng) return null;
    return matchPark(activity.start_latlng[0], activity.start_latlng[1]);
  }

  return { athlete, activities, totalMiles, totalElevationFt, trailCount, visitedParks, parksCount, parkForActivity, loading, refresh };
}
