import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as StoreReview from 'expo-store-review';
import { useAuth } from '@/hooks/useAuth';

const LEGACY_VISITS_FILE = `${FileSystem.documentDirectory}visited_parks.json`;
const REVIEW_PROMPTED_LEGACY_FILE = `${FileSystem.documentDirectory}review_prompted.json`;
const GUEST_USER_ID = 'guest_user';  // Anonymous/offline user ID for unsigned-in users

function visitsFileForUser(userId: string): string {
  // Keep filenames filesystem-safe and deterministic per account.
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}visited_parks_${safeUserId}.json`;
}

function reviewPromptedFileForUser(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}review_prompted_${safeUserId}.json`;
}

export interface ParkVisit {
  visitId: string;          // unique: parkId + timestamp
  parkId: string;
  parkName: string;
  trailName: string;        // empty string if no trail selected
  photoUri?: string;        // optional user-uploaded outing photo (data URI or local URI)
  dateVisited?: string;     // ISO date string (missing when user chose unknown date)
  dateUnknown?: boolean;
  distanceMiles?: number;   // optional manual distance in miles
  elevationGainFt?: number; // optional elevation gain in feet
  activityType?: string;    // e.g. 'Hike', 'Backpack', 'Camp', 'Scenic Drive', 'Wildlife'
  rating?: number;          // 1–5 star rating
}

export interface LogVisitOptions {
  photoUri?: string | null;
  distanceMiles?: number;
  dateVisited?: string;
  dateUnknown?: boolean;
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
  deleteAllDataForCurrentUser: () => Promise<void>;
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
  const [reviewPrompted, setReviewPrompted] = useState(false);
  const [reviewPromptLoaded, setReviewPromptLoaded] = useState(false);

