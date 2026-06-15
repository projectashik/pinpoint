#!/usr/bin/env bash
# Package PinPoint Editor for the Chrome / Edge / Firefox stores.
set -euo pipefail
cd "$(dirname "$0")"

OUT="pinpoint-editor.zip"
rm -f "$OUT"
zip -r "$OUT" manifest.json background.js content.js content.css icons -x '*.DS_Store' >/dev/null
echo "Built $OUT"
unzip -l "$OUT"
