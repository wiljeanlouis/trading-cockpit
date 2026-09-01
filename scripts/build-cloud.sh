#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

load_root_env
require_image_tag
require_env \
  VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID \
  TRADING_COCKPIT_GCP_PROJECT \
  TRADING_COCKPIT_GCP_REGION \
  TRADING_COCKPIT_ARTIFACT_REPOSITORY \
  TRADING_COCKPIT_CLOUD_RUN_SERVICE

root_dir="$(repo_root)"
image_uri="$(cloud_image_uri)"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "Cloud Build dry run OK."
  echo "Image: ${image_uri}"
  echo "Config: ${root_dir}/cloudbuild.yaml"
  echo "Docker build arg VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID: [redacted]"
  exit 0
fi

cd "${root_dir}"
gcloud builds submit . \
  --project "${TRADING_COCKPIT_GCP_PROJECT}" \
  --config cloudbuild.yaml \
  --substitutions "_IMAGE_TAG=${IMAGE_TAG},_VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID=${VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID},_GCP_PROJECT=${TRADING_COCKPIT_GCP_PROJECT},_REGION=${TRADING_COCKPIT_GCP_REGION},_ARTIFACT_REPOSITORY=${TRADING_COCKPIT_ARTIFACT_REPOSITORY},_SERVICE_NAME=${TRADING_COCKPIT_CLOUD_RUN_SERVICE}"
