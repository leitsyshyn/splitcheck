#!/usr/bin/env bash
# Renders the Mermaid diagrams and the Marp deck (HTML, PDF, PPTX).
# Needs Google Chrome; set CHROME_PATH if it isn't in the default macOS location.
set -euo pipefail
cd "$(dirname "$0")"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
echo "{\"executablePath\":\"$CHROME_PATH\"}" > /tmp/puppeteer-mmdc.json

for d in diagrams/*.mmd; do
  npx -y -p @mermaid-js/mermaid-cli@11 mmdc -p /tmp/puppeteer-mmdc.json \
    -c diagrams/mermaid.json -C diagrams/mermaid.css -i "$d" -o "${d%.mmd}.png" -s 3 -b transparent < /dev/null
done

for fmt in --html --pdf --pptx; do
  npx -y @marp-team/marp-cli@4.5.1 slides.md --html --allow-local-files $fmt < /dev/null
done
