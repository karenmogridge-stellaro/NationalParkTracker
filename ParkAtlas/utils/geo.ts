export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometers (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function distanceMiles(a: LatLng, b: LatLng): number {
  return kmToMiles(distanceKm(a, b));
}
