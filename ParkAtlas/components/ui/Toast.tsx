import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ParkAtlas as C, Radii, Shadows } from '@/constants/theme';
import { haptic } from '@/utils/haptics';

export type ToastType = 'success' | 'info' | 'error';

export type ToastOptions = {
  type?: ToastType;
  /** Ionicons name; defaults per type. */
  icon?: keyof typeof Ionicons.glyphMap;
  durationMs?: number;
  /** Skip the haptic that normally accompanies the toast type. */
  silent?: boolean;
};

type ToastItem = ToastOptions & { id: number; message: string; type: ToastType };

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_ICON: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  error: 'alert-circle',
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 2200,
  info: 2600,
  error: 3200,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, options?: ToastOptions) => {
    const type = options?.type ?? 'info';
    const id = ++idRef.current;
    const item: ToastItem = { ...options, id, message, type };

    if (!options?.silent) {
      if (type === 'success') haptic.success();
      else if (type === 'error') haptic.error();
      else haptic.tap();
    }

    // Keep at most two visible so rapid actions don't stack a tower of pills.
    setToasts((prev) => [...prev.slice(-1), item]);
    const timer = setTimeout(() => dismiss(id), options?.durationMs ?? DEFAULT_DURATION[type]);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (m, o) => show(m, { ...o, type: 'success' }),
    error: (m, o) => show(m, { ...o, type: 'error' }),
    info: (m, o) => show(m, { ...o, type: 'info' }),
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.host, { bottom: Math.max(insets.bottom, 12) + 84 }]}
    >
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          exiting={FadeOutDown.duration(180)}
          layout={LinearTransition.springify().damping(18)}
          style={[styles.pill, styles[toast.type]]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Ionicons
            name={toast.icon ?? DEFAULT_ICON[toast.type]}
            size={18}
            color={toast.type === 'error' ? '#ffd9d6' : C.successContainer}
          />
          <Text style={styles.text} numberOfLines={2}>{toast.message}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    borderRadius: Radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...Shadows.floating,
  },
  success: {
    backgroundColor: 'rgba(27, 67, 50, 0.96)',
  },
  info: {
    backgroundColor: 'rgba(28, 28, 24, 0.94)',
  },
  error: {
    backgroundColor: 'rgba(140, 32, 26, 0.96)',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
});
