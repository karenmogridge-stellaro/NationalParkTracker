# Invite Deep Link Setup

This project now includes mobile-side invite handling and web association artifacts.

## What is already implemented

1. Mobile route handling:
- `parkatlas://invite?code=...`
- `https://parkatlas.app/invite/{inviteCode}`
- Screens: `app/invite.tsx` and `app/invite/[inviteCode].tsx`

2. Invite persistence and accept flow:
- Firestore `invites` collection via `utils/inviteApi.ts`
- Accept action creates a friendship and marks invite accepted

3. Domain association files in frontend public assets:
- `frontend/public/.well-known/apple-app-site-association`
- `frontend/public/.well-known/assetlinks.json`
- `frontend/public/invite/index.html`

## One required value to finish

Update Android app-links fingerprint in:
- `frontend/public/.well-known/assetlinks.json`

Replace:
- `REPLACE_WITH_PLAY_SIGNING_SHA256_FINGERPRINT`

With your Play signing SHA-256 certificate fingerprint for package:
- `com.parkatlas.mobile`

## Hosting requirements

Deploy the `frontend` build so these URLs are publicly reachable from `https://parkatlas.app`:

1. `https://parkatlas.app/.well-known/apple-app-site-association`
2. `https://parkatlas.app/.well-known/assetlinks.json`
3. `https://parkatlas.app/invite/index.html`

## Rewrite rules (critical)

Configure hosting to rewrite invite paths to the invite landing page while preserving URL:

1. Rewrite:
- Source: `/invite/*`
- Destination: `/invite/index.html`

2. Do not rewrite `.well-known` files.

## Verification

1. Check file content types:
- `apple-app-site-association` should be served as JSON (no file extension required)
- `assetlinks.json` should be JSON

2. Check mobile config:
- iOS associated domain in `app.json`: `applinks:parkatlas.app`
- Android intent filter in `app.json` for `https://parkatlas.app/invite/`

3. End-to-end test:
- Send invite from app
- Open `https://parkatlas.app/invite/{code}` on a device with app installed
- Confirm app opens to invite screen
- Tap Accept and verify friend connection is created
