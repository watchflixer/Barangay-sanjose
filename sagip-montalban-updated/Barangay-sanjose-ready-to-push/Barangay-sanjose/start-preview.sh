#!/usr/bin/env bash
# One-command preview: nag-i-install lang kung kulang ang node_modules,
# tapos pinapatakbo ang dev server sa 0.0.0.0:3000.
set -e
cd "$(dirname "$0")"
[ -x node_modules/.bin/vite ] || npm install
exec npm run dev
