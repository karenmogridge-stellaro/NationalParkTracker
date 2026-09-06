import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C } from '@/constants/theme';
import { rankForCount, TOTAL_NATIONAL_PARKS } from '@/utils/ranks';

export type ShareCardProps = {
  parkName: string;
  state: string;
  nationalVisited: number;
  /** Optional user photo to use as the card background. */
  photoUri?: string;
  /** Optional line under the park name, e.g. "3 visits · 12.4 mi". */
  detail?: string;
};

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 480;

/**
 * Fixed-size 3:4 card designed to be captured with react-native-view-shot.
 * Rendered off-screen; never shown directly in the UI.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { parkName, state, nationalVisited, photoUri, detail },
  ref,
) {
  const rank = rankForCount(nationalVisited);

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#2d6a4f', C.primary, '#0b2417']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={['rgba(8,18,12,0.05)', 'rgba(8,18,12,0.35)', 'rgba(8,18,12,0.92)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {!photoUri ? (
        <MaterialCommunityIcons name="pine-tree" size={190} color="rgba(255,255,255,0.08)" style={styles.watermark} />
      ) : null}

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandText}>ParkAtlas</Text>
        </View>
        <View style={styles.statePill}>
          <Text style={styles.stateText}>{state}</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.eyebrow}>I VISITED</Text>
        <Text style={styles.park} numberOfLines={3}>{parkName}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}

        <View style={styles.footer}>
          <View style={styles.progressBlock}>
            <Text style={styles.progressValue}>{nationalVisited}<Text style={styles.progressTotal}> / {TOTAL_NATIONAL_PARKS}</Text></Text>
            <Text style={styles.progressLabel}>NATIONAL PARKS</Text>
          </View>
          <View style={styles.rankPill}>
            <MaterialCommunityIcons name={rank.icon} size={14} color={C.onPrimary} />
            <Text style={styles.rankText}>{rank.title}</Text>
          </View>
        </View>
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
  watermark: {
    position: 'absolute',
    right: -30,
    top: 90,
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
  logo: {
    width: 30,
    height: 30,
  },
  brandText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stateText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  bottom: {
    gap: 6,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  park: {
    color: '#ffffff',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  detail: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 14,
  },
  progressBlock: {
    gap: 2,
  },
  progressValue: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  progressTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  progressLabel: {
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
  rankText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
