import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii, Shadows } from '@/constants/theme';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { haptic } from '@/utils/haptics';

const { width: W } = Dimensions.get('window');

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
};

function TrackVisual() {
  return (
    <View style={styles.visualCard}>
      <ProgressRing progress={14 / 63} size={150} strokeWidth={12} delayMs={300} durationMs={1400}>
        <Text style={styles.ringValue}>14</Text>
        <Text style={styles.ringTotal}>of 63</Text>
      </ProgressRing>
      <View style={styles.rankPill}>
        <MaterialCommunityIcons name="shield-star" size={14} color={C.onPrimary} />
        <Text style={styles.rankPillText}>Ranger</Text>
      </View>
    </View>
  );
}

function LogVisual() {
  return (
    <View style={[styles.visualCard, styles.photoCard]}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient colors={['transparent', 'rgba(8,18,12,0.85)']} style={StyleSheet.absoluteFill} />
      <View style={styles.photoActor}><Text style={styles.photoActorText}>You visited</Text></View>
      <View style={styles.photoBody}>
        <Text style={styles.photoTitle}>Yosemite</Text>
        <Text style={styles.photoSub}>Mist Trail · 7.2 mi · Today</Text>
      </View>
    </View>
  );
}

function FriendsVisual() {
  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80',
  ];
  return (
    <View style={styles.visualCard}>
      <View style={styles.avatarRow}>
        {avatars.map((uri, i) => (
          <Image key={uri} source={{ uri }} style={[styles.avatar, i > 0 && { marginLeft: -14 }]} />
        ))}
      </View>
      <Text style={styles.friendsLine}>Alex and 2 others have been to Zion</Text>
      <View style={styles.highFive}>
        <Text style={styles.highFiveText}>✋ High-Five</Text>
      </View>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    key: 'track',
    eyebrow: 'TRACK',
    title: 'All 63 national parks. One map.',
    body: 'Log every park you visit, watch your ring fill, and climb from Trailhead to Summit.',
    visual: <TrackVisual />,
  },
  {
    key: 'log',
    eyebrow: 'REMEMBER',
    title: 'Every hike, photo, and mile.',
    body: 'Add trails, distance, and a photo — or link Strava and let your hikes log themselves.',
    visual: <LogVisual />,
  },
  {
    key: 'friends',
    eyebrow: 'TOGETHER',
    title: 'See where your people have been.',
    body: 'Follow friends, High-Five their adventures, and share your own park cards.',
    visual: <FriendsVisual />,
  },
];

type Props = {
  onSignIn: () => void;
  onGuest: () => void;
};

export function Onboarding({ onSignIn, onGuest }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const last = index === SLIDES.length - 1;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / W);
    if (next !== index) {
      haptic.select();
      setIndex(next);
    }
  }

  function goNext() {
    if (last) {
      onSignIn();
      return;
    }
    haptic.tap();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Image source={require('../assets/images/parkatlas-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandText}>ParkAtlas</Text>
        </View>
        {!last ? (
          <TouchableOpacity onPress={onGuest} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.visualWrap}>{item.visual}</View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.copy}>
              <Text style={styles.eyebrow}>{item.eyebrow}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </Animated.View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={goNext} accessibilityRole="button">
          <Text style={styles.primaryBtnText}>{last ? 'Create account or sign in' : 'Next'}</Text>
          {!last ? <Ionicons name="arrow-forward" size={18} color={C.onPrimary} /> : null}
        </TouchableOpacity>

        {last ? (
          <TouchableOpacity style={styles.guestBtn} activeOpacity={0.75} onPress={onGuest} accessibilityRole="button">
            <Text style={styles.guestBtnText}>Explore as a guest</Text>
            <Text style={styles.guestHint}>Visits save on this device only</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  skip: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurfaceVariant,
  },
  slide: {
    width: W,
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 28,
  },
  visualWrap: {
    alignItems: 'center',
  },
  visualCard: {
    width: W - 80,
    height: 260,
    borderRadius: Radii.xl,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    overflow: 'hidden',
    ...Shadows.card,
  },
  ringValue: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
    color: C.onSurface,
  },
  ringTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankPillText: {
    color: C.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  photoCard: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    backgroundColor: '#1a2e22',
  },
  photoActor: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(8,18,12,0.55)',
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoActorText: {
    color: '#f0f7f2',
    fontSize: 12,
    fontWeight: '600',
  },
  photoBody: {
    padding: 16,
    gap: 3,
  },
  photoTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  photoSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: C.surfaceContainerLow,
    backgroundColor: C.surfaceContainerHighest,
  },
  friendsLine: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurface,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  highFive: {
    backgroundColor: 'rgba(27, 115, 60, 0.92)',
    borderRadius: Radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  highFiveText: {
    color: '#d4f5dd',
    fontSize: 14,
    fontWeight: '800',
  },
  copy: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.primary,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: C.onSurface,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: C.onSurfaceVariant,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 14,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.outlineVariant,
  },
  dotActive: {
    width: 20,
    backgroundColor: C.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: Radii.pill,
    backgroundColor: C.primary,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onPrimary,
  },
  guestBtn: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  guestHint: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
});
