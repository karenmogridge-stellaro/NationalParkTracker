import { PARKS, type NationalPark } from '@/data/parksData';

/** Same rule the website uses for /parks/<slug>; keep in sync with web/build-parks.mjs (it imports this). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u02bb\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const PARK_BY_SLUG = new Map(PARKS.map((p) => [slugify(p.name), p]));

export function parkSlug(park: Pick<NationalPark, 'name'>): string {
  return slugify(park.name);
}

export function parkBySlug(slug: string | undefined | null): NationalPark | undefined {
  return slug ? PARK_BY_SLUG.get(slugify(String(slug))) : undefined;
}

/** Accepts a slug ("zion") or the numeric id ("63") the website uses to keep /import links short. */
export function parkByRef(ref: string | undefined | null): NationalPark | undefined {
  const s = String(ref ?? '').trim();
  if (!s) return undefined;
  return PARK_BY_SLUG.get(slugify(s)) ?? PARKS.find((p) => p.id === s);
}

export function parkWebUrl(park: Pick<NationalPark, 'name'>): string {
  return `https://parkatlas.io/parks/${parkSlug(park)}`;
}
