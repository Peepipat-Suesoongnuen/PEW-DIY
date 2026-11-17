#!/usr/bin/env bash
# Offline contract checks for the Episode 8 manual image deployment path.
# This test inspects workflow wiring only; it never contacts GitHub or GCP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/deploy.yml"

require_line() {
  if ! grep -Fq -- "$1" "$WORKFLOW"; then
    echo "Missing workflow contract: $1" >&2
    exit 1
  fi
}

require_line 'workflow_dispatch:'
require_line 'image_tag:'
require_line "if: github.event_name == 'push'"
require_line "if: \${{ always() && (github.event_name == 'workflow_dispatch' || needs.test.result == 'success') }}"
require_line 'IMAGE_TAG: ${{ github.event_name == '\''workflow_dispatch'\'' && inputs.image_tag || github.sha }}'
require_line 'ROLLBACK: ${{ github.event_name == '\''workflow_dispatch'\'' }}'
require_line 'Manual image deployments are allowed only from the main branch.'
require_line "if: github.event_name == 'push'"
require_line 'run: bash deploy/release.sh'

# The manual workflow path must not accidentally make build unconditional.
if ! grep -B 1 -A 1 -F 'name: Build and push image' "$WORKFLOW" | grep -Fq "if: github.event_name == 'push'"; then
  echo 'Manual image deployment must skip the build/push step.' >&2
  exit 1
fi

echo 'PASS manual deployment selects an existing SHA and skips CI/build'
