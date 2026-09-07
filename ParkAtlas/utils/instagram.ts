import { Linking, Platform } from 'react-native';
import RNShare, { Social } from 'react-native-share';

/**
 * Instagram only lets third-party apps hand an image straight to the Stories composer; feed posts must go
 * through the system share sheet. Stories sharing needs a Meta app id in the URL (any registered app works).
 */
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

export async function canShareToInstagramStories(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !FACEBOOK_APP_ID) return false;
  try {
    return await Linking.canOpenURL('instagram-stories://share');
  } catch {
    return false;
  }
}

/** Opens Instagram's Stories composer with the image as the background. Caller handles fallback. */
export async function shareToInstagramStories(imageUri: string, attributionURL = 'https://parkatlas.io'): Promise<void> {
  await RNShare.shareSingle({
    social: Social.InstagramStories,
    appId: FACEBOOK_APP_ID,
    backgroundImage: imageUri,
    backgroundTopColor: '#1b4332',
    backgroundBottomColor: '#0f241c',
    attributionURL,
  });
}
