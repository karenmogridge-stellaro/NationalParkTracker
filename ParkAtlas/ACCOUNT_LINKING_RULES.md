# Account Linking Rules

ParkAtlas treats one person as one canonical account identity.

## Rules

- Email/password, Apple Sign-In, and Google Sign-In are separate entry paths, but they must resolve to a single canonical user identity.
- If an email already has an Apple- or Google-linked identity, do not create a new password account for that email; direct the user to that provider.
- If an email already has a password-backed identity, do not create a second account for the same email.
- If a profile exists for an email but no password credentials exist yet, the user must re-establish the password account instead of creating a duplicate.
- Sign-in should resolve the existing identity first, then decide whether Apple, Google, email/password, or a restore flow is required.
- When a social sign-in returns a real (non-`privaterelay.appleid.com`) email that matches an existing `email_*` account, the email account is merged **into** the social id and `email_auth.userId` is repointed, so a later password sign-in lands on the same canonical account.
- Social ids (`apple_*`, `google_*`) are never merged away.

## Profile data

- Apple only returns name/email on the first-ever authorization. On later sign-ins (new device, reinstall) the `users` record is the source of truth; local SecureStore caches are a fallback.
- `upsertProductionUserProfile` never downgrades a profile: placeholder names ("Explorer"), missing emails, and derived usernames are only written when the stored record has nothing better.
- If no real name is known after sign-in, the app prompts once ("What should we call you?") via `NameCaptureSheet`.

## Storage

- `users` stores the profile record (`provider` field: `apple` | `google` | `email`).
- `email_auth` stores email/password credentials plus the canonical `userId` they resolve to.
- Social-linked identities are detected from the profile's `provider` field and the user id prefix.

## Goal

Keep invites, friendships, activity, and profile data attached to one canonical account instead of splitting the same person across multiple records.
