import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

const VISITS_FILE = `${FileSystem.documentDirectory}visited_parks.json`;

export interface ParkVisit {
  visitId: string;          // unique: parkId + timestamp
  parkId: string;
  parkName: string;
  trailName: string;        // empty string if no trail selected
  dateVisited: string;      // ISO date string
  distanceMiles?: number;   // optional manual distance in miles
  elevationGainFt?: number; // optional elevation gain in feet
  activityType?: string;    // e.g. 'Hike', 'Backpack', 'Camp', 'Scenic Drive', 'Wildlife'
  rating?: number;          // 1–5 star rating
}

export interface LogVisitOptions {
  distanceMiles?: number;
  dateVisited?: string;
  elevationGainFt?: number;
  activityType?: string;
  rating?: number;
}

interface VisitedParksState {
  visits: ParkVisit[];
  loading: boolean;
  logVisit: (parkId: string, parkName: string, trailName: string, opts?: LogVisitOptions) => Promise<void>;
  removeVisit: (visitId: string) => Promise<void>;
  hasVisited: (parkId: string) => boolean;
  visitsForPark: (parkId: string) => ParkVisit[];
  totalStats: { totalOutings: number; uniqueParks: number; totalMiles: number; totalElevationFt: number };
}

export function useVisitedParks(): VisitedParksState {
  const [visits, setVisits] = useState<ParkVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load visits from disk on mount
  useEffect(() => {
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(VISITS_FILE);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(VISITS_FILE);
          const parsed = JSON.parse(raw) as ParkVisit[];
          setVisits(Array.isArray(parsed) ? parsed : []);
        }
      } catch {
        // First run or corrupt file — start fresh
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(updated: ParkVisit[]) {
    await FileSystem.writeAsStringAsync(VISITS_FILE, JSON.stringify(updated));
    setVisits(updated);
  }

  const logVisit = useCallback(async (parkId: string, parkName: string, trailName: string, opts?: LogVisitOptions) => {
    const { distanceMiles, dateVisited, elevationGainFt, activityType, rating } = opts ?? {};
    const visit: ParkVisit = {
      visitId: `${parkId}_${Date.now()}`,
      parkId,
      parkName,
      trailName: trailName.trim(),
      dateVisited: dateVisited ?? new Date().toISOString(),
      distanceMiles: distanceMiles && distanceMiles > 0 ? distanceMiles : undefined,
      elevationGainFt: elevationGainFt && elevationGainFt > 0 ? elevationGainFt : undefined,
      activityType: activityType || undefined,
      rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
    };
    const current = await loadFromDisk();
    await persist([visit, ...current]);
  }, []);

  const removeVisit = useCallback(async (visitId: string) => {
    const current = await loadFromDisk();
    await persist(current.filter((v) => v.visitId !== visitId));
  }, []);

  const hasVisited = useCallback((parkId: string) => {
    return visits.some((v) => v.parkId === parkId);
  }, [visits]);

  const visitsForPark = useCallback((parkId: string) => {
    return visits.filter((v) => v.parkId === parkId);
  }, [visits]);

  const totalStats = {
    totalOutings: visits.length,
    uniqueParks: new Set(visits.map((v) => v.parkId)).size,
    totalMiles: Math.round(visits.reduce((s, v) => s + (v.distanceMiles ?? 0), 0) * 10) / 10,
    totalElevationFt: visits.reduce((s, v) => s + (v.elevationGainFt ?? 0), 0),
  };

  return { visits, loading, logVisit, removeVisit, hasVisited, visitsForPark, totalStats };
}

async function loadFromDisk(): Promise<ParkVisit[]> {
  try {
    const info = await FileSystem.getInfoAsync(VISITS_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(VISITS_FILE);
    const parsed = JSON.parse(raw) as ParkVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
