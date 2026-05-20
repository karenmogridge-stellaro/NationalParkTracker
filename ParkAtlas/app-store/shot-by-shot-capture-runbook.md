# ParkAtlas Shot-by-Shot Capture Runbook

This runbook is optimized for one continuous screenshot session using the existing script:
- ./app-store/capture-screenshots.sh

Output filenames are already fixed by the script:
1. 01-home-dashboard.png
2. 02-map-overview.png
3. 03-checklist.png
4. 04-log-outing.png
5. 05-activity-history.png
6. 06-settings-feedback.png

## Preflight (do once)

1. Boot iPhone simulator and open ParkAtlas.
2. Sign in with a demo/test account that has realistic data.
3. Set iOS appearance to Light mode.
4. Ensure there are no modals/toasts open.
5. Start capture script:
- ./app-store/capture-screenshots.sh

When prompted for each file, follow the screen setup below, then press Enter.

## Shot 1: 01-home-dashboard.png

Goal: Hero dashboard with key stats visible.

1. Navigate to Home tab.
2. Ensure header, summary cards, and top map section are visible.
3. Keep content centered with no keyboard open.
4. Press Enter in terminal to capture.

## Shot 2: 02-map-overview.png

Goal: Interactive map with selected park card and visited/to-visit context.

1. Stay on Home (or Explore map view, whichever looks stronger).
2. Tap one park marker so park detail card appears at bottom.
3. Ensure legend/filter chips are visible.
4. Press Enter in terminal to capture.

## Shot 3: 03-checklist.png

Goal: Checklist feature clearly shown.

1. Scroll so Checklist card is centered.
2. Set tab to To Visit (or Visited if you have stronger data).
3. Make sure at least 2-4 list rows are visible.
4. Press Enter in terminal to capture.

## Shot 4: 04-log-outing.png

Goal: Fast logging flow UI.

1. Tap + button to open Log Outing sheet.
2. Show either:
- Park search list with several parks visible, or
- Details step with date/distance/trail fields visible.
3. Prefer details step if fields are filled with realistic sample values.
4. Press Enter in terminal to capture.

## Shot 5: 05-activity-history.png

Goal: Logged activity timeline and editability.

1. Navigate to Activity/Directory feed screen.
2. Ensure mixed entries are visible if possible.
3. Avoid empty-state screens for this shot.
4. Press Enter in terminal to capture.

## Shot 6: 06-settings-feedback.png

Goal: Trust + support features.

1. Go to Settings tab.
2. Open Send Feedback modal.
3. Enter short sample text so the input is not empty.
4. Ensure Send button is visible.
5. Press Enter in terminal to capture.

## Quick Quality Checks

Run:
- ./app-store/validate-upload-assets.sh

Verify:
1. Six PNG files exist in app-store/upload-assets.
2. No keyboard overlays hide important UI.
3. No debug banners, no loading spinners, no accidental personal info.
4. Text is readable without zooming.

## Optional Retake Rules

Retake a shot if:
1. Main feature is not obvious in under 1 second.
2. Any modal clips the UI awkwardly.
3. Data looks empty or unrealistic.

Use the same filename to overwrite and keep upload order stable.
