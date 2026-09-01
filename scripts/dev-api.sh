#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

load_root_env
require_env \
  TRADING_COCKPIT_SPREADSHEET_ID \
  TRADING_COCKPIT_GOOGLE_CLIENT_ID \
  TRADING_COCKPIT_ALLOWED_EMAILS \
  TRADING_COCKPIT_ALLOWED_ORIGINS \
  TRADING_COCKPIT_FINVIZ_TOKEN_SECRET

cd "$(repo_root)"
npm run dev --workspace @trading-cockpit/api
