#!/usr/bin/env bash
# Records the full TikTok/Reels content library in one go. ~15 minutes on a booted iPhone Pro Max sim.
# Usage: record-batch.sh <sim-udid>
set -euo pipefail

UDID="$1"
HERE="$(cd "$(dirname "$0")" && pwd)"
REC="$HERE/record-content.sh"
BUNDLE="com.parkatlas.mobile"
DOCS="$(xcrun simctl get_app_container "$UDID" "$BUNDLE" data)/Documents"

# Keep the nearby sheet quiet for clips that aren't about it.
suppress_nearby() { echo "{\"shownAt\":$(date +%s)000,\"dismissedParkIds\":[]}" > "$DOCS/nearby_prompt_state.json"; }

# ── 1. Rank-up celebrations (best-performing hook) ─────────────────────────────
suppress_nearby
"$REC" "$UDID" rankup-dayhiker  "/park/62" 8 "" '{"parkId":"62","parkName":"Yosemite","uniqueParks":1,"totalParks":63,"milestone":true,"newRank":{"id":"day-hiker","title":"Day Hiker","minParks":1,"icon":"hiking","tagline":"First park logged. The map just got personal."}}'
"$REC" "$UDID" rankup-ranger    "/park/63" 8 "" '{"parkId":"63","parkName":"Zion","uniqueParks":5,"totalParks":63,"milestone":true,"newRank":{"id":"ranger","title":"Ranger","minParks":5,"icon":"shield-star","tagline":"Five parks in. You know the trails now."}}'
"$REC" "$UDID" rankup-pathfinder "/park/47" 8 "" '{"parkId":"47","parkName":"Olympic","uniqueParks":15,"totalParks":63,"milestone":true,"newRank":{"id":"pathfinder","title":"Pathfinder","minParks":15,"icon":"compass-rose","tagline":"Fifteen parks. You go where the map gets quiet."}}'
"$REC" "$UDID" rankup-summit    "/park/24" 9 "" '{"parkId":"24","parkName":"Grand Canyon","uniqueParks":63,"totalParks":63,"milestone":true,"newRank":{"id":"summit","title":"Summit","minParks":63,"icon":"image-filter-hdr","tagline":"All 63. There is nothing left but to go again."}}'
"$REC" "$UDID" newpark-plain    "/park/3"  7 "" '{"parkId":"3","parkName":"Arches","uniqueParks":9,"totalParks":63,"milestone":false}'

# ── 2. "Parks near you" from major metros ──────────────────────────────────────
"$REC" "$UDID" nearby-seattle   "/(tabs)/home" 12 47.61,-122.33
"$REC" "$UDID" nearby-denver    "/(tabs)/home" 12 39.74,-104.99
"$REC" "$UDID" nearby-saltlake  "/(tabs)/home" 12 40.76,-111.89
"$REC" "$UDID" nearby-asheville "/(tabs)/home" 12 35.60,-82.55
"$REC" "$UDID" nearby-phoenix   "/(tabs)/home" 12 33.45,-112.07
"$REC" "$UDID" nearby-lasvegas  "/(tabs)/home" 12 36.17,-115.14
"$REC" "$UDID" nearby-sanfran   "/(tabs)/home" 12 37.77,-122.42
"$REC" "$UDID" nearby-portland  "/(tabs)/home" 12 45.52,-122.68

# ── 3. Park detail pages for the most-searched parks ───────────────────────────
suppress_nearby
xcrun simctl location "$UDID" set 37.75,-119.60
for entry in "62:yosemite" "63:zion" "61:yellowstone" "24:grand-canyon" "22:glacier" "1:acadia" "3:arches" \
             "28:smokies" "47:olympic" "51:rocky-mountain" "35:joshua-tree" "8:bryce" "25:grand-teton" "53:sequoia" "54:shenandoah"; do
  id="${entry%%:*}"; name="${entry##*:}"
  "$REC" "$UDID" "park-$name" "/park/$id" 10
done

# ── 4. Home + Explore for b-roll ───────────────────────────────────────────────
"$REC" "$UDID" home-feed    "/(tabs)/home"    12
"$REC" "$UDID" explore-ring "/(tabs)/explore" 12

echo
echo "Done. Clips in $HERE/clips:"
ls -1 "$HERE/clips"
