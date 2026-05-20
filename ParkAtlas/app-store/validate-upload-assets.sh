#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/app-store/upload-assets"

if [[ ! -d "$OUT_DIR" ]]; then
  echo "Missing folder: $OUT_DIR"
  exit 1
fi

echo "PNG screenshots:"
find "$OUT_DIR" -maxdepth 1 -type f -name "*.png" -print | sort

echo "\nPreview videos:"
find "$OUT_DIR" -maxdepth 1 -type f \( -name "*.mp4" -o -name "*.mov" \) -print | sort

echo "\nDimensions (screenshots):"
for f in "$OUT_DIR"/*.png; do
  [[ -e "$f" ]] || continue
  sips -g pixelWidth -g pixelHeight "$f" | awk -v file="$(basename "$f")" '
    /pixelWidth:/ {w=$2}
    /pixelHeight:/ {h=$2}
    END {print file ": " w "x" h}
  '
done
