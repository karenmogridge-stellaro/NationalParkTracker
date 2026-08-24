import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ParkAtlas as C } from '@/constants/theme';
import type { PendingAction } from '@/utils/pendingAction';

// ─── Contextual copy ──────────────────────────────────────────────────────────

type GateCopy = {
  icon: string;
  title: string;
  body: string;
  primaryCta: string;
};

function copyFor(action: PendingAction | null): GateCopy {
  if (!action) {
    return {
      icon: '🌲',
      title: 'Connect with friends',
      body: 'See more parks and share your own adventures.',
      primaryCta: 'Log in or create account',
    };
  }

  switch (action.type) {
    case 'highFive':
      return {
        icon: '👋',
        title: `Give ${action.displayName} a High-Five 👋`,
        body: 'Log in to react and share your own adventures.',
        primaryCta: 'Log in or create account',
      };
    case 'follow':
      return {
        icon: '➕',
        title: `Follow ${action.displayName}`,
        body: 'Log in to stay updated on their parks.',
        primaryCta: 'Log in or create account',
      };
    case 'keepExploring':
      return {
        icon: '🔒',
        title: 'Keep exploring with friends',
        body: 'Log in to see more parks and connect.',
        primaryCta: 'Log in or create account',
      };
    case 'scrollFeed':
      return {
        icon: '🗺️',
        title: 'See the full adventure feed',
        body: 'Log in to discover where friends have been exploring.',
        primaryCta: 'Log in or create account',
      };
    case 'viewProfile':
      return {
        icon: '👤',
        title: `View ${action.displayName}'s profile`,
        body: 'Log in to connect and share adventures.',
        primaryCta: 'Log in or create account',
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export type LoginGateSheetProps = {
  visible: boolean;
  /** The action that triggered the gate. Drives contextual copy. */
  action: PendingAction | null;
  /** Called when the user taps the primary "Log in" CTA. */
  onLogin: () => void;
  /** Called when the user taps "Continue without account" or the backdrop. */
  onDismiss: () => void;
};

export function LoginGateSheet({ visible, action, onLogin, onDismiss }: LoginGateSheetProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide sheet up from bottom + fade backdrop in simultaneously
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide sheet down + fade backdrop out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 220,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  const copy = copyFor(action);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onDismiss} accessible={false}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.38] }) },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        accessibilityViewIsModal
        accessibilityLabel={copy.title}
      >
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Icon */}
        <Text style={styles.icon} accessibilityElementsHidden>{copy.icon}</Text>

        {/* Title */}
        <Text style={styles.title}>{copy.title}</Text>

        {/* Body */}
        <Text style={styles.body}>{copy.body}</Text>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.88}
          onPress={onLogin}
          accessibilityRole="button"
          accessibilityLabel={copy.primaryCta}
        >
          <Text style={styles.primaryBtnText}>{copy.primaryCta}</Text>
        </TouchableOpacity>

        {/* Secondary action */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Continue without account"
        >
          <Text style={styles.secondaryBtnText}>Continue without account</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 28,
    paddingBottom: 44, // iOS home indicator clearance
    alignItems: 'center',
    gap: 6,
    // Shadow so the sheet feels elevated above the dimmed background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d0d4d1',
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },
  primaryBtn: {
    marginTop: 20,
    width: '100%',
    borderRadius: 999,
    backgroundColor: C.primary,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignSelf: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
});
