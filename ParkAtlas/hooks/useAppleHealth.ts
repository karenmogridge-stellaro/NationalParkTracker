import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';

// react-native-health is iOS only and requires a native build (not Expo Go).
// Guard the require so the app doesn't crash in managed/web environments.
let AppleHealthKit: any = null;
let HealthUnit: any = null;
let isModuleLoaded = false;

if (Platform.OS === 'ios') {
  try {
    const { NativeModules } = require('react-native');
    const rnh = require('react-native-health');
    // react-native-health wraps NativeModules.AppleHealthKit via Object.assign,
    // which may not copy lazy-loaded native methods in newer RN.
    // Access the native module directly, fall back to the rnh wrapper.
    const nativeMod = NativeModules.AppleHealthKit;
    AppleHealthKit = (typeof nativeMod?.initHealthKit === 'function') ? nativeMod : rnh;
    HealthUnit = rnh?.Constants?.Units ?? null;
    isModuleLoaded = !!(NativeModules.AppleHealthKit);
  } catch (e: any) {
    isModuleLoaded = false;
  }
}

export type HealthStatus = 'idle' | 'requesting' | 'authorized' | 'denied' | 'unavailable';

export interface AppleHealthSummary {
  stepsToday: number;
  distanceKmToday: number;
  recentWorkouts: RecentWorkout[];
}

export interface RecentWorkout {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  distanceKm: number;
  calories: number;
}

const PERMISSIONS = {
  permissions: {
    read: [
      'Steps',
      'DistanceWalkingRunning',
      'ActiveEnergyBurned',
      'Workout',
      'HeartRate',
      'HeartRateVariability',
      'FlightsClimbed',
    ],
    write: [
      'Steps',
      'DistanceWalkingRunning',
      'ActiveEnergyBurned',
      'Workout',
    ],
  },
};

export function useAppleHealth() {
  const [status, setStatus] = useState<HealthStatus>('idle');
  const [summary, setSummary] = useState<AppleHealthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      setStatus('unavailable');
      return false;
    }
    if (!AppleHealthKit || !isModuleLoaded) {
      setStatus('unavailable');
      Alert.alert(
        'Native Build Required',
        'Apple Health requires a native iOS build. Run `npx expo run:ios` instead of Expo Go to enable this feature.',
        [{ text: 'OK' }],
      );
      return false;
    }

    setStatus('requesting');
    setError(null);

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(PERMISSIONS, (err: Error) => {
        if (err) {
          setStatus('denied');
          setError(err.message ?? 'HealthKit authorization denied.');
          resolve(false);
          return;
        }
        setStatus('authorized');
        resolve(true);
      });
    });
  }, []);

  const loadSummary = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios' || !AppleHealthKit || status !== 'authorized') return;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const options = {
      startDate: startOfDay.toISOString(),
      endDate: today.toISOString(),
    };

    // Steps today
    const steps = await new Promise<number>((resolve) => {
      AppleHealthKit.getStepCount(options, (err: Error, result: { value: number }) => {
        resolve(err ? 0 : result.value);
      });
    });

    // Distance today (in meters)
    const distanceM = await new Promise<number>((resolve) => {
      AppleHealthKit.getDistanceWalkingRunning(
        { ...options, unit: HealthUnit ? HealthUnit.meter : 'meter' },
        (err: Error, result: { value: number }) => {
          resolve(err ? 0 : result.value);
        },
      );
    });

    // Recent workouts (last 7 days)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const workouts = await new Promise<RecentWorkout[]>((resolve) => {
      AppleHealthKit.getSamples(
        {
          startDate: sevenDaysAgo.toISOString(),
          endDate: today.toISOString(),
          type: 'Workout',
          limit: 10,
          ascending: false,
        },
        (err: Error, results: any[]) => {
          if (err || !results) {
            resolve([]);
            return;
          }
          resolve(
            results.map((w) => ({
              id: w.id ?? w.startDate,
              type: w.activityName ?? 'Workout',
              startDate: w.startDate,
              endDate: w.endDate,
              distanceKm: (w.distance ?? 0) / 1000,
              calories: Math.round(w.calories ?? 0),
            })),
          );
        },
      );
    });

    setSummary({
      stepsToday: Math.round(steps),
      distanceKmToday: Math.round((distanceM / 1000) * 10) / 10,
      recentWorkouts: workouts,
    });
  }, [status]);

  const authorize = useCallback(async () => {
    const granted = await requestAuthorization();
    if (granted) {
      await loadSummary();
    }
  }, [requestAuthorization, loadSummary]);

  return {
    status,
    summary,
    error,
    authorize,
    loadSummary,
    isAvailable: Platform.OS === 'ios',
    isModuleLoaded,
    isAuthorized: status === 'authorized',
  };
}
