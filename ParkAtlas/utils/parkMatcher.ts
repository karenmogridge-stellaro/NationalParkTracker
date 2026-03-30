import { PARKS, NationalPark } from '../data/parksData';

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine great-circle distance between two lat/lng points (in km).
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Returns the National Park whose center is closest to (lat, lng) AND within
 * that park's `radiusKm` threshold, or `null` if no park matches.
 */
export function matchPark(lat: number, lng: number): NationalPark | null {
  let best: NationalPark | null = null;
  let bestDist = Infinity;

  for (const park of PARKS) {
    const dist = haversineKm(lat, lng, park.lat, park.lng);
    if (dist <= park.radiusKm && dist < bestDist) {
      best = park;
      bestDist = dist;
    }
  }

  return best;
}

/**
 * Returns the unique set of parks matched from a list of [lat, lng] positions.
 */
export function matchedParksFromCoords(
  coords: Array<[number, number] | null | undefined>,
): NationalPark[] {
  const seen = new Set<string>();
  const result: NationalPark[] = [];
  for (const c of coords) {
    if (!c) continue;
    const park = matchPark(c[0], c[1]);
    if (park && !seen.has(park.id)) {
      seen.add(park.id);
      result.push(park);
    }
  }
  return result;
}
