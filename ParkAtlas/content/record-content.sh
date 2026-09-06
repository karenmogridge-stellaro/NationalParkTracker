#!/usr/bin/env bash
# Records a short simulator clip for TikTok / Reels / Shorts. Requires Metro running and the dev build installed.
#
# Usage: record-content.sh <sim-udid> <clip-name> <route> [seconds] [lat,lng] [celebrate-json]
#   record-content.sh $PM park-zion "/park/63" 10
#   record-content.sh $PM nearby-seattle "/(tabs)/home" 12 47.45,-121.80
#   record-content.sh $PM rankup "/park/47" 9 "" '{"parkId":"47","parkName":"Olympic","uniqueParks":15,"totalParks":63,"milestone":true,"newRank":{"id":"pathfinder","title":"Pathfinder","minParks":15,"icon":"compass-rose","tagline":"Fifteen parks. You go where the map gets quiet."}}'
set -euo pipefail

UDID="$1"; NAME="$2"; ROUTE="$3"; SECS="${4:-10}"; LOC="${5:-}"; CELEBRATE="${6:-}"
BUNDLE="com.parkatlas.mobile"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/clips"
mkdir -p "$OUT_DIR"

DOCS="$(xcrun simctl get_app_container "$UDID" "$BUNDLE" data)/Documents"
mkdir -p "$DOCS"

if [[ -n "$LOC" ]]; then
  xcrun simctl location "$UDID" set "$LOC"
  # Force the nearby sheet to re-evaluate at the new location.
  rm -f "$DOCS/nearby_prompt_state.json"
fi
if [[ -n "$CELEBRATE" ]]; then
  printf '%s' "$CELEBRATE" > "$DOCS/screenshot_celebrate.json"
fi

printf '{"route":"%s"}' "$ROUTE" > "$DOCS/screenshot_route.json"
xcrun simctl status_bar "$UDID" override --time "9:41" --wifiBars 3 --cellularBars 4 --batteryState charged --batteryLevel 100 >/dev/null

xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
xcrun simctl launch "$UDID" "$BUNDLE" >/dev/null
# Start recording right away so the confetti / sheet slide-in is captured, but skip the splash.
sleep 3

OUT="$OUT_DIR/$NAME.mp4"
xcrun simctl io "$UDID" recordVideo --codec h264 --force "$OUT" >/dev/null 2>&1 &
REC=$!
sleep "$SECS"
kill -INT "$REC" 2>/dev/null || true
wait "$REC" 2>/dev/null || true
rm -f "$DOCS/screenshot_route.json"

echo "saved $OUT"
