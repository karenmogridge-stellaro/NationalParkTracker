#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/app-store/upload-assets"
mkdir -p "$OUT_DIR"

if ! xcrun simctl list devices | grep -q "(Booted)"; then
  echo "No booted simulator found. Boot an iPhone simulator first."
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: ./app-store/record-preview.sh <preview-name>"
  echo "Example: ./app-store/record-preview.sh preview-01.mp4"
  exit 1
fi

OUT_FILE="$OUT_DIR/$1"

echo "Recording simulator video to: $OUT_FILE"
echo "Press Ctrl+C to stop recording."

xcrun simctl io booted recordVideo "$OUT_FILE"
