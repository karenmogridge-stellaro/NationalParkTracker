import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as StoreReview from 'expo-store-review';
import { collection, deleteDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { deleteParkVisitActivity, upsertParkVisitActivity } from '@/utils/userDirectoryApi';
import { db } from '@/utils/firebase';
import { PARKS } from '@/data/parksData';
import { rankForCount, isMilestone, TOTAL_NATIONAL_PARKS, type Rank } from '@/utils/ranks';

const NATIONAL_PARK_IDS = new Set(PARKS.map((p) => p.id));

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

function migrationMarkerFileForUser(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}visits_firestore_migrated_${safeUserId}.json`;
}

export type VisitDatePrecision = 'day' | 'month' | 'year';

export interface ParkVisit {
  visitId: string;          // unique: parkId + timestamp
  parkId: string;
  parkName: string;
  trailName: string;        // empty string if no trail selected
  photoUri?: string;        // optional user-uploaded outing photo (data URI or local URI)
  dateVisited?: string;     // ISO date string (missing when user chose unknown date)
  dateUnknown?: boolean;
  /** How much of dateVisited the user actually knew; defaults to 'day'. */
  datePrecision?: VisitDatePrecision;
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
  datePrecision?: VisitDatePrecision;
  elevationGainFt?: number;
  activityType?: string;
  rating?: number;
}

export interface NewParkEvent {
  id: number;
  parkId: string;
  parkName: string;
  uniqueParks: number;
  totalParks: number;
  newRank?: Rank;
  milestone: boolean;
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
  /** Unique national parks (out of 63) with at least one visit. */
  nationalParkCount: number;
  /** Most recent first-time national park visit this session; consumed by the celebration host. */
  lastNewParkEvent: NewParkEvent | null;
  clearNewParkEvent: () => void;
}

type FirestoreParkVisitDoc = {
  visitId?: string;
  parkId?: string;
  parkName?: string;
  trailName?: string;
  photoUri?: string;
  dateVisited?: string;
  dateUnknown?: boolean;
  datePrecision?: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  activityType?: string;
  rating?: number;
};

function mapFirestoreVisit(docId: string, data: FirestoreParkVisitDoc): ParkVisit | null {
  if (!data?.parkId || !data?.parkName) return null;
  return {
    visitId: typeof data.visitId === 'string' ? data.visitId : docId,
    parkId: data.parkId,
    parkName: data.parkName,
    trailName: typeof data.trailName === 'string' ? data.trailName : '',
    photoUri: typeof data.photoUri === 'string' ? data.photoUri : undefined,
    dateVisited: typeof data.dateVisited === 'string' ? data.dateVisited : undefined,
    dateUnknown: typeof data.dateUnknown === 'boolean' ? data.dateUnknown : undefined,
    datePrecision: data.datePrecision === 'month' || data.datePrecision === 'year' ? data.datePrecision : undefined,
    distanceMiles: typeof data.distanceMiles === 'number' ? data.distanceMiles : undefined,
    elevationGainFt: typeof data.elevationGainFt === 'number' ? data.elevationGainFt : undefined,
    activityType: typeof data.activityType === 'string' ? data.activityType : undefined,
    rating: typeof data.rating === 'number' ? data.rating : undefined,
  };
}

const VisitedParksContext = createContext<VisitedParksState | null>(null);

/** Wrap your root layout with this so every useVisitedParks() call shares the same state. */
export function VisitedParksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [visits, setVisits] = useState<ParkVisit[]>([]);
  const visitsRef = useRef(visits);
  useEffect(() => {
    visitsRef.current = visits;
  }, [visits]);
  const [loading, setLoading] = useState(true);
  const [reviewPrompted, setReviewPrompted] = useState(false);
  const [reviewPromptLoaded, setReviewPromptLoaded] = useState(false);
  const [lastNewParkEvent, setLastNewParkEvent] = useState<NewParkEvent | null>(null);
  const eventIdRef = useRef(0);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      const visitQuery = query(collection(db, 'park_visits'), where('userId', '==', user.id));
      const unsubscribe = onSnapshot(visitQuery, (snapshot) => {
        const nextVisits = snapshot.docs
          .map((snap) => mapFirestoreVisit(snap.id, snap.data() as FirestoreParkVisitDoc))
          .filter((visit): visit is ParkVisit => !!visit)
          .sort((a, b) => {
            const aTime = new Date(a.dateVisited || '1970-01-01').getTime();
            const bTime = new Date(b.dateVisited || '1970-01-01').getTime();
            return bTime - aTime;
          });
        setVisits(nextVisits);
        setLoading(false);
      });

      void migrateLocalVisitsToFirestore(user.id, user.name);

      return () => unsubscribe();
    }

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
    if (user?.id) {
      setVisits(updated);
      return;
    }

    const userId = user?.id || GUEST_USER_ID;
    await FileSystem.writeAsStringAsync(visitsFileForUser(userId), JSON.stringify(updated));
    setVisits(updated);
  }, [user?.id]);

  const logVisit = useCallback(async (parkId: string, parkName: string, trailName: string, opts?: LogVisitOptions) => {
    const userId = user?.id || GUEST_USER_ID;
    const { photoUri, distanceMiles, dateVisited, dateUnknown, datePrecision, elevationGainFt, activityType, rating } = opts ?? {};

    // Snapshot before the write so we can tell whether this unlocks a new national park.
    const before = visitsRef.current;
    const isNewNationalPark = NATIONAL_PARK_IDS.has(parkId) && !before.some((v) => v.parkId === parkId);
    const prevCount = new Set(before.map((v) => v.parkId).filter((id) => NATIONAL_PARK_IDS.has(id))).size;

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
      datePrecision: visitDate && datePrecision && datePrecision !== 'day' ? datePrecision : undefined,
      distanceMiles: distanceMiles && distanceMiles > 0 ? distanceMiles : undefined,
      elevationGainFt: elevationGainFt && elevationGainFt > 0 ? elevationGainFt : undefined,
      activityType: activityType || undefined,
      rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
    };
    if (user?.id) {
      setVisits((prev) => [visit, ...prev.filter((v) => v.visitId !== visit.visitId)]);
    } else {
      const current = await loadFromDiskForUser(userId);
      await persist([visit, ...current]);
    }

    if (isNewNationalPark) {
      const uniqueParks = prevCount + 1;
      const prevRank = rankForCount(prevCount);
      const nextRank = rankForCount(uniqueParks);
      eventIdRef.current += 1;
      setLastNewParkEvent({
        id: eventIdRef.current,
        parkId,
        parkName,
        uniqueParks,
        totalParks: TOTAL_NATIONAL_PARKS,
        newRank: nextRank.id !== prevRank.id ? nextRank : undefined,
        milestone: isMilestone(uniqueParks),
      });
    }

    if (user?.id) {
      try {
        await upsertParkVisitActivity({
          visitId: visit.visitId,
          userId: user.id,
          userName: user.name,
          parkId: visit.parkId,
          parkName: visit.parkName,
          trailName: visit.trailName,
          dateVisited: visit.dateVisited,
          datePrecision: visit.datePrecision,
          distanceMiles: visit.distanceMiles,
          photoUri: visit.photoUri,
        });
      } catch {
        // Non-blocking: keep local visit even if cloud sync fails.
      }
    }
  }, [persist, user?.id, user?.name]);

  const removeVisit = useCallback(async (visitId: string) => {
    const userId = user?.id || GUEST_USER_ID;
    if (user?.id) {
      setVisits((prev) => prev.filter((v) => v.visitId !== visitId));
    } else {
      const current = await loadFromDiskForUser(userId);
      await persist(current.filter((v) => v.visitId !== visitId));
    }

    if (user?.id) {
      try {
        await deleteParkVisitActivity(user.id, visitId);
      } catch {
        // Non-blocking: keep local deletion even if cloud sync fails.
      }
    }
  }, [persist, user?.id]);

  const deleteAllDataForCurrentUser = useCallback(async () => {
    const userId = user?.id || GUEST_USER_ID;

    if (user?.id) {
      // Let failures propagate so the caller can tell the user the delete didn't complete,
      // instead of clearing local state while the cloud data (and any account deletion) still succeeds/fails silently.
      const snapshot = await getDocs(query(collection(db, 'park_visits'), where('userId', '==', user.id)));
      await Promise.all(snapshot.docs.map((snap) => deleteDoc(snap.ref)));
      await FileSystem.deleteAsync(reviewPromptedFileForUser(userId), { idempotent: true }).catch(() => {});

      setVisits([]);
      setReviewPrompted(false);
      return;
    }

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
    const { photoUri, distanceMiles, dateVisited, dateUnknown, datePrecision, elevationGainFt, activityType, rating } = opts ?? {};
    // Read the latest visits via ref, not the closed-over `visits` state, so two quick
    // edits in a row each build on the other's result instead of one clobbering the other.
    const current = user?.id ? visitsRef.current : await loadFromDiskForUser(userId);
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
        datePrecision: !visitDate
          ? undefined
          : hasExplicitDate
            ? (datePrecision && datePrecision !== 'day' ? datePrecision : undefined)
            : v.datePrecision,
        distanceMiles: distanceMiles && distanceMiles > 0 ? distanceMiles : undefined,
        elevationGainFt: elevationGainFt && elevationGainFt > 0 ? elevationGainFt : undefined,
        activityType: activityType || undefined,
        rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
      };
    });
    await persist(updated);

    if (user?.id) {
      const updatedVisit = updated.find((v) => v.visitId === visitId);
      if (updatedVisit) {
        try {
          await upsertParkVisitActivity({
            visitId: updatedVisit.visitId,
            userId: user.id,
            userName: user.name,
            parkId: updatedVisit.parkId,
            parkName: updatedVisit.parkName,
            trailName: updatedVisit.trailName,
            dateVisited: updatedVisit.dateVisited,
            datePrecision: updatedVisit.datePrecision,
            distanceMiles: updatedVisit.distanceMiles,
            photoUri: updatedVisit.photoUri,
          });
        } catch {
          // Non-blocking: keep local update even if cloud sync fails.
        }
      }
    }
  }, [persist, user?.id, user?.name]);

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

  const nationalParkCount = new Set(visits.map((v) => v.parkId).filter((id) => NATIONAL_PARK_IDS.has(id))).size;
  const clearNewParkEvent = useCallback(() => setLastNewParkEvent(null), []);

  return (
    <VisitedParksContext.Provider
      value={{
        visits,
        loading,
        logVisit,
        updateVisit,
        removeVisit,
        deleteAllDataForCurrentUser,
        hasVisited,
        visitsForPark,
        totalStats,
        nationalParkCount,
        lastNewParkEvent,
        clearNewParkEvent,
      }}
    >
      {children}
    </VisitedParksContext.Provider>
  );
}

export function useVisitedParks(): VisitedParksState {
  const ctx = useContext(VisitedParksContext);
  if (!ctx) throw new Error('useVisitedParks must be used inside <VisitedParksProvider>');
  return ctx;
}

async function migrateLocalVisitsToFirestore(userId: string, userName: string): Promise<void> {
  try {
    const markerPath = migrationMarkerFileForUser(userId);
    const markerInfo = await FileSystem.getInfoAsync(markerPath);
    let markerVersion = 0;
    if (markerInfo.exists) {
      try {
        const raw = await FileSystem.readAsStringAsync(markerPath);
        const parsed = JSON.parse(raw) as { version?: number };
        markerVersion = typeof parsed.version === 'number' ? parsed.version : 1;
      } catch {
        markerVersion = 1;
      }
    }
    if (markerVersion >= 2) return;

    const userScopedVisits = await loadFromDiskFile(visitsFileForUser(userId));
    const localVisitById = new Map<string, ParkVisit>();
    userScopedVisits.forEach((visit) => {
      if (visit?.visitId) localVisitById.set(visit.visitId, visit);
    });
    const localVisits = Array.from(localVisitById.values());

    const cloudSnapshot = await getDocs(query(collection(db, 'park_visits'), where('userId', '==', userId)));

    // Cleanup path for earlier buggy migration versions that could import another account's legacy visits.
    if (markerVersion > 0) {
      const localVisitIds = new Set(localVisits.map((visit) => visit.visitId));
      await Promise.all(
        cloudSnapshot.docs
          .filter((snap) => {
            const cloudVisitId = snap.data()?.visitId;
            return typeof cloudVisitId !== 'string' || !localVisitIds.has(cloudVisitId);
          })
          .map((snap) => deleteDoc(snap.ref))
      );
    }

    if (localVisits.length > 0) {
      await Promise.all(
        localVisits.map((visit) =>
          upsertParkVisitActivity({
            visitId: visit.visitId,
            userId,
            userName,
            parkId: visit.parkId,
            parkName: visit.parkName,
            trailName: visit.trailName,
            dateVisited: visit.dateVisited,
            distanceMiles: visit.distanceMiles,
            photoUri: visit.photoUri,
          })
        )
      );
    }

    await FileSystem.writeAsStringAsync(
      markerPath,
      JSON.stringify({ version: 2, migratedAt: new Date().toISOString(), migratedCount: localVisits.length })
    );
  } catch {
    // Non-blocking: realtime Firestore usage should continue even if migration fails.
  }
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
