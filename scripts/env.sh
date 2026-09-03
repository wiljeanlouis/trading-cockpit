#!/usr/bin/env bash

set -euo pipefail

repo_root() {
  local source_dir
  source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "${source_dir}/.." && pwd
}

load_root_env() {
  local root_dir
  root_dir="$(repo_root)"
  local env_file="${root_dir}/.env"

  if [[ ! -f "${env_file}" ]]; then
    echo "Missing ${env_file}. Copy .env.example to .env and fill required values." >&2
    return 1
  fi

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
    [[ "${line}" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"

    key="$(printf '%s' "${key}" | xargs)"
    [[ "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [[ -n "${!key+x}" ]] && continue

    if [[ "${value}" =~ ^\".*\"$ || "${value}" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "${key}=${value}"
  done < "${env_file}"
}

require_env() {
  local missing=()

  for key in "$@"; do
    if [[ -z "${!key:-}" ]]; then
      missing+=("${key}")
    fi
  done

  if (( ${#missing[@]} > 0 )); then
    echo "Missing required environment variable(s): ${missing[*]}" >&2
    return 1
  fi
}

require_image_tag() {
  if [[ -z "${IMAGE_TAG:-}" ]]; then
    IMAGE_TAG="$(git -C "$(repo_root)" rev-parse --short HEAD)"
    export IMAGE_TAG
  fi
}

cloud_image_uri() {
  require_env \
    TRADING_COCKPIT_GCP_PROJECT \
    TRADING_COCKPIT_GCP_REGION \
    TRADING_COCKPIT_ARTIFACT_REPOSITORY \
    TRADING_COCKPIT_CLOUD_RUN_SERVICE \
    IMAGE_TAG

  printf '%s-docker.pkg.dev/%s/%s/%s:%s' \
    "${TRADING_COCKPIT_GCP_REGION}" \
    "${TRADING_COCKPIT_GCP_PROJECT}" \
    "${TRADING_COCKPIT_ARTIFACT_REPOSITORY}" \
    "${TRADING_COCKPIT_CLOUD_RUN_SERVICE}" \
    "${IMAGE_TAG}"
}
