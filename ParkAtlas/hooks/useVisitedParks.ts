import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

const VISITS_FILE = `${FileSystem.documentDirectory}visited_parks.json`;

export interface ParkVisit {
  visitId: string;   // unique: parkId + timestamp
  parkId: string;
  parkName: string;
  trailName: string; // empty string if no trail selected
  dateVisited: string; // ISO date string
}

interface VisitedParksState {
  visits: ParkVisit[];
  loading: boolean;
  logVisit: (parkId: string, parkName: string, trailName: string) => Promise<void>;
  removeVisit: (visitId: string) => Promise<void>;
  hasVisited: (parkId: string) => boolean;
  visitsForPark: (parkId: string) => ParkVisit[];
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

  const logVisit = useCallback(async (parkId: string, parkName: string, trailName: string) => {
    const visit: ParkVisit = {
      visitId: `${parkId}_${Date.now()}`,
      parkId,
      parkName,
      trailName: trailName.trim(),
      dateVisited: new Date().toISOString(),
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

  return { visits, loading, logVisit, removeVisit, hasVisited, visitsForPark };
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
