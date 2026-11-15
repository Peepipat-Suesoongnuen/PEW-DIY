#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PEW-DIY — release step used by .github/workflows/deploy.yml (Episode 7).
# Verifies the image digest, runs the migration job, then points the Cloud Run
# service at that exact image. Exports SERVICE_URL and DEPLOYED_IMAGE.
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
REGION="${REGION:?REGION is required}"
SERVICE_NAME="${SERVICE_NAME:?SERVICE_NAME is required}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:?MIGRATE_JOB_NAME is required}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
ROLLBACK="${ROLLBACK:-false}"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "== Resolve the image digest for ${IMAGE}"
DEPLOYED_IMAGE="$(gcloud artifacts docker images describe "$IMAGE" --format='value(image_summary.digest)' --project "$PROJECT_ID")"
if [ -z "$DEPLOYED_IMAGE" ]; then
  echo "ERROR: could not resolve the digest for ${IMAGE}" >&2
  exit 1
fi
echo "Digest: ${DEPLOYED_IMAGE}"

if [ "$ROLLBACK" != "true" ]; then
  echo "== Run the migration job before the service is updated"
  gcloud run jobs execute "$MIGRATE_JOB_NAME" \
    --project "$PROJECT_ID" --region "$REGION" --wait
else
  echo "== Rollback: tests, build and migration are skipped"
fi

echo "== Update the Cloud Run service"
gcloud run services update "$SERVICE_NAME" \
  --project "$PROJECT_ID" --region "$REGION" --image "$DEPLOYED_IMAGE" --quiet

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
echo "Service URL: ${SERVICE_URL}"

gcloud run services update "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" \
  --update-env-vars "APP_ORIGIN=${SERVICE_URL}" --quiet >/dev/null

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "SERVICE_URL=${SERVICE_URL}"
    echo "DEPLOYED_IMAGE=${DEPLOYED_IMAGE}"
  } >>"$GITHUB_ENV"
fi
