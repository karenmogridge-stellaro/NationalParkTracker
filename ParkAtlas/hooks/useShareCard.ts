import { useCallback, useRef, useState } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { haptic } from '@/utils/haptics';

/**
 * Captures an off-screen ShareCard ref to a PNG and hands it to the system share sheet.
 * Returns { ref, share, sharing }. Attach `ref` to the ShareCard.
 */
export function useShareCard(options: { message: string; onError?: (e: unknown) => void }) {
  const ref = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async () => {
    if (sharing || !ref.current) return;
    setSharing(true);
    haptic.tap();
    try {
      // Small delay lets any freshly-mounted card finish its first layout/paint.
      await new Promise((r) => setTimeout(r, 60));
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your park' });
      } else {
        await Share.share(Platform.OS === 'ios' ? { url: uri, message: options.message } : { message: options.message });
      }
    } catch (e) {
      options.onError?.(e);
    } finally {
      setSharing(false);
    }
  }, [sharing, options]);

  return { ref, share, sharing };
}
