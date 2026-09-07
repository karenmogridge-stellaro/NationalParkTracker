import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { rankForCount, nextRankAfter, TOTAL_NATIONAL_PARKS } from '@/utils/ranks';
import { fallbackImageForPark, gradientForPark } from '@/utils/parkImagery';

export type ShareCardFormat = 'card' | 'story';
export type ShareCardVariant = 'park' | 'rank';

export type ShareCardProps = {
  parkName: string;
  state: string;
  nationalVisited: number;
  /** Used for the terrain photo/gradient when there's no user photo. */
  parkId?: string;
  /** Optional user photo to use as the card background. */
  photoUri?: string;
  /** Optional line under the park name, e.g. "3 visits · 12.4 mi". */
  detail?: string;
  /** First name of the person sharing; makes the card read as theirs ("Karen just hit Pathfinder"). */
  userName?: string;
  /** Invitation line shown above the CTA bar. Defaults per variant; pass '' to hide. */
  invite?: string;
  /** 'park' = "I visited X" photo card; 'rank' = ring-centric rank-up / milestone card. */
  variant?: ShareCardVariant;
  /** 'card' = 3:4 for feeds/iMessage; 'story' = 9:16 for Instagram/TikTok Stories. */
  format?: ShareCardFormat;
};

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 480;
export const SHARE_STORY_WIDTH = 360;
export const SHARE_STORY_HEIGHT = 640;

export function shareCardSize(format: ShareCardFormat = 'card'): { width: number; height: number } {
  return format === 'story'
    ? { width: SHARE_STORY_WIDTH, height: SHARE_STORY_HEIGHT }
    : { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT };
}

const ACCENTS = ['#d9a441', '#95d5b2', '#e76f51', '#f4a261', '#ffffff'];

