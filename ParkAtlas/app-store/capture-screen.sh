#!/usr/bin/env bash
# Non-interactive capture: relaunches the dev build on the given simulator, deep-routes to a screen
# via the dev-only screenshot_route.json file, and saves a PNG.
# Usage: capture-screen.sh <sim-udid> <route> <out.png> [settle-seconds]
set -euo pipefail

UDID="$1"; ROUTE="$2"; OUT="$3"; SETTLE="${4:-6}"
BUNDLE="com.parkatlas.mobile"

DOCS="$(xcrun simctl get_app_container "$UDID" "$BUNDLE" data)/Documents"
mkdir -p "$DOCS" "$(dirname "$OUT")"
printf '{"route":"%s"}' "$ROUTE" > "$DOCS/screenshot_route.json"

xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
xcrun simctl launch "$UDID" "$BUNDLE" >/dev/null
sleep "$SETTLE"
xcrun simctl io "$UDID" screenshot "$OUT" >/dev/null 2>&1
rm -f "$DOCS/screenshot_route.json"
echo "saved $OUT"
