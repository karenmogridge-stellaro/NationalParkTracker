import { PARK_TERRAIN_BY_ID, type ParkTerrainKey } from '@/data/parksData';

const UNSPLASH = (id: string, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** One representative photo per terrain, so a park without a user photo still looks like *that kind* of place. */
const TERRAIN_IMAGE: Record<ParkTerrainKey, string> = {
  coastline: UNSPLASH('photo-1507525428034-b723cf961d3e'),
  alpine: UNSPLASH('photo-1464822759023-fed622ff2c3b'),
  woodland: UNSPLASH('photo-1441974231531-c6227db76b6e'),
  desert: UNSPLASH('photo-1473580044384-7ba9967e16a0'),
};

/** Offline/last-resort gradient stops per terrain. */
export const TERRAIN_GRADIENT: Record<ParkTerrainKey, [string, string, string]> = {
  coastline: ['#2a6f97', '#1b4332', '#0b2417'],
  alpine: ['#4a5d6b', '#1b4332', '#0b2417'],
  woodland: ['#2d6a4f', '#1b4332', '#0b2417'],
  desert: ['#b5651d', '#7a3e10', '#2a1505'],
};

export function terrainForPark(parkId?: string): ParkTerrainKey {
  return (parkId && PARK_TERRAIN_BY_ID[parkId]) || 'woodland';
}

export function fallbackImageForPark(parkId?: string): string {
  return TERRAIN_IMAGE[terrainForPark(parkId)];
}

export function gradientForPark(parkId?: string): [string, string, string] {
  return TERRAIN_GRADIENT[terrainForPark(parkId)];
}

/** Generic hiking photo for visits with no park context. */
export const DEFAULT_HIKE_IMAGE = UNSPLASH('photo-1504280390367-361c6d9f38f4');
export const DEFAULT_AVATAR = UNSPLASH('photo-1542038784456-1ea8e935640e', 160);
