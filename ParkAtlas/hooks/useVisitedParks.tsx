import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/hooks/useAuth';

const LEGACY_VISITS_FILE = `${FileSystem.documentDirectory}visited_parks.json`;

function visitsFileForUser(userId: string): string {
  // Keep filenames filesystem-safe and deterministic per account.
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}visited_parks_${safeUserId}.json`;
}

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
  updateVisit: (visitId: string, parkId: string, parkName: string, trailName: string, opts?: LogVisitOptions) => Promise<void>;
  removeVisit: (visitId: string) => Promise<void>;
  hasVisited: (parkId: string) => boolean;
  visitsForPark: (parkId: string) => ParkVisit[];
  totalStats: { totalOutings: number; uniqueParks: number; totalMiles: number; totalElevationFt: number };
}

const VisitedParksContext = createContext<VisitedParksState | null>(null);

/** Wrap your root layout with this so every useVisitedParks() call shares the same state. */
export function VisitedParksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [visits, setVisits] = useState<ParkVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user-scoped visits from disk whenever the authenticated user changes.
  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setVisits([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userFile = visitsFileForUser(user.id);
        const info = await FileSystem.getInfoAsync(userFile);

        // One-time migration path: if this user has no file yet, seed from legacy shared file.
        if (!info.exists) {
          const legacy = await loadFromDiskFile(LEGACY_VISITS_FILE);
          if (legacy.length > 0) {
            await FileSystem.writeAsStringAsync(userFile, JSON.stringify(legacy));
            setVisits(legacy);
          } else {
            setVisits([]);
          }
          return;
        }

        const parsed = await loadFromDiskFile(userFile);
        setVisits(parsed);
      } catch {
        // First run or corrupt file — start fresh.
        setVisits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const persist = useCallback(async (updated: ParkVisit[]) => {
    if (!user?.id) return;
    await FileSystem.writeAsStringAsync(visitsFileForUser(user.id), JSON.stringify(updated));
    setVisits(updated);
  }, [user?.id]);

  const logVisit = useCallback(async (parkId: string, parkName: string, trailName: string, opts?: LogVisitOptions) => {
    if (!user?.id) return;
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
    const current = await loadFromDiskForUser(user.id);
    await persist([visit, ...current]);
  }, [persist, user?.id]);

  const removeVisit = useCallback(async (visitId: string) => {
    if (!user?.id) return;
    const current = await loadFromDiskForUser(user.id);
    await persist(current.filter((v) => v.visitId !== visitId));
  }, [persist, user?.id]);

  const updateVisit = useCallback(async (
    visitId: string,
    parkId: string,
    parkName: string,
    trailName: string,
    opts?: LogVisitOptions,
  ) => {
    if (!user?.id) return;
    const { distanceMiles, dateVisited, elevationGainFt, activityType, rating } = opts ?? {};
    const current = await loadFromDiskForUser(user.id);
    const updated = current.map((v): ParkVisit => {
      if (v.visitId !== visitId) return v;
      return {
        ...v,
        parkId,
        parkName,
        trailName: trailName.trim(),
        dateVisited: dateVisited ?? v.dateVisited,
        distanceMiles: distanceMiles && distanceMiles > 0 ? distanceMiles : undefined,
        elevationGainFt: elevationGainFt && elevationGainFt > 0 ? elevationGainFt : undefined,
        activityType: activityType || undefined,
        rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
      };
    });
    await persist(updated);
  }, [persist, user?.id]);

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

  return (
    <VisitedParksContext.Provider value={{ visits, loading, logVisit, updateVisit, removeVisit, hasVisited, visitsForPark, totalStats }}>
      {children}
    </VisitedParksContext.Provider>
  );
}

export function useVisitedParks(): VisitedParksState {
  const ctx = useContext(VisitedParksContext);
  if (!ctx) throw new Error('useVisitedParks must be used inside <VisitedParksProvider>');
  return ctx;
}

async function loadFromDisk(): Promise<ParkVisit[]> {
  return loadFromDiskFile(LEGACY_VISITS_FILE);
}

async function loadFromDiskForUser(userId: string): Promise<ParkVisit[]> {
  return loadFromDiskFile(visitsFileForUser(userId));
}

async function loadFromDiskFile(filePath: string): Promise<ParkVisit[]> {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(filePath);
    const parsed = JSON.parse(raw) as ParkVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
