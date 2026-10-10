#!/bin/bash
# SessionStart (tylko chmura): zależności dla tools/mh (numpy) i rozpakowywania archiwów (py7zr).
# Harness QA (tools/qa/render.js) korzysta z Playwright w /opt/node-tools i Chromium z /opt/pw-browsers (obraz chmury).
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi

python3 -c "import numpy, py7zr" 2>/dev/null || pip install -q --disable-pip-version-check numpy py7zr

if [ ! -d /opt/node-tools/node_modules/playwright ]; then
  echo "UWAGA: brak /opt/node-tools/node_modules/playwright — tools/qa/render.js nie zadziała bez Playwright." >&2
fi
