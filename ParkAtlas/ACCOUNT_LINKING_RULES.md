# Account Linking Rules

ParkAtlas treats one person as one canonical account identity.

## Rules

- Email/password and Apple Sign-In are separate entry paths, but they must resolve to a single canonical user identity.
- If an email already has an Apple-linked identity, do not create a new password account for that email.
- If an email already has a password-backed identity, do not create a second account for the same email.
- If a profile exists for an email but no password credentials exist yet, the user must re-establish the password account instead of creating a duplicate.
- Sign-in should resolve the existing identity first, then decide whether Apple Sign-In, email/password, or a restore flow is required.

## Storage

- `users` stores the profile record.
- `email_auth` stores email/password credentials.
- Apple-linked identities are detected from the existing profile and user id shape.

## Goal

Keep invites, friendships, activity, and profile data attached to one canonical account instead of splitting the same person across multiple records.
