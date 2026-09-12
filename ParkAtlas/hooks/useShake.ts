import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

// Total acceleration (in g) that counts as a shake, and how many spikes within the window are needed.
const THRESHOLD_G = 2.4;
const REQUIRED_SPIKES = 2;
const WINDOW_MS = 700;
const COOLDOWN_MS = 2500;

/** Fires `onShake` on a deliberate two-spike shake; ignores single bumps and rate-limits repeats. */
export function useShake(onShake: () => void, enabled = true) {
  const spikesRef = useRef<number[]>([]);
  const lastFiredRef = useRef(0);
  const cbRef = useRef(onShake);
  cbRef.current = onShake;

  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      if (!(await Accelerometer.isAvailableAsync().catch(() => false)) || cancelled) return;
      Accelerometer.setUpdateInterval(80);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const g = Math.sqrt(x * x + y * y + z * z);
        if (g < THRESHOLD_G) return;
        const now = Date.now();
        spikesRef.current = [...spikesRef.current.filter((t) => now - t < WINDOW_MS), now];
        if (spikesRef.current.length >= REQUIRED_SPIKES && now - lastFiredRef.current > COOLDOWN_MS) {
          lastFiredRef.current = now;
          spikesRef.current = [];
          cbRef.current();
        }
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);
}