/** Static confetti scatter so the rank card feels like a moment, not a form. */
function Confetti({ seed, count = 22 }: { seed: number; count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const t = (i + 1) * 9301 + seed * 49297;
    const r = (n: number) => ((t * n) % 233280) / 233280;
    return {
      left: `${r(1) * 100}%`,
      top: `${r(2) * 55}%`,
      size: 4 + r(3) * 6,
      rotate: `${r(4) * 360}deg`,
      color: ACCENTS[i % ACCENTS.length],
      round: r(5) > 0.5,
      opacity: 0.55 + r(6) * 0.4,
    };
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: p.left as `${number}%`,
            top: p.top as `${number}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.9,
            borderRadius: p.round ? p.size / 2 : 1.5,
            backgroundColor: p.color,
            opacity: p.opacity,
            transform: [{ rotate: p.rotate }],
          }}
        />
      ))}
    </View>
  );
}

function Ring({ size, stroke, pct, children }: { size: number; stroke: number; pct: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/**
 * Fixed-size card designed to be captured with react-native-view-shot.
 * Rendered off-screen; never shown directly in the UI.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { parkName, state, nationalVisited, parkId, photoUri, detail, userName, invite, variant = 'park', format = 'card' },
  ref,
) {
  const rank = rankForCount(nationalVisited);
  const next = nextRankAfter(rank);
  const story = format === 'story';
  const bg = photoUri || fallbackImageForPark(parkId);
  const gradient = gradientForPark(parkId);
  const pct = nationalVisited / TOTAL_NATIONAL_PARKS;
  const who = userName?.trim();
  const inviteLine = invite !== undefined
    ? invite
    : variant === 'rank'
      ? 'Who\u2019s coming on the next one? \ud83d\udc40'
      : 'Come find me on ParkAtlas \u2014 let\u2019s compare rings.';

  const Background = (
    <>
      <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </>
  );

  const Brand = (
    <View style={styles.topRow}>
      <View style={styles.brand}>
        <View style={styles.logoTile}>
          <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.brandText}>ParkAtlas</Text>
      </View>
      {state ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{state}</Text>
        </View>
      ) : null}
    </View>
  );

  // High-contrast strip that survives Stories compression and reads as a button.
  const CtaBar = (
    <View style={styles.ctaBar}>
      <View style={styles.ctaLeft}>
        <Text style={styles.ctaTitle}>Track your parks free</Text>
        <Text style={styles.ctaUrl}>parkatlas.io</Text>
      </View>
      <View style={styles.ctaBtn}>
        <MaterialCommunityIcons name="apple" size={14} color={C.onPrimary} />
        <Text style={styles.ctaBtnText}>Get the app</Text>
      </View>
    </View>
  );

  if (variant === 'rank') {
    const ringSize = story ? 220 : 180;
    return (
      <View ref={ref} style={[styles.card, story && styles.cardStory]} collapsable={false}>
        {Background}
        <LinearGradient
          colors={['rgba(8,18,12,0.6)', 'rgba(8,18,12,0.55)', 'rgba(8,18,12,0.94)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Confetti seed={nationalVisited} count={story ? 28 : 20} />

        {Brand}

        <View style={styles.ringWrap}>
          <Ring size={ringSize} stroke={story ? 16 : 14} pct={pct}>
            <View style={styles.ringCenter}>
              <View style={styles.ringIcon}>
                <MaterialCommunityIcons name={rank.icon} size={story ? 34 : 28} color={C.primary} />
              </View>
              <Text style={[styles.ringValue, story && styles.ringValueStory]}>{nationalVisited}</Text>
              <Text style={styles.ringTotal}>of {TOTAL_NATIONAL_PARKS} parks</Text>
            </View>
          </Ring>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.eyebrow}>{who ? `${who.toUpperCase()} JUST HIT` : 'NEW RANK UNLOCKED'}</Text>
          <Text style={[styles.title, story && styles.titleStory]} numberOfLines={2}>{rank.title}</Text>
          <Text style={styles.tagline} numberOfLines={2}>
            {nationalVisited} national {nationalVisited === 1 ? 'park' : 'parks'} · unlocked at {parkName}
            {next ? ` · ${next.minParks - nationalVisited} to ${next.title}` : ''}
          </Text>
          {inviteLine ? <Text style={styles.invite}>{inviteLine}</Text> : null}
          {CtaBar}
        </View>
      </View>
    );
  }

  // ── 'park' variant: photo-first "I visited" card ──
  return (
    <View ref={ref} style={[styles.card, story && styles.cardStory]} collapsable={false}>
      {Background}
      <LinearGradient
        colors={['rgba(8,18,12,0.35)', 'rgba(8,18,12,0.05)', 'rgba(8,18,12,0.94)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {Brand}

      <View style={styles.bottom}>
        <Text style={styles.eyebrow}>{who ? `${who.toUpperCase()} VISITED` : 'I VISITED'}</Text>
        <Text style={[styles.title, story && styles.titleStory]} numberOfLines={3}>{parkName}</Text>
        <Text style={styles.tagline}>
          {detail ? `${detail} · ` : ''}park {nationalVisited} of {TOTAL_NATIONAL_PARKS} on my list
        </Text>

        <View style={styles.statsRow}>
          <Ring size={64} stroke={7} pct={pct}>
            <Text style={styles.miniRingValue}>{nationalVisited}</Text>
          </Ring>
          <View style={styles.statsText}>
            <Text style={styles.statsBig}>{nationalVisited} <Text style={styles.statsSmall}>/ {TOTAL_NATIONAL_PARKS}</Text></Text>
            <Text style={styles.statsLabel}>NATIONAL PARKS</Text>
          </View>
          <View style={styles.rankPill}>
            <MaterialCommunityIcons name={rank.icon} size={14} color={C.onPrimary} />
            <Text style={styles.rankPillText}>{rank.title}</Text>
          </View>
        </View>

        {inviteLine ? <Text style={styles.invite}>{inviteLine}</Text> : null}
        {CtaBar}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.primary,
    justifyContent: 'space-between',
    padding: 24,
  },
  cardStory: {
    width: SHARE_STORY_WIDTH,
    height: SHARE_STORY_HEIGHT,
    borderRadius: 0,
    // Keep content clear of Instagram/TikTok top and bottom UI chrome.
    paddingTop: 88,
    paddingBottom: 110,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 26,
    height: 26,
  },
  brandText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 6,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  // Rank variant
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ringCenter: {
    alignItems: 'center',
    gap: 2,
  },
  ringIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ringValue: {
    color: '#ffffff',
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  ringValueStory: {
    fontSize: 56,
    lineHeight: 60,
  },
  ringTotal: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Shared bottom block
  bottom: {
    gap: 6,
  },
  eyebrow: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  titleStory: {
    fontSize: 48,
    lineHeight: 52,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  invite: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  ctaBar: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ctaLeft: {
    flex: 1,
    minWidth: 0,
  },
  ctaTitle: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: '800',
  },
  ctaUrl: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaBtnText: {
    color: C.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 14,
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  footerText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerMuted: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },

  // Park variant stats row
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 12,
  },
  miniRingValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  statsText: {
    flex: 1,
    gap: 2,
  },
  statsBig: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  statsSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rankPillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
