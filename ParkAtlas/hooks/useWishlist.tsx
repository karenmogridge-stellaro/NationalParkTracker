import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/hooks/useAuth';

const LEGACY_FILE = `${FileSystem.documentDirectory}park_checklist.json`;
const GUEST_USER_ID = 'guest_user';

function fileForUser(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}park_checklist_${safe}.json`;
}

async function readIds(path: string): Promise<string[] | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(path));
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : null;
  } catch {
    return null;
  }
}

type WishlistState = {
  wishlistIds: string[];
  loading: boolean;
  isWishlisted: (parkId: string) => boolean;
  add: (parkId: string) => Promise<void>;
  remove: (parkId: string) => Promise<void>;
  toggle: (parkId: string) => Promise<void>;
  /** Replace the whole list (used by Explore's bulk checklist editor). */
  setAll: (ids: string[]) => Promise<void>;
};

const WishlistContext = createContext<WishlistState | null>(null);

/** Parks the user wants to visit ("Your Parks" checklist in Explore). Persisted per account, guest included. */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || GUEST_USER_ID;
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const path = fileForUser(userId);
      let ids = await readIds(path);
      if (!ids) {
        // One-time migration from the pre-multi-account file.
        const legacy = await readIds(LEGACY_FILE);
        if (legacy && legacy.length > 0) {
          ids = legacy;
          await FileSystem.writeAsStringAsync(path, JSON.stringify(ids)).catch(() => {});
        }
      }
      if (active) {
        setWishlistIds(ids ?? []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const idsRef = useRef<string[]>([]);
  useEffect(() => {
    idsRef.current = wishlistIds;
  }, [wishlistIds]);

  const setAll = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids));
    idsRef.current = unique;
    setWishlistIds(unique);
    await FileSystem.writeAsStringAsync(fileForUser(userId), JSON.stringify(unique)).catch(() => {});
  }, [userId]);

  // Read through the ref so rapid sequential calls (e.g. "add all") don't clobber each other.
  const add = useCallback(async (parkId: string) => {
    if (idsRef.current.includes(parkId)) return;
    await setAll([...idsRef.current, parkId]);
  }, [setAll]);

  const remove = useCallback(async (parkId: string) => {
    if (!idsRef.current.includes(parkId)) return;
    await setAll(idsRef.current.filter((id) => id !== parkId));
  }, [setAll]);

  const toggle = useCallback(async (parkId: string) => {
    if (idsRef.current.includes(parkId)) await remove(parkId);
    else await add(parkId);
  }, [add, remove]);

  const isWishlisted = useCallback((parkId: string) => wishlistIds.includes(parkId), [wishlistIds]);

  const value = useMemo<WishlistState>(
    () => ({ wishlistIds, loading, isWishlisted, add, remove, toggle, setAll }),
    [wishlistIds, loading, isWishlisted, add, remove, toggle, setAll],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistState {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
