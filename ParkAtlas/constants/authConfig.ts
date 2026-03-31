/** SecureStore key for persisted auth user profile */
export const AUTH_USER_KEY = 'parkatlas_auth_user';

/** SecureStore key for biometric-lock preference */
export const BIOMETRIC_ENABLED_KEY = 'parkatlas_biometric_enabled';

/** SecureStore key for email account credentials (per-email) */
export function credentialsKey(normalizedEmail: string): string {
  return `parkatlas_creds_${normalizedEmail}`;
}
