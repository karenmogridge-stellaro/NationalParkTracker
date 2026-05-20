# App Review Notes (iOS)

## Notes for App Review

Thank you for your review.

This version addresses your prior feedback:

1. Non-account features are fully accessible without registration or login.
2. Sign in is optional and only required for account-specific features.
3. Marketing metadata has been finalized and de-duplicated.
   - Subtitle and Promotional Text are now different and no longer repetitive.

If you would like a demo account for account-specific validation, we can provide one immediately.

## Quick Submission Command

From the app root:

```bash
cd /Users/karen.mogridge/VSCodeProjects/NationalParkTracker/ParkAtlas
npx eas submit -p ios --profile production --latest
```

If you prefer to target a specific build instead of latest:

```bash
npx eas submit -p ios --profile production
```
