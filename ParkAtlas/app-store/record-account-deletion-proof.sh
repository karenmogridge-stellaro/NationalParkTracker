#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/app-store/raw"
APP_BUNDLE_ID="com.parkatlas.mobile"
IPAD_NAME="iPad Pro 13-inch (M5)"
mkdir -p "$OUT_DIR"

if [[ $# -ge 1 ]]; then
  OUT_FILE="$OUT_DIR/$1"
else
  TS="$(date +%Y%m%d-%H%M%S)"
  OUT_FILE="$OUT_DIR/account-deletion-proof-$TS.mp4"
fi

IPAD_UDID="$(xcrun simctl list devices | sed -n "s/.*${IPAD_NAME} (\([A-F0-9-]*\)).*(Booted).*/\1/p" | head -n 1)"

if [[ -z "$IPAD_UDID" ]]; then
  echo "No booted $IPAD_NAME simulator found."
  echo "Open Simulator.app and boot $IPAD_NAME, then re-run this script."
  exit 1
fi

echo "Using simulator: $IPAD_NAME ($IPAD_UDID)"

echo "Launching ParkAtlas..."
xcrun simctl launch "$IPAD_UDID" "$APP_BUNDLE_ID" >/dev/null 2>&1 || true

echo ""
echo "Recording account deletion proof video to: $OUT_FILE"
echo "Perform this flow in-app now:"
echo "1) Open Settings"
echo "2) Tap Delete Account"
echo "3) Confirm deletion"
echo "4) Show return to signed-out/login state"
echo ""
echo "Press Ctrl+C to stop recording when done."

xcrun simctl io "$IPAD_UDID" recordVideo "$OUT_FILE"
