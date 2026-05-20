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