  // Load user-scoped visits from disk whenever the authenticated user changes.
  // Falls back to GUEST_USER_ID if not logged in, enabling offline data persistence.
  useEffect(() => {
    (async () => {
      const userId = user?.id || GUEST_USER_ID;
      setLoading(true);
      try {
        const userFile = visitsFileForUser(userId);
        const info = await FileSystem.getInfoAsync(userFile);

        // One-time migration path: if this user has no file yet, seed from legacy shared file.
        if (!info.exists && !user?.id) {
          // Only try legacy migration for guest users on first load
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

  useEffect(() => {
    (async () => {
      const userId = user?.id || GUEST_USER_ID;
      setReviewPromptLoaded(false);
      try {
        const userFile = reviewPromptedFileForUser(userId);
        const info = await FileSystem.getInfoAsync(userFile);
        if (info.exists) {
          setReviewPrompted(true);
          return;
        }

        // One-time migration path for old single-user prompt flag.
        const legacyInfo = await FileSystem.getInfoAsync(REVIEW_PROMPTED_LEGACY_FILE);
        if (legacyInfo.exists) {
          await FileSystem.writeAsStringAsync(userFile, '1');
          setReviewPrompted(true);
          return;
        }

        setReviewPrompted(false);
      } catch {
        setReviewPrompted(false);
      } finally {
        setReviewPromptLoaded(true);
      }
    })();
  }, [user?.id]);

  const markReviewPrompted = useCallback(async () => {
    if (reviewPrompted) return;
    const userId = user?.id || GUEST_USER_ID;
    await FileSystem.writeAsStringAsync(reviewPromptedFileForUser(userId), '1');
    setReviewPrompted(true);
  }, [reviewPrompted, user?.id]);

  useEffect(() => {
    (async () => {
      if (!user?.id || !reviewPromptLoaded || reviewPrompted) return;
      const uniqueParks = new Set(visits.map((v) => v.parkId)).size;
      if (uniqueParks < 5) return;

      const available = await StoreReview.isAvailableAsync();
      await markReviewPrompted();
      if (available) {
        await StoreReview.requestReview();
      }
    })();
  }, [markReviewPrompted, reviewPromptLoaded, reviewPrompted, user?.id, visits]);

  const persist = useCallback(async (updated: ParkVisit[]) => {
    const userId = user?.id || GUEST_USER_ID;
    await FileSystem.writeAsStringAsync(visitsFileForUser(userId), JSON.stringify(updated));
    setVisits(updated);
  }, [user?.id]);

  const logVisit = useCallback(async (parkId: string, parkName: string, trailName: string, opts?: LogVisitOptions) => {
    const userId = user?.id || GUEST_USER_ID;
    const { photoUri, distanceMiles, dateVisited, dateUnknown, elevationGainFt, activityType, rating } = opts ?? {};
    const hasExplicitDate = dateUnknown !== undefined || dateVisited !== undefined;
    const visitDate = hasExplicitDate
      ? (dateUnknown ? undefined : dateVisited)
      : new Date().toISOString();
    const visit: ParkVisit = {
      visitId: `${parkId}_${Date.now()}`,
      parkId,
      parkName,
      trailName: trailName.trim(),
      photoUri: photoUri || undefined,
      dateVisited: visitDate,
      dateUnknown: hasExplicitDate ? (dateUnknown || !visitDate) : false,
      distanceMiles: distanceMiles && distanceMiles > 0 ? distanceMiles : undefined,
      elevationGainFt: elevationGainFt && elevationGainFt > 0 ? elevationGainFt : undefined,
      activityType: activityType || undefined,
      rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
    };
    const current = await loadFromDiskForUser(userId);
    await persist([visit, ...current]);
  }, [persist, user?.id]);

  const removeVisit = useCallback(async (visitId: string) => {
    const userId = user?.id || GUEST_USER_ID;
    const current = await loadFromDiskForUser(userId);
    await persist(current.filter((v) => v.visitId !== visitId));
  }, [persist, user?.id]);

  const deleteAllDataForCurrentUser = useCallback(async () => {
    const userId = user?.id || GUEST_USER_ID;
    await Promise.all([
      FileSystem.deleteAsync(visitsFileForUser(userId), { idempotent: true }).catch(() => {}),
      FileSystem.deleteAsync(reviewPromptedFileForUser(userId), { idempotent: true }).catch(() => {}),
      // Best-effort cleanup of legacy shared files.
      FileSystem.deleteAsync(LEGACY_VISITS_FILE, { idempotent: true }).catch(() => {}),
      FileSystem.deleteAsync(REVIEW_PROMPTED_LEGACY_FILE, { idempotent: true }).catch(() => {}),
    ]);
    setVisits([]);
    setReviewPrompted(false);
  }, [user?.id]);

  const updateVisit = useCallback(async (
    visitId: string,
    parkId: string,
    parkName: string,
    trailName: string,
    opts?: LogVisitOptions,
  ) => {
    const userId = user?.id || GUEST_USER_ID;
    const { photoUri, distanceMiles, dateVisited, dateUnknown, elevationGainFt, activityType, rating } = opts ?? {};
    const current = await loadFromDiskForUser(userId);
    const updated = current.map((v): ParkVisit => {
      if (v.visitId !== visitId) return v;
      const hasExplicitDate = dateUnknown !== undefined || dateVisited !== undefined;
      const visitDate = hasExplicitDate ? (dateUnknown ? undefined : dateVisited) : v.dateVisited;
      const nextPhotoUri = photoUri === null ? undefined : (photoUri ?? v.photoUri);
      return {
        ...v,
        parkId,
        parkName,
        trailName: trailName.trim(),
        photoUri: nextPhotoUri,
        dateVisited: visitDate,
        dateUnknown: hasExplicitDate ? (dateUnknown || !visitDate) : v.dateUnknown,
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
    <VisitedParksContext.Provider value={{ visits, loading, logVisit, updateVisit, removeVisit, deleteAllDataForCurrentUser, hasVisited, visitsForPark, totalStats }}>
      {children}
    </VisitedParksContext.Provider>
  );
}

export function useVisitedParks(): VisitedParksState {
  const ctx = useContext(VisitedParksContext);
  if (!ctx) throw new Error('useVisitedParks must be used inside <VisitedParksProvider>');
  return ctx;
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
