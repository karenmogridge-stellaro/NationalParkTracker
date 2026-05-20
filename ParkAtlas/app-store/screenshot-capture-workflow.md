# Screenshot Capture Workflow (iOS Simulator)

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

1. Home dashboard
2. Map overview
3. Checklist
4. Log outing
5. Activity history
6. Settings/feedback

Keep this order for strongest feature narrative.
