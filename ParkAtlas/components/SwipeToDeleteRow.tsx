import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { ParkAtlas as C, Radii } from '@/constants/theme';
import { haptic } from '@/utils/haptics';

type Props = {
  /** Called when the user taps the revealed Delete action. */
  onDelete: () => void;
  /** Accessible label for the delete action (e.g. "Delete visit to Acadia"). */
  deleteLabel?: string;
  /** Disable swiping (e.g. while the feed is in multi-select mode). */
  enabled?: boolean;
  children: React.ReactNode;
};

const ACTION_WIDTH = 92;

function RightAction({
  translation,
  label,
  onPress,
}: {
  translation: SharedValue<number>;
  label: string;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translation.value + ACTION_WIDTH }],
  }));
  return (
    <Animated.View style={[styles.actionWrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={styles.actionTouch}
      >
        <View style={styles.actionInner}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Wraps a feed row so the user can swipe left to reveal a Delete action —
 * used to quickly remove a mis-entered logged visit (issue #5).
 */
export function SwipeToDeleteRow({ onDelete, deleteLabel, enabled = true, children }: Props) {
  const ref = useRef<SwipeableMethods>(null);
  const hapticFired = useRef(false);

  if (!enabled) return <>{children}</>;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={ACTION_WIDTH * 0.6}
      overshootRight={false}
      renderRightActions={(_progress, translation) => (
        <RightAction
          translation={translation}
          label={deleteLabel || 'Delete'}
          onPress={() => {
            haptic.medium();
            ref.current?.close();
            onDelete();
          }}
        />
      )}
      onSwipeableWillOpen={() => {
        if (!hapticFired.current) {
          haptic.select();
          hapticFired.current = true;
        }
      }}
      onSwipeableClose={() => {
        hapticFired.current = false;
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actionWrap: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingLeft: 8,
  },
  actionTouch: {
    flex: 1,
  },
  actionInner: {
    flex: 1,
    backgroundColor: C.error,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
