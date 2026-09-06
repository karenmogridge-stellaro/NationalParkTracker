import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { GoogleProfile } from '@/hooks/useAuth';

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

/** Google Sign-In only renders when the OAuth client ids are configured. */
export const GOOGLE_SIGN_IN_ENABLED = IOS_CLIENT_ID.length > 0;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    iosClientId: IOS_CLIENT_ID,
    ...(WEB_CLIENT_ID ? { webClientId: WEB_CLIENT_ID } : {}),
    scopes: ['profile', 'email'],
  });
  configured = true;
}

export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleSignInCancelled';
  }
}

/** Runs the native Google sheet and returns a normalized profile, or throws GoogleSignInCancelled. */
export async function promptGoogleSignIn(): Promise<GoogleProfile> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new GoogleSignInCancelled();
    }
    const { user } = response.data;
    return {
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      givenName: user.givenName ?? undefined,
      familyName: user.familyName ?? undefined,
      picture: user.photo ?? undefined,
    };
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
      throw new GoogleSignInCancelled();
    }
    throw e;
  }
}

export async function signOutOfGoogle(): Promise<void> {
  if (!GOOGLE_SIGN_IN_ENABLED) return;
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Best effort; local session is already cleared by the caller.
  }
}
