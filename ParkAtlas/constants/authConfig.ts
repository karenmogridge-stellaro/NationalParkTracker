/** SecureStore key for persisted auth user profile */
export const AUTH_USER_KEY = 'parkatlasauthuser';

/** SecureStore key for biometric-lock preference */
export const BIOMETRIC_ENABLED_KEY = 'parkatlasbiometricenabled';

/** SecureStore key for email account credentials (per-email) */
export function credentialsKey(normalizedEmail: string): string {
  // SecureStore keys must be alphanumeric in production/TestFlight builds.
  // Encode each character as 2-digit hex so the resulting key is deterministic and valid.
  const emailHex = Array.from(normalizedEmail)
    .map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return `parkatlascreds${emailHex}`;
}
