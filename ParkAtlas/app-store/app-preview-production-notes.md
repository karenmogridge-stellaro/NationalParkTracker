# App Preview Production Notes

## Technical Rules
- Duration: 15 to 30 seconds each.
- Format: H.264 video in .mov or .mp4.
- Use only captured in-app experience.
- Do not include pricing or time-limited claims.

## Recording Workflow

1. Boot the target iPhone simulator.
2. Start recording:

xcrun simctl io booted recordVideo app-store/raw/preview-01.mp4

3. Perform scripted interaction sequence.
4. Stop recording with Ctrl+C.
5. Trim to 30 seconds max.

## Motion Style
- Keep taps intentional and slow enough to read.
- Avoid fast scrolling during key copy moments.
- Hold each feature reveal at least 1.2 seconds.

## Audio
- App previews can be silent.
- If adding music, ensure full commercial rights.

## Final QC
- No crashes, no loading glitches.
- Text is readable at phone scale.
- Feature claims match shipped behavior.
