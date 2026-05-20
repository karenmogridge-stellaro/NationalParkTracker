import { NationalPark, PARKS, PARK_TERRAIN_BY_ID, ParkTerrainKey } from '@/data/parksData';

export type TerrainKey = ParkTerrainKey;

export interface TerrainItem {
  key: TerrainKey;
  label: string;
  icon: string;
  parks: number;
}

const TERRAIN_META: Array<Omit<TerrainItem, 'parks'>> = [
  { key: 'coastline', label: 'Coastline', icon: 'waves' },
  { key: 'alpine', label: 'Alpine', icon: 'terrain' },
  { key: 'woodland', label: 'Woodland', icon: 'pine-tree' },
  { key: 'desert', label: 'Desert', icon: 'grain' },
];

export function terrainItemsFromParks(parks: NationalPark[] = PARKS): TerrainItem[] {
  return TERRAIN_META.map((terrain) => ({
    ...terrain,
    parks: parks.filter((park) => PARK_TERRAIN_BY_ID[park.id] === terrain.key).length,
  }));
}
