import { useCallback, useRef, useState } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { haptic } from '@/utils/haptics';
import { shareCardSize, type ShareCardFormat } from '@/components/ShareCard';

// Export at 3x so a 360pt card becomes a crisp 1080px image for social apps.
const EXPORT_SCALE = 3;

type Options = {
  message: string;
  format?: ShareCardFormat;
  /** Send the image and `message` together (iOS share sheet). Messages/Mail keep both; Instagram keeps the image. */
  includeMessage?: boolean;
  onError?: (e: unknown) => void;
  /** Fires after the share sheet closes (iOS can't distinguish share vs. dismiss via expo-sharing). */
  onShared?: () => void;
};

/**
 * Captures an off-screen ShareCard ref to a PNG and hands it to the system share sheet.
 * Returns { ref, share, capture, sharing }. Attach `ref` to the ShareCard.
 */
export function useShareCard(options: Options) {
  const ref = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const { width, height } = shareCardSize(options.format);

  /** Renders the card to a temp PNG (1080px wide) and returns its file URI. */
  const capture = useCallback(async () => {
    // Small delay lets any freshly-mounted card finish its first layout/paint.
    await new Promise((r) => setTimeout(r, 60));
    return captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: width * EXPORT_SCALE,
      height: height * EXPORT_SCALE,
    });
  }, [width, height]);

  const share = useCallback(async () => {
    if (sharing || !ref.current) return;
    setSharing(true);
    haptic.tap();
    try {
      const uri = await capture();

      if (options.includeMessage && Platform.OS === 'ios') {
        const result = await Share.share({ url: uri, message: options.message });
        if (result.action === Share.sharedAction) options.onShared?.();
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your park' });
        options.onShared?.();
      } else {
        const result = await Share.share(
          Platform.OS === 'ios' ? { url: uri, message: options.message } : { message: options.message },
        );
        if (result.action === Share.sharedAction) options.onShared?.();
      }
    } catch (e) {
      options.onError?.(e);
    } finally {
      setSharing(false);
    }
  }, [sharing, options, capture]);

  return { ref, share, capture, sharing };
}
