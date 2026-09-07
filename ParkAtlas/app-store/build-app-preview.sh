#!/usr/bin/env bash
# Builds the App Store "App Preview" video (6.9" iPhone, 886x1920, H.264, 15–30s) from
# scripted simulator recordings. Requires Metro running + dev build installed on the sim.
#
# Usage: ./app-store/build-app-preview.sh [sim-udid]
# Output: app-store/upload-assets-2.0/app-preview-6.9.mp4 (+ raw scenes in app-store/raw/preview/)
set -euo pipefail

UDID="${1:-698F52B6-3650-48ED-AC12-C5696A9E8CC7}"   # iPhone 17 Pro Max (seeded guest data)
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
RAW="$HERE/raw/preview"
OUT_DIR="$HERE/upload-assets-2.0"
OUT="$OUT_DIR/app-preview-6.9.mp4"
BUNDLE="com.parkatlas.mobile"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
LOGO="$ROOT/assets/images/parkatlas-logo.png"
mkdir -p "$RAW" "$OUT_DIR"

DOCS="$(xcrun simctl get_app_container "$UDID" "$BUNDLE" data)/Documents"
mkdir -p "$DOCS"
suppress_nearby() { echo "{\"shownAt\":$(date +%s)000,\"dismissedParkIds\":[]}" > "$DOCS/nearby_prompt_state.json"; }

# record <name> <route> <seconds> [lat,lng] [celebrate-json]
record() {
  local name="$1" route="$2" secs="$3" loc="${4:-}" celebrate="${5:-}"
  local out="$RAW/$name.mp4"
  if [[ -n "$loc" ]]; then xcrun simctl location "$UDID" set "$loc"; rm -f "$DOCS/nearby_prompt_state.json"; else suppress_nearby; fi
  if [[ -n "$celebrate" ]]; then printf '%s' "$celebrate" > "$DOCS/screenshot_celebrate.json"; fi
  printf '{"route":"%s"}' "$route" > "$DOCS/screenshot_route.json"
  xcrun simctl status_bar "$UDID" override --time "9:41" --wifiBars 3 --cellularBars 4 --batteryState charged --batteryLevel 100 >/dev/null
  xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
  xcrun simctl launch "$UDID" "$BUNDLE" >/dev/null
  sleep 3
  xcrun simctl io "$UDID" recordVideo --codec h264 --force "$out" >/dev/null 2>&1 &
  local rec=$!
  sleep "$secs"
  kill -INT "$rec" 2>/dev/null || true
  wait "$rec" 2>/dev/null || true
  rm -f "$DOCS/screenshot_route.json"
  echo "  recorded $name"
}

SCENES=(
  "s1-home|/(tabs)/home|5|4.0|Every national park, one ring to fill"
  "s2-explore|/(tabs)/explore|5|4.0|See what you've done and what's next"
  "s3-park|/park/63|5|4.5|Trails, camping, fees — then log the visit"
  "s4-rankup|/park/47|6|5.0|Unlock ranks as your count climbs"
  "s5-nearby|/(tabs)/home|5|4.0|Get nudged when a park is nearby"
  "s6-share|/dev/share-cards?only=rank-story&count=15&park=47&clean=1|5|3.5|Share it to Stories, ring and all"
)
RANKUP='{"parkId":"47","parkName":"Olympic","uniqueParks":15,"totalParks":63,"milestone":true,"newRank":{"id":"pathfinder","title":"Pathfinder","minParks":15,"icon":"compass-rose","tagline":"Fifteen parks. You go where the map gets quiet."}}'

if [[ "${SKIP_RECORD:-}" != "1" ]]; then
  echo "Recording scenes on ${UDID}..."
  xcrun simctl location "$UDID" set 37.75,-119.60
  for s in "${SCENES[@]}"; do
    IFS='|' read -r name route secs _dur _text <<<"$s"
    # ONLY=s4-rankup re-records a single scene.
    [[ -n "${ONLY:-}" && "$ONLY" != "$name" ]] && continue
    loc=""; cel=""
    [[ "$name" == "s5-nearby" ]] && loc="47.61,-122.33"
    [[ "$name" == "s4-rankup" ]] && cel="$RANKUP"
    record "$name" "$route" "$secs" "$loc" "$cel"
  done
  xcrun simctl status_bar "$UDID" clear >/dev/null || true
fi

# ── Compose ───────────────────────────────────────────────────────────────────
# ffmpeg here has no drawtext, so captions + end card are PNGs rendered by PIL and overlaid.
W=886; H=1920
CAPS=(); for s in "${SCENES[@]}"; do CAPS+=("${s##*|}"); done
python3 "$HERE/preview-overlays.py" "$RAW" "$LOGO" "${CAPS[@]}"

# Screen window inside the green frame (must match WIN in preview-overlays.py).
WX=63; WY=250; WW=759; WH=1650

N=${#SCENES[@]}
FILTER=""; CONCAT=""; i=0
for s in "${SCENES[@]}"; do
  IFS='|' read -r name _route _secs dur _text <<<"$s"
  # inputs: i = scene video, N+i = caption PNG, 2N = frame PNG, 2N+1 = end card
  # simctl only emits frames when pixels change, so static screens record short; clone the last frame out to $dur.
  FILTER+="[$i:v]fps=30,tpad=stop_mode=clone:stop_duration=12,trim=0:$dur,setpts=PTS-STARTPTS,scale=${WW}:${WH}[s$i];"
  FILTER+="color=c=0x1f4d34:s=${W}x${H}:d=$dur:r=30[bg$i];"
  FILTER+="[bg$i][s$i]overlay=${WX}:${WY}:shortest=1[w$i];"
  FILTER+="[w$i][$((2*N)):v]overlay=0:0:shortest=1[f$i];"
  FILTER+="[$((N+i)):v]format=rgba,fade=t=in:st=0.3:d=0.35:alpha=1[c$i];"
  FILTER+="[f$i][c$i]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.25,fade=t=out:st=$(echo "$dur-0.25" | bc):d=0.25,format=yuv420p[v$i];"
  CONCAT+="[v$i]"
  i=$((i+1))
done

END=2.5
FILTER+="[$((2*N+1)):v]scale=${W}:${H},fps=30,fade=t=in:st=0:d=0.3,format=yuv420p[vend];"
CONCAT+="[vend]"
FILTER+="${CONCAT}concat=n=$((N+1)):v=1:a=0[out]"

INPUTS=()
for s in "${SCENES[@]}"; do INPUTS+=(-i "$RAW/${s%%|*}.mp4"); done
for ((k=0; k<N; k++)); do INPUTS+=(-loop 1 -t 8 -i "$RAW/cap-$k.png"); done
INPUTS+=(-loop 1 -t 8 -i "$RAW/frame.png")
INPUTS+=(-loop 1 -t "$END" -i "$RAW/end.png")

echo "Composing ${OUT}..."
ffmpeg -y -hide_banner -loglevel error "${INPUTS[@]}" -filter_complex "$FILTER" -map "[out]" \
  -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -r 30 -b:v 10M -maxrate 12M -bufsize 20M -movflags +faststart "$OUT"

# Apple requires a stereo audio track on previews, even if silent.
ffmpeg -y -hide_banner -loglevel error -i "$OUT" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -shortest -c:v copy -c:a aac -b:a 128k "$OUT.tmp.mp4"
mv "$OUT.tmp.mp4" "$OUT"

ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of default=nw=1 "$OUT"
echo "done -> ${OUT}"
