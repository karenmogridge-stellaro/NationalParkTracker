#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${1:-$ROOT_DIR/app-store/upload-assets-asc}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "FAIL: Folder not found: $TARGET_DIR"
  exit 1
fi

shopt -s nullglob
files=("$TARGET_DIR"/*.png)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "FAIL: No PNG screenshots found in $TARGET_DIR"
  exit 1
fi

allowed_dims=(
  "1320x2868"
  "1242x2688"
  "2688x1242"
  "1284x2778"
  "2778x1284"
  "2064x2752"
  "2752x2064"
  "2048x2732"
  "2732x2048"
)

is_allowed_dim() {
  local dim="$1"
  for a in "${allowed_dims[@]}"; do
    if [[ "$dim" == "$a" ]]; then
      return 0
    fi
  done
  return 1
}

seen_hashes=()
seen_names=()
has_error=0

echo "Checking folder: $TARGET_DIR"

echo "\nDimension checks:"
for f in "${files[@]}"; do
  w="$(sips -g pixelWidth "$f" | awk '/pixelWidth:/ {print $2}')"
  h="$(sips -g pixelHeight "$f" | awk '/pixelHeight:/ {print $2}')"
  dim="${w}x${h}"

  if is_allowed_dim "$dim"; then
    echo "PASS $(basename "$f"): $dim"
  else
    echo "FAIL $(basename "$f"): $dim (not Apple-accepted)"
    has_error=1
  fi
done

echo "\nDuplicate checks:"
for f in "${files[@]}"; do
  hash="$(md5 -q "$f")"
  name="$(basename "$f")"
  duplicate_of=""
  for i in "${!seen_hashes[@]}"; do
    if [[ "${seen_hashes[$i]}" == "$hash" ]]; then
      duplicate_of="${seen_names[$i]}"
      break
    fi
  done

  if [[ -n "$duplicate_of" ]]; then
    echo "FAIL $name duplicates $duplicate_of"
    has_error=1
    continue
  fi

  seen_hashes+=("$hash")
  seen_names+=("$name")
  echo "PASS $name unique"
done

if [[ $has_error -ne 0 ]]; then
  echo "\nRESULT: FAIL - fix issues before uploading to App Store Connect."
  exit 1
fi

echo "\nRESULT: PASS - screenshots are unique and dimension-valid for upload."
