import React, { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii, Shadows } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import type { Rank } from '@/utils/ranks';

export type CelebrationPayload = {
  /** Changes per event so a repeat celebration remounts the confetti. */
  id?: number;
  parkName: string;
  uniqueParks: number;
  totalParks: number;
  /** Set when this visit crossed a rank threshold. */
  newRank?: Rank;
  /** Set when the new count is on the milestone list (bigger burst). */
  milestone?: boolean;
};

type Props = {
  payload: CelebrationPayload | null;
  onDismiss: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CONFETTI_COLORS = [C.primary, C.accent, '#95d5b2', '#e76f51', '#f4a261', '#2a9d8f', '#ffffff'];

type Particle = {
  x: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
};

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * SCREEN_W,
    delay: Math.random() * 500,
    duration: 2200 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() - 0.5) * 1080,
    size: 6 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    round: Math.random() > 0.6,
  }));
}

function ConfettiPiece({ p }: { p: Particle }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: p.duration, easing: Easing.in(Easing.quad) }));
  }, [t, p.delay, p.duration]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : 1 - (t.value - 0.85) / 0.15,
    transform: [
      { translateY: -40 + t.value * (SCREEN_H + 80) },
      { translateX: Math.sin(t.value * Math.PI * 2) * 18 + t.value * p.drift },
      { rotate: `${t.value * p.spin}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: p.x,
          width: p.size,
          height: p.round ? p.size : p.size * 1.8,
          borderRadius: p.round ? p.size / 2 : 2,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

function ConfettiBurst({ count }: { count: number }) {
  const particles = useMemo(() => makeParticles(count), [count]);
  return (
    <View style={styles.confettiLayer} pointerEvents="none">
      {particles.map((p, i) => <ConfettiPiece key={i} p={p} />)}
    </View>
  );
}

export function CelebrationOverlay({ payload, onDismiss }: Props) {
  const big = !!(payload?.milestone || payload?.newRank);

  useEffect(() => {
    if (!payload) return;
    if (big) {
      haptic.success();
      const second = setTimeout(() => haptic.heavy(), 260);
      const auto = setTimeout(onDismiss, 5200);
      return () => { clearTimeout(second); clearTimeout(auto); };
    }
    haptic.success();
    const auto = setTimeout(onDismiss, 3600);
    return () => clearTimeout(auto);
  }, [payload, big, onDismiss]);

  if (!payload) return null;

  const headline = payload.newRank
    ? `Rank up: ${payload.newRank.title}`
    : payload.milestone
      ? `${payload.uniqueParks} parks!`
      : 'New park unlocked';

  const sub = payload.newRank
    ? payload.newRank.tagline
    : `${payload.parkName} · ${payload.uniqueParks} of ${payload.totalParks}`;

  return (
    <Animated.View
      style={styles.root}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(220)}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityLabel="Dismiss celebration" />

      <ConfettiBurst key={payload.id ?? payload.parkName} count={big ? 110 : 55} />

      <Animated.View
        entering={ZoomIn.springify().damping(14).stiffness(180).delay(120)}
        style={[styles.card, big && styles.cardBig]}
        pointerEvents="box-none"
      >
        <View style={[styles.iconWrap, big && styles.iconWrapBig]}>
          <MaterialCommunityIcons
            name={payload.newRank?.icon ?? (payload.milestone ? 'trophy' : 'pine-tree')}
            size={big ? 40 : 30}
            color={C.onPrimary}
          />
        </View>
        <Text style={[styles.title, big && styles.titleBig]}>{headline}</Text>
        <Text style={styles.sub}>{sub}</Text>
        {payload.newRank ? (
          <Text style={styles.parkLine}>{payload.parkName} · {payload.uniqueParks} of {payload.totalParks}</Text>
        ) : null}
        <Pressable style={styles.btn} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.btnText}>Keep exploring</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 18, 12, 0.55)',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: 0,
  },
  card: {
    width: '80%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 8,
    borderRadius: Radii.xl,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: C.surface,
    ...Shadows.floating,
  },
  cardBig: {
    paddingTop: 34,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    marginBottom: 6,
  },
  iconWrapBig: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: C.tertiary,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.onSurface,
    textAlign: 'center',
  },
  titleBig: {
    fontSize: 28,
    lineHeight: 32,
  },
  sub: {
    fontSize: 15,
    lineHeight: 21,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  parkLine: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    textAlign: 'center',
  },
  btn: {
    marginTop: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Radii.pill,
    paddingVertical: 13,
    backgroundColor: C.primary,
  },
  btnText: {
    color: C.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
