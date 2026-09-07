#!/usr/bin/env bash
# Non-interactive iPad screenshot set (13" iPad Pro, 2064x2752), mirroring the 2.0 iPhone narrative.
# Requires Metro running and the dev build installed on the iPad sim (xcrun simctl install <udid> <ParkAtlas.app>).
# Usage: ./app-store/capture-screenshots-ipad.sh [ipad-udid] [source-iphone-udid-for-seed-data]
set -euo pipefail

IPAD="${1:-9C419CB4-AEEA-4528-AA22-3F1ECA1C6D19}"   # iPad Pro 13-inch (M5)
SEED_FROM="${2:-698F52B6-3650-48ED-AC12-C5696A9E8CC7}" # iPhone 17 Pro Max with seeded guest data
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/upload-assets-ipad-2.0"
BUNDLE="com.parkatlas.mobile"
CAP="$HERE/capture-screen.sh"
mkdir -p "$OUT"

xcrun simctl boot "$IPAD" 2>/dev/null || true
DOCS="$(xcrun simctl get_app_container "$IPAD" "$BUNDLE" data)/Documents"
mkdir -p "$DOCS"

# Seed the same guest data the iPhone shots use.
if [[ -n "$SEED_FROM" ]]; then
  SRC="$(xcrun simctl get_app_container "$SEED_FROM" "$BUNDLE" data)/Documents"
  for f in friends_guest_user park_checklist_guest_user visited_parks_guest_user; do
    [[ -f "$SRC/$f.json" ]] && cp "$SRC/$f.json" "$DOCS/"
  done
  # Old seed visits carry a stock Unsplash photo; drop it so each card shows its park's own photo.
  python3 - "$DOCS/visited_parks_guest_user.json" <<'PY'
import json, sys
p = sys.argv[1]; v = json.load(open(p))
for x in (v if isinstance(v, list) else v.get('visits', [])):
    if 'unsplash.com' in (x.get('photoUri') or ''): x.pop('photoUri', None)
json.dump(v, open(p, 'w'))
PY
fi
echo 1 > "$DOCS/onboarding_seen.json"
# locationd only honors the grant after a reboot, otherwise every shot gets the permission dialog.
xcrun simctl privacy "$IPAD" grant location-always "$BUNDLE" >/dev/null 2>&1 || true
xcrun simctl shutdown "$IPAD" >/dev/null 2>&1 || true
xcrun simctl boot "$IPAD"; sleep 8
xcrun simctl privacy "$IPAD" grant location-always "$BUNDLE" >/dev/null 2>&1 || true
suppress_nearby() { echo "{\"shownAt\":$(date +%s)000,\"dismissedParkIds\":[]}" > "$DOCS/nearby_prompt_state.json"; }

xcrun simctl status_bar "$IPAD" override --time "9:41" --wifiBars 3 --batteryState charged --batteryLevel 100 >/dev/null
xcrun simctl location "$IPAD" set 37.75,-119.60

suppress_nearby
"$CAP" "$IPAD" "/(tabs)/home"    "$OUT/01-home-progress.png" 8
"$CAP" "$IPAD" "/park/63"        "$OUT/02-park-detail.png"   8
"$CAP" "$IPAD" "/(tabs)/explore" "$OUT/03-explore-map.png"   10

# Parks near you: Seattle, and clear the suppression so the sheet shows.
xcrun simctl location "$IPAD" set 47.61,-122.33
rm -f "$DOCS/nearby_prompt_state.json"
"$CAP" "$IPAD" "/(tabs)/home"    "$OUT/04-nearby-parks.png"  10
xcrun simctl location "$IPAD" set 37.75,-119.60
suppress_nearby

# Rank-up celebration, held open.
printf '%s' '{"parkId":"47","parkName":"Olympic","uniqueParks":15,"totalParks":63,"milestone":true,"holdOpen":true,"newRank":{"id":"pathfinder","title":"Pathfinder","minParks":15,"icon":"compass-rose","tagline":"Fifteen parks. You go where the map gets quiet."}}' > "$DOCS/screenshot_celebrate.json"
"$CAP" "$IPAD" "/park/47"        "$OUT/05-rank-up.png"       9
rm -f "$DOCS/screenshot_celebrate.json"

# Onboarding: no route file, no onboarding_seen.
rm -f "$DOCS/onboarding_seen.json"
xcrun simctl terminate "$IPAD" "$BUNDLE" 2>/dev/null || true
xcrun simctl launch "$IPAD" "$BUNDLE" >/dev/null
sleep 8
xcrun simctl io "$IPAD" screenshot "$OUT/06-onboarding.png" >/dev/null 2>&1
echo 1 > "$DOCS/onboarding_seen.json"

xcrun simctl status_bar "$IPAD" clear >/dev/null || true
echo; ls -1 "$OUT"
python3 -c "
from PIL import Image; import glob
for f in sorted(glob.glob('$OUT/*.png')): print(f.split('/')[-1], Image.open(f).size)"
