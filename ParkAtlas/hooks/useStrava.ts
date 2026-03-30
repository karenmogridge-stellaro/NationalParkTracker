import { useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = '217312';
const CLIENT_SECRET = '21c2df8ccebc2e42e75a2d06ae785064fe077a56';

const KEY_TOKEN = 'strava_access_token';
const KEY_REFRESH = 'strava_refresh_token';
const KEY_EXPIRY = 'strava_token_expiry';

export const STRAVA_CACHE_FILE = `${FileSystem.documentDirectory}strava_data.json`;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const HIKE_TYPES = ['Hike', 'Walk', 'TrailRun', 'Trail Run'];

const discovery = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
  revocationEndpoint: 'https://www.strava.com/oauth/deauthorize',
};

export type StravaStatus = 'idle' | 'loading' | 'authorizing' | 'connected' | 'error';

export interface StravaSummary {
  hikeCount: number;
  totalDistanceKm: number;
  totalElevationM: number;
  lastActivityName: string | null;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  city: string;
  state: string;
  profile: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  total_elevation_gain: number;
  moving_time: number;
  start_date: string;
  start_latlng: [number, number] | null;
}

export function useStrava() {
  const [status, setStatus] = useState<StravaStatus>('idle');
  const [summary, setSummary] = useState<StravaSummary | null>(null);
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({
    native: 'parkatlas://localhost',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['activity:read_all'],
      redirectUri,
      extraParams: { approval_prompt: 'auto' },
    },
    discovery,
  );

  // Restore stored session on mount
  useEffect(() => {
    (async () => {
      try {
        // Load cached athlete + activities immediately
        const cacheInfo = await FileSystem.getInfoAsync(STRAVA_CACHE_FILE);
        let cachedAt = 0;
        if (cacheInfo.exists) {
          const raw = await FileSystem.readAsStringAsync(STRAVA_CACHE_FILE);
          const cache = JSON.parse(raw);
          if (cache.athlete) setAthlete(cache.athlete);
          if (cache.activities) setActivities(cache.activities);
          if (cache.summary) setSummary(cache.summary);
          cachedAt = cache.cachedAt ?? 0;
        }

        const token = await SecureStore.getItemAsync(KEY_TOKEN);
        const expiry = await SecureStore.getItemAsync(KEY_EXPIRY);
        if (!token) return;
        if (expiry && Date.now() < parseInt(expiry, 10) * 1000) {
          setStatus('connected');
          // Refresh data if cache is stale
          if (Date.now() - cachedAt > CACHE_TTL) {
            fetchAll(token);
          }
        } else {
          const refresh = await SecureStore.getItemAsync(KEY_REFRESH);
          if (refresh) await doRefresh(refresh);
        }
      } catch {
        // No stored session — stay idle
      }
    })();
  }, []);

  // Handle OAuth browser response
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      exchangeCode(response.params.code);
    } else if (response.type === 'error') {
      setStatus('error');
      setError('Strava authorization failed.');
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setStatus('idle');
    }
  }, [response]);

  async function exchangeCode(code: string) {
    setStatus('loading');
    try {
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        await storeTokens(data);
        setStatus('connected');
        fetchAll(data.access_token);
      } else {
        setStatus('error');
        setError(data.message ?? 'Failed to get access token.');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Connection failed.');
    }
  }

  async function doRefresh(refreshToken: string) {
    try {
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        await storeTokens(data);
        setStatus('connected');
        fetchAll(data.access_token);
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  }

  async function storeTokens(data: { access_token: string; refresh_token: string; expires_at: number }) {
    await SecureStore.setItemAsync(KEY_TOKEN, data.access_token);
    await SecureStore.setItemAsync(KEY_REFRESH, data.refresh_token);
    await SecureStore.setItemAsync(KEY_EXPIRY, String(data.expires_at));
  }

  async function fetchAll(token: string) {
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
      const newSummary: StravaSummary = {
        hikeCount: hikeActs.length,
        totalDistanceKm: Math.round(totalDistance / 100) / 10,
        totalElevationM: Math.round(totalElevation),
        lastActivityName: hikeActs[0]?.name ?? null,
      };

      const cache = {
        athlete: athleteData,
        activities: hikeActs,
        summary: newSummary,
        cachedAt: Date.now(),
      };
      await FileSystem.writeAsStringAsync(STRAVA_CACHE_FILE, JSON.stringify(cache));

      setAthlete(athleteData);
      setActivities(hikeActs);
      setSummary(newSummary);
    } catch {
      // Leave existing state — still connected
    }
  }

  const authorize = useCallback(() => {
    setStatus('authorizing');
    promptAsync();
  }, [promptAsync]);

  const disconnect = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(KEY_TOKEN);
      if (token) {
        await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync(KEY_TOKEN).catch(() => {});
      await SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => {});
      await SecureStore.deleteItemAsync(KEY_EXPIRY).catch(() => {});
      await FileSystem.deleteAsync(STRAVA_CACHE_FILE, { idempotent: true }).catch(() => {});
      setStatus('idle');
      setSummary(null);
      setAthlete(null);
      setActivities([]);
      setError(null);
    }
  }, []);

  return {
    status,
    summary,
    athlete,
    activities,
    error,
    authorize,
    disconnect,
    isConnected: status === 'connected',
  };
}
