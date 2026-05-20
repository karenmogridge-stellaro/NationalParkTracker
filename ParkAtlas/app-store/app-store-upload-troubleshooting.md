# App Store Screenshot Upload Troubleshooting

If App Store Connect still says dimensions are wrong even though your files are valid, follow this exact sequence.

## Use this folder only
- app-store/upload-assets-final

## Verified dimensions in this folder
- All files are 1242 x 2688
- All files are unique

## Required reset steps in App Store Connect
1. Open the same device screenshot set where the error appears.
2. Delete every existing screenshot in that set first.
3. Refresh the page once.
4. Upload only the six files from app-store/upload-assets-final.
5. Do not multi-select from other folders.

## Common causes of persistent error
- A previous invalid image is still present in that device set.
- Mixed uploads from both upload-assets and upload-assets-asc folders.
- Uploading into a different device class than expected.

## If error still persists
1. Close and reopen App Store Connect tab.
2. Re-enter the app version page.
3. Re-upload from app-store/upload-assets-final only.
