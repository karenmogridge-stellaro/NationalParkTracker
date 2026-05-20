#!/usr/bin/env bash
set -euo pipefail

IPAD_UDID="9C419CB4-AEEA-4528-AA22-3F1ECA1C6D19"   # iPad Pro 13-inch (M5)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/app-store/upload-assets-ipad"
mkdir -p "$OUT_DIR"

if ! xcrun simctl list devices | grep -q "$IPAD_UDID.*Booted"; then
  echo "iPad Pro 13-inch (M5) is not booted. Boot it in Simulator.app first."
  exit 1
fi

shots=(
  "01-home-dashboard.png"
  "02-map-overview.png"
  "03-checklist.png"
  "04-log-outing.png"
  "05-activity-history.png"
  "06-settings-feedback.png"
)

seen_hashes=()
seen_names=()

file_hash() {
  md5 -q "$1"
}

for shot in "${shots[@]}"; do
  while true; do
    echo
    echo "Prepare screen for: $shot"
    read -r -p "Press Enter to capture (2s delay)... "
    sleep 2
    xcrun simctl io "$IPAD_UDID" screenshot "$OUT_DIR/$shot"

    current_hash="$(file_hash "$OUT_DIR/$shot")"
    duplicate_of=""
    for i in "${!seen_hashes[@]}"; do
      if [[ "${seen_hashes[$i]}" == "$current_hash" ]]; then
        duplicate_of="${seen_names[$i]}"
        break
      fi
    done

    if [[ -n "$duplicate_of" ]]; then
      echo "Duplicate detected: $shot matches $duplicate_of"
      echo "Retake required. Switch to a different app screen and capture again."
      continue
    fi

    seen_hashes+=("$current_hash")
    seen_names+=("$shot")
    echo "Saved: $OUT_DIR/$shot"
    break
  done
done

echo
echo "Done. Screenshot files are in: $OUT_DIR"
ls -lh "$OUT_DIR"/*.png
