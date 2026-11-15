#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PEW-DIY — one-off demo seed for the deployed database (Episode 8 / Lab 6 UAT).
#
# Demo accounts and synthetic fixtures are created once, from a Cloud Run job,
# never from the API service. Passwords are read from the environment, stored in
# Secret Manager and never printed.
#
# Usage:
#   SEED_PASSWORD_BA=... SEED_PASSWORD_BB=... SEED_PASSWORD_CA=... \
#   PROJECT_ID=cpe334-2026-pew-diy bash deploy/seed-demo.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-asia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-pewdiy}"
SEED_JOB="${SEED_JOB:-pewdiy-seed}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-pewdiy-runner}"
SECRET_DATABASE_URL="${SECRET_DATABASE_URL:-pewdiy-database-url}"
SQL_INSTANCE="${SQL_INSTANCE:-pewdiy-pg}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"

SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

for account in BA BB CA; do
  var="SEED_PASSWORD_${account}"
  value="${!var:-}"
  if [ -z "$value" ]; then
    echo "ERROR: ${var} is not set (fail-closed). Supply it privately." >&2
    exit 1
  fi
  secret="pewdiy-seed-password-$(echo "$account" | tr 'A-Z' 'a-z')"
  if gcloud secrets describe "$secret" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Secret ${secret} already exists (kept)"
  else
    gcloud secrets create "$secret" --replication-policy automatic --project "$PROJECT_ID"
    printf '%s' "$value" | gcloud secrets versions add "$secret" --data-file=- --project "$PROJECT_ID"
  fi
  gcloud secrets add-iam-policy-binding "$secret" \
    --member "serviceAccount:${RUNTIME_SA}" \
    --role roles/secretmanager.secretAccessor --project "$PROJECT_ID" --quiet >/dev/null
  unset "$var"
done

COMMON_ENV="NODE_ENV=production,SEED_MODE=cloud-demo,PORT=8080,APP_ORIGIN=http://localhost,SESSION_IDLE_MINUTES=60,SESSION_ABSOLUTE_MINUTES=480,SESSION_COOKIE_NAME=pew_session,SESSION_COOKIE_SECURE=true,APP_TIMEZONE=Asia/Bangkok"
SECRETS="DATABASE_URL=${SECRET_DATABASE_URL}:latest"
SECRETS="${SECRETS},SEED_PASSWORD_BA=pewdiy-seed-password-ba:latest"
SECRETS="${SECRETS},SEED_PASSWORD_BB=pewdiy-seed-password-bb:latest"
SECRETS="${SECRETS},SEED_PASSWORD_CA=pewdiy-seed-password-ca:latest"

if gcloud run jobs describe "$SEED_JOB" --project "$PROJECT_ID" --region "$REGION" >/dev/null 2>&1; then
  gcloud run jobs update "$SEED_JOB" \
    --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
    --set-secrets "$SECRETS" --set-env-vars "$COMMON_ENV" \
    --command node --args dist/db/seed.js,--cloud-demo --quiet
else
  gcloud run jobs create "$SEED_JOB" \
    --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
    --set-secrets "$SECRETS" --set-env-vars "$COMMON_ENV" \
    --command node --args dist/db/seed.js,--cloud-demo --quiet
fi

echo "== Executing ${SEED_JOB}"
gcloud run jobs execute "$SEED_JOB" --project "$PROJECT_ID" --region "$REGION" --wait
echo "Demo seeds applied. Passwords remain in Secret Manager; share them privately."
