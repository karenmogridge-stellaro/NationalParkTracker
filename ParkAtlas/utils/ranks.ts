import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export const TOTAL_NATIONAL_PARKS = 63;

type MCIName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type Rank = {
  id: string;
  title: string;
  /** Minimum unique national parks to hold this rank. */
  minParks: number;
  icon: MCIName;
  tagline: string;
};

// Ordered ladder. A user's rank is the highest entry whose minParks <= their count.
export const RANKS: readonly Rank[] = [
  { id: 'trailhead',   title: 'Trailhead',   minParks: 0,  icon: 'sign-direction',   tagline: 'Every journey starts at the trailhead.' },
  { id: 'day-hiker',   title: 'Day Hiker',   minParks: 1,  icon: 'hiking',           tagline: 'First park logged. The map just got personal.' },
  { id: 'ranger',      title: 'Ranger',      minParks: 5,  icon: 'shield-star',      tagline: 'Five parks in. You know the trails now.' },
  { id: 'pathfinder',  title: 'Pathfinder',  minParks: 15, icon: 'compass-rose',     tagline: 'Fifteen parks. You go where the map gets quiet.' },
  { id: 'trailblazer', title: 'Trailblazer', minParks: 30, icon: 'fire',             tagline: 'Thirty parks. Nearly half the country\'s wild places.' },
  { id: 'summit',      title: 'Summit',      minParks: TOTAL_NATIONAL_PARKS, icon: 'image-filter-hdr', tagline: 'All 63. There is nothing left but to go again.' },
];

/** Park-count milestones that warrant a bigger celebration than a normal new-park log. */
export const MILESTONES: readonly number[] = [1, 5, 10, 15, 25, 30, 40, 50, 60, TOTAL_NATIONAL_PARKS];

export function rankForCount(uniqueParks: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (uniqueParks >= rank.minParks) current = rank;
  }
  return current;
}

export function nextRankAfter(rank: Rank): Rank | null {
  const idx = RANKS.findIndex((r) => r.id === rank.id);
  return idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

/** 0..1 progress from the current rank's floor toward the next rank's floor. */
export function progressToNextRank(uniqueParks: number): number {
  const current = rankForCount(uniqueParks);
  const next = nextRankAfter(current);
  if (!next) return 1;
  const span = next.minParks - current.minParks;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (uniqueParks - current.minParks) / span));
}

export function isMilestone(uniqueParks: number): boolean {
  return MILESTONES.includes(uniqueParks);
}
