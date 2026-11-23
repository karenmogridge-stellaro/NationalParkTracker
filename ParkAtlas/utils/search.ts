const STATE_NAME_BY_CODE: Record<string, string> = {
  AK: 'alaska',
  AL: 'alabama',
  AR: 'arkansas',
  AS: 'american samoa',
  AZ: 'arizona',
  CA: 'california',
  CO: 'colorado',
  CT: 'connecticut',
  DC: 'district of columbia',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  GU: 'guam',
  HI: 'hawaii',
  IA: 'iowa',
  ID: 'idaho',
  IL: 'illinois',
  IN: 'indiana',
  KS: 'kansas',
  KY: 'kentucky',
  LA: 'louisiana',
  MA: 'massachusetts',
  MD: 'maryland',
  ME: 'maine',
  MI: 'michigan',
  MN: 'minnesota',
  MO: 'missouri',
  MP: 'northern mariana islands',
  MS: 'mississippi',
  MT: 'montana',
  NC: 'north carolina',
  ND: 'north dakota',
  NE: 'nebraska',
  NH: 'new hampshire',
  NJ: 'new jersey',
  NM: 'new mexico',
  NV: 'nevada',
  NY: 'new york',
  OH: 'ohio',
  OK: 'oklahoma',
  OR: 'oregon',
  PA: 'pennsylvania',
  PR: 'puerto rico',
  RI: 'rhode island',
  SC: 'south carolina',
  SD: 'south dakota',
  TN: 'tennessee',
  TX: 'texas',
  UT: 'utah',
  VA: 'virginia',
  VI: 'virgin islands',
  VT: 'vermont',
  WA: 'washington',
  WI: 'wisconsin',
  WV: 'west virginia',
  WY: 'wyoming',
};

const STATE_CODE_BY_NAME = Object.entries(STATE_NAME_BY_CODE).reduce<Record<string, string>>(
  (acc, [code, name]) => {
    acc[name] = code.toLowerCase();
    return acc;
  },
  {}
);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasesForToken(token: string): string[] {
  if (token.length === 2) {
    const maybeName = STATE_NAME_BY_CODE[token.toUpperCase()];
    if (maybeName) return [token, maybeName];
  }

  const maybeCode = STATE_CODE_BY_NAME[token];
  if (maybeCode) return [token, maybeCode];

  return [token];
}

export function stateNameFromCode(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return STATE_NAME_BY_CODE[code.toUpperCase()];
}

/** Title-cased state name for display ("California"); falls back to the code. */
export function stateDisplayName(code: string | null | undefined): string {
  const raw = stateNameFromCode(code);
  if (!raw) return code || '';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

type NonNpsPlace = { name: string; note: string; aliases: string[] };

// Well-known places people often assume are National Parks but that the National
// Park Service does not manage, so they're correctly absent from the catalog.
// Used to show a helpful note instead of empty search results (see issue #6).
const NON_NPS_PLACES: NonNpsPlace[] = [
  {
    name: 'Gila',
    note: 'Gila is a National Forest and Wilderness in New Mexico, managed by the U.S. Forest Service — not a National Park Service unit.',
    aliases: ['gila'],
  },
  {
    name: 'Sedona',
    note: 'Sedona is a red-rock area in Arizona within the Coconino National Forest (U.S. Forest Service), not a National Park.',
    aliases: ['sedona'],
  },
  {
    name: 'Mount St. Helens',
    note: 'Mount St. Helens is a National Volcanic Monument in Washington, managed by the U.S. Forest Service — not a National Park.',
    aliases: ['mount st helens', 'mt st helens', 'st helens', 'saint helens'],
  },
  {
    name: 'Columbia River Gorge',
    note: 'The Columbia River Gorge is a National Scenic Area (U.S. Forest Service) on the Oregon–Washington border, not a National Park.',
    aliases: ['columbia river gorge', 'columbia gorge'],
  },
  {
    name: 'Flaming Gorge',
    note: 'Flaming Gorge is a National Recreation Area (U.S. Forest Service) in Utah and Wyoming, not a National Park.',
    aliases: ['flaming gorge'],
  },
  {
    name: 'Sawtooth',
    note: 'The Sawtooths are a National Recreation Area and Wilderness in Idaho, managed by the U.S. Forest Service — not a National Park.',
    aliases: ['sawtooth', 'sawtooths'],
  },
  {
    name: 'Monument Valley',
    note: 'Monument Valley is a Navajo Nation Tribal Park in Arizona and Utah, not a National Park Service unit.',
    aliases: ['monument valley'],
  },
  {
    name: 'Antelope Canyon',
    note: 'Antelope Canyon is on Navajo Nation land in Arizona, visited via Navajo-guided tours — not a National Park.',
    aliases: ['antelope canyon'],
  },
  {
    name: 'Lake Tahoe',
    note: 'Lake Tahoe straddles California and Nevada and is managed by several agencies (mostly U.S. Forest Service and state parks), not a single National Park.',
    aliases: ['lake tahoe', 'tahoe'],
  },
  {
    name: 'Mount Shasta',
    note: 'Mount Shasta is in the Shasta-Trinity National Forest (U.S. Forest Service) in California, not a National Park.',
    aliases: ['mount shasta', 'mt shasta', 'shasta'],
  },
];

/**
 * If a query matches a well-known place that is NOT a National Park Service unit,
 * return a friendly note explaining why it isn't in the catalog. Otherwise null.
 */
export function nonNpsPlaceHint(query: string): { name: string; note: string } | null {
  const q = normalize(query);
  if (!q) return null;
  for (const place of NON_NPS_PLACES) {
    const match = place.aliases.some((alias) => {
      const a = normalize(alias);
      return q.includes(a) || (q.length >= 3 && a.startsWith(q));
    });
    if (match) return { name: place.name, note: place.note };
  }
  return null;
}

export function matchesWildcardQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const haystack = fields
    .map((value) => normalize(value ?? ''))
    .filter(Boolean);

  return tokens.every((token) => {
    const candidates = aliasesForToken(token);
    return candidates.some((candidate) => haystack.some((field) => field.includes(candidate)));
  });
}
