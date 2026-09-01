#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${root_dir}/scripts/dev-api.sh" &
api_pid=$!

"${root_dir}/scripts/dev-web.sh" &
web_pid=$!

cleanup() {
  kill "${api_pid}" "${web_pid}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait "${api_pid}" "${web_pid}"
