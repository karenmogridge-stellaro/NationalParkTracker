import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ParkAtlas as C, Radii } from '@/constants/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pulsing placeholder block. Compose several to sketch the shape of the loading content. */
export function Skeleton({ width = '100%', height = 14, radius = Radii.sm, style }: SkeletonProps) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Mirrors ActivityFeedCard's 220px photo card. */
export function FeedCardSkeleton() {
  return (
    <View style={styles.feedCard}>
      <Skeleton width="100%" height="100%" radius={Radii.lg} style={styles.feedCardFill} />
      <View style={styles.feedCardBody}>
        <Skeleton width="60%" height={22} radius={6} style={styles.onDark} />
        <Skeleton width="40%" height={12} radius={6} style={styles.onDark} />
      </View>
    </View>
  );
}

/** Mirrors a directory / friend list row: avatar + name + trailing action. */
export function PersonRowSkeleton() {
  return (
    <View style={styles.personRow}>
      <Skeleton width={36} height={36} radius={18} />
      <Skeleton width="45%" height={14} radius={6} />
      <View style={{ flex: 1 }} />
      <Skeleton width={62} height={28} radius={Radii.pill} />
    </View>
  );
}

/** Mirrors a compact activity/notification row: icon + two lines. */
export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={40} height={40} radius={Radii.sm} />
      <View style={styles.listItemText}>
        <Skeleton width="70%" height={14} radius={6} />
        <Skeleton width="45%" height={11} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.surfaceContainerHighest,
  },
  onDark: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  feedCard: {
    width: '100%',
    height: 220,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: C.surfaceContainerHigh,
  },
  feedCardFill: {
    position: 'absolute',
    inset: 0,
  },
  feedCardBody: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  listItemText: {
    flex: 1,
    gap: 6,
  },
});
