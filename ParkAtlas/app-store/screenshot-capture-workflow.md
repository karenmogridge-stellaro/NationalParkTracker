# Screenshot Capture Workflow (iOS Simulator)

## Fast path (2.0+): non-interactive capture

`app-store/capture-screen.sh <sim-udid> <route> <out.png> [settle-seconds]` relaunches the dev build,
deep-routes via a dev-only `screenshot_route.json` in the app's Documents folder, and screenshots.
Metro must be running (`npx expo start --dev-client`). Seed data first by writing
`visited_parks_guest_user.json` / `park_checklist_guest_user.json` into the same folder
(`xcrun simctl get_app_container <udid> com.parkatlas.mobile data`).

Useful dev-only files (all consumed and deleted on read):
- `screenshot_route.json` — `{"route":"/(tabs)/explore"}`
- `screenshot_celebrate.json` — a `CelebrationPayload`; add `"holdOpen":true` so it stays up
- delete `nearby_prompt_state.json` to force the "Parks near you" sheet; set `shownAt` to now to suppress it
- delete `onboarding_seen.json` to show onboarding

The 2.0 set lives in `app-store/upload-assets-2.0/` (iPhone 17 Pro Max, 1320×2868).

## 1) Prepare Device

1. Open iOS Simulator.
2. Choose target device:
- iPhone 16 Pro Max for 6.9-inch set
- iPhone 15 Pro Max for 6.5-inch set
3. In Simulator menu:
- Features -> Toggle Appearance -> Light (use one appearance only)
- I/O -> Status Bar -> Override -> set a clean time and full battery

## 2) Launch App Build

Use your latest local dev build or archive build installed on simulator.

## 3) Capture Screens

Use this command each time you are on the target screen:

xcrun simctl io booted screenshot app-store/raw/<name>.png

Recommended names:
- 01-home-dashboard.png
- 02-map-overview.png
- 03-checklist.png
- 04-log-outing.png
- 05-activity-history.png
- 06-settings-feedback.png

## 4) Resize/Export (if needed)

If simulator output does not match target dimensions, export via design tool and ensure exact px dimensions:
- 1320 x 2868 (6.9-inch)
- 1242 x 2688 (6.5-inch)

## 5) Upload Order in App Store Connect

2.0 narrative:
1. Home — progress ring + rank + feed
2. Park detail — hero, trails, log visit
3. Explore — map + wishlist
4. Parks near you sheet
5. Rank-up celebration
6. Onboarding

Legacy order (1.x):
1. Home dashboard
2. Map overview
3. Checklist
4. Log outing
5. Activity history
6. Settings/feedback

Keep this order for strongest feature narrative.
