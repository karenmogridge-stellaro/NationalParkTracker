import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii, Shadows } from '@/constants/theme';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { nextRankAfter, rankForCount, TOTAL_NATIONAL_PARKS } from '@/utils/ranks';

type Stat = { label: string; value: string };

type Props = {
  nationalVisited: number;
  /** Optional right-hand column of secondary stats (state parks, miles, etc). */
  stats?: Stat[];
  /** 'card' = elevated white card; 'flat' = sits on a tonal background. */
  variant?: 'card' | 'flat';
};

export function ProgressHero({ nationalVisited, stats = [], variant = 'card' }: Props) {
  const count = Math.max(0, Math.min(TOTAL_NATIONAL_PARKS, nationalVisited));
  const rank = rankForCount(count);
  const next = nextRankAfter(rank);
  const remainingToNext = next ? next.minParks - count : 0;

  return (
    <View
      style={[styles.wrap, variant === 'card' ? styles.card : styles.flat]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${count} of ${TOTAL_NATIONAL_PARKS} national parks visited. Rank ${rank.title}.`}
    >
      <ProgressRing progress={count / TOTAL_NATIONAL_PARKS} size={132} strokeWidth={11} delayMs={150}>
        <Text style={styles.ringValue}>{count}</Text>
        <Text style={styles.ringTotal}>of {TOTAL_NATIONAL_PARKS}</Text>
      </ProgressRing>

      <View style={styles.right}>
        <View style={styles.rankRow}>
          <View style={styles.rankIcon}>
            <MaterialCommunityIcons name={rank.icon} size={16} color={C.onPrimary} />
          </View>
          <Text style={styles.rankTitle} numberOfLines={1}>{rank.title}</Text>
        </View>
        <Text style={styles.rankSub} numberOfLines={2}>
          {next
            ? `${remainingToNext} more ${remainingToNext === 1 ? 'park' : 'parks'} to ${next.title}`
            : 'Every national park. Legendary.'}
        </Text>

        {stats.length > 0 ? (
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    borderRadius: Radii.xl,
    padding: 18,
  },
  card: {
    backgroundColor: C.surface,
    ...Shadows.card,
  },
  flat: {
    backgroundColor: C.surfaceContainerLow,
  },
  ringValue: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1,
    color: C.onSurface,
  },
  ringTotal: {
    marginTop: -2,
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  right: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  rankTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: C.onSurface,
  },
  rankSub: {
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  stat: {
    minWidth: 0,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: C.onSurface,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.onSurfaceVariant,
  },
});
