#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

load_root_env
require_env VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID

cd "$(repo_root)"
npm run build
