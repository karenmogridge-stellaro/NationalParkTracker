import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ParkAtlas as C } from '@/constants/theme';
import { fallbackImageForPark, gradientForPark } from '@/utils/parkImagery';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityFeedCardVariant = 'hero' | 'standard' | 'compact';

export type ActivityFeedCardProps = {
  /**
   * Unique stable key used to namespace internal animation ref.
   * Should match the parent list key.
   */
  cardKey: string;

  /**
   * Full-width background image URI.
   * When absent or on load failure the component shows a terrain-matched fallback.
   */
  imageUri: string;

  /** Total photos on the visit; a "+N" badge shows when > 1. */
  photoCount?: number;

  /** Used to pick a terrain-appropriate fallback photo/gradient. */
  parkId?: string;

  /** Bold primary text – park name only.  e.g. "Acadia" */
  parkName: string;

  /** Secondary line – trail or location.  e.g. "Ocean Path" */
  trailName?: string;

  /** Meta line – date or relative time.  e.g. "Mar 19" or "3 days ago" */
  dateLabel?: string;

  /**
   * Optional actor pill shown top-left.
   * e.g. "Karen visited"
   */
  actorLabel?: string;

  /**
   * Visual size variant.
   * hero    = 260px height  (first card in special flows only)
   * standard = 220px height (feed default)
   * compact  = 72px row with thumbnail (collapsed feed)
   */
  variant?: ActivityFeedCardVariant;

  /** Whether the High-Five button is shown at all. */
  canHighFive?: boolean;

  /**
   * Controlled "already high-fived" state.
   * When true, shows "✋ High-Fived" in accent green.
   * High-Five is one-way – no toggle in V1.
   */
  isHighFived?: boolean;

  /** Called once when the user taps High-Five (not fired when already high-fived). */
  onHighFive?: () => void;

  /** Called when the card body is tapped (optional). */
  onPress?: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityFeedCard({
  imageUri,
  photoCount = 0,
  parkId,
  parkName,
  trailName,
  dateLabel,
  actorLabel,
  variant = 'standard',
  canHighFive = false,
  isHighFived = false,
  onHighFive,
  onPress,
}: ActivityFeedCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imgError, setImgError] = useState(false);
  const [fallbackImgError, setFallbackImgError] = useState(false);

  function handleHighFive() {
    if (isHighFived) return;

    // Micro-animation: 1 → 1.08 → 1 over ~140ms
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.08,
        duration: 70,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 70,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onHighFive?.();
  }

  const secondaryLine = [trailName, dateLabel].filter(Boolean).join(' • ');
  const fallbackUri = fallbackImageForPark(parkId);
  const gradient = gradientForPark(parkId);
  const thumbUri = !imgError && imageUri?.trim() ? imageUri : fallbackUri;

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress}
        disabled={!onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${actorLabel ?? ''} ${parkName}${trailName ? `, ${trailName}` : ''}${dateLabel ? `, ${dateLabel}` : ''}`}
      >
        <View>
          <Image source={{ uri: thumbUri }} style={styles.rowThumb} resizeMode="cover" onError={() => setImgError(true)} accessibilityIgnoresInvertColors />
          {photoCount > 1 ? (
            <View style={styles.rowPhotoBadge}><Text style={styles.rowPhotoBadgeText}>{photoCount}</Text></View>
          ) : null}
        </View>
        <View style={styles.rowBody}>
          {actorLabel ? <Text style={styles.rowActor} numberOfLines={1}>{actorLabel}</Text> : null}
          <Text style={styles.rowPark} numberOfLines={1}>{parkName}</Text>
          {secondaryLine ? <Text style={styles.rowSecondary} numberOfLines={1}>{secondaryLine}</Text> : null}
        </View>
        {canHighFive ? (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.rowHighFive, isHighFived && styles.rowHighFiveActive]}
              onPress={handleHighFive}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={isHighFived ? 'High-Fived' : 'High-Five this visit'}
              accessibilityState={{ selected: isHighFived }}
            >
              <Text style={styles.rowHighFiveText}>✋</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, variant === 'hero' ? styles.cardHero : styles.cardStandard]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${actorLabel ?? ''} ${parkName}${trailName ? `, ${trailName}` : ''}${dateLabel ? `, ${dateLabel}` : ''}`}
    >
      {/* Background image — 3-level fallback chain:
           1. imageUri (user's photo)
           2. terrain-matched stock photo
           3. terrain gradient + logo watermark (fully offline)
      */}
      {!imgError && imageUri?.trim() && imageUri !== fallbackUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => setImgError(true)}
        />
      ) : !fallbackImgError ? (
        <Image
          source={{ uri: fallbackUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => setFallbackImgError(true)}
        />
      ) : (
        <>
          <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <Image
            source={require('../assets/images/parkatlas-logo.png')}
            style={styles.fallbackLogo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </>
      )}

      {/* Bottom gradient overlay – ensures text stays readable over any photo */}
      <LinearGradient
        colors={['rgba(8,18,12,0)', 'rgba(8,18,12,0.35)', 'rgba(8,18,12,0.85)']}
        locations={[0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Actor pill – top left, subtle */}
      {actorLabel ? (
        <View style={styles.actorPill}>
          <Text style={styles.actorPillText} numberOfLines={1}>{actorLabel}</Text>
        </View>
      ) : null}

      {photoCount > 1 ? (
        <View style={styles.photoPill}>
          <Ionicons name="images" size={12} color="#f0f7f2" />
          <Text style={styles.photoPillText}>{photoCount}</Text>
        </View>
      ) : null}

      {/* Content block anchored to bottom */}
      <View style={styles.body}>
        {/* 1 – WHERE */}
        <Text style={styles.parkName} numberOfLines={2}>{parkName}</Text>

        {/* 2 – WHAT + CONTEXT */}
        {secondaryLine ? (
          <Text style={styles.secondary} numberOfLines={1}>{secondaryLine}</Text>
        ) : null}

        {/* 3 – INTERACT */}
        {canHighFive ? (
          <Animated.View style={[styles.highFiveWrap, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={[styles.highFiveBtn, isHighFived && styles.highFiveBtnActive]}
              activeOpacity={0.85}
              onPress={handleHighFive}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={isHighFived ? 'High-Fived' : 'High-Five this visit'}
              accessibilityState={{ selected: isHighFived }}
            >
              <Text style={[styles.highFiveBtnText, isHighFived && styles.highFiveBtnTextActive]}>
                {isHighFived ? '✋ High-Fived' : '✋ High-Five'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1a2e22', // dark fallback while image loads
  },
  cardStandard: {
    height: 220,
  },
  cardHero: {
    height: 268,
  },

  // Compact row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 8,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: C.surfaceContainerHighest,
  },
  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1a2e22',
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowActor: {
    fontSize: 11,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowPark: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
  },
  rowSecondary: {
    fontSize: 12.5,
    color: C.onSurfaceVariant,
  },
  rowHighFive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerHigh,
  },
  rowHighFiveActive: {
    backgroundColor: C.primaryContainer,
  },
  rowHighFiveText: {
    fontSize: 18,
  },

  // Last-resort logo (fully offline – both image URLs failed)
  fallbackLogo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 88,
    height: 88,
    marginTop: -44,
    marginLeft: -44,
    opacity: 0.55,
  },

  // Actor pill – top-left
  actorPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(8, 18, 12, 0.52)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '70%',
  },
  actorPillText: {
    color: '#f0f7f2',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  photoPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(8, 18, 12, 0.52)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  photoPillText: { color: '#f0f7f2', fontSize: 12, fontWeight: '700' },
  rowPhotoBadge: {
    position: 'absolute', right: -4, bottom: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.surface,
  },
  rowPhotoBadgeText: { color: C.onPrimary, fontSize: 10, fontWeight: '800' },

  // Text + action anchored to bottom
  body: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 18,
    gap: 4,
  },
  parkName: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  secondary: {
    color: 'rgba(255, 255, 255, 0.80)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // High-Five button
  highFiveWrap: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  highFiveBtn: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 44, // accessibility minimum
    justifyContent: 'center',
  },
  highFiveBtnActive: {
    backgroundColor: 'rgba(27, 115, 60, 0.90)',
    borderColor: 'rgba(27, 115, 60, 0.90)',
  },
  highFiveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  highFiveBtnTextActive: {
    color: '#d4f5dd',
  },
});

// Re-export the C reference so callers can use theme tokens if needed
export { C };
