#!/usr/bin/env bash

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

npm run build:sheets
npm run check:architecture
npm run check:apps-script
clasp status
clasp push
