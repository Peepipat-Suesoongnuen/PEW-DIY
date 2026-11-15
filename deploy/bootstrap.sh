#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PEW-DIY — one-time (idempotent) provisioning for Cloud Run + Cloud SQL.
# Lab 5 Episode 5 (Issue #48). Safe to rerun: existing resources are skipped.
#
# Usage:
#   DRY_RUN=1 PROJECT_ID=cpe334-2026-pew-diy bash deploy/bootstrap.sh   # plan only
#   PROJECT_ID=cpe334-2026-pew-diy bash deploy/bootstrap.sh
#
# Nothing secret is written to disk or printed. The database password is
# generated once and stored only in Secret Manager.
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID (for example cpe334-2026-pew-diy)}"
REGION="${REGION:-asia-southeast1}"
SQL_INSTANCE="${SQL_INSTANCE:-pewdiy-pg}"
DB_NAME="${DB_NAME:-pewdiy}"
DB_USER="${DB_USER:-pewdiy}"
AR_REPO="${AR_REPO:-pewdiy}"
IMAGE_NAME="${IMAGE_NAME:-pewdiy}"
SERVICE_NAME="${SERVICE_NAME:-pewdiy}"
MIGRATE_JOB="${MIGRATE_JOB:-pewdiy-migrate}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-pewdiy-runner}"
SECRET_DATABASE_URL="${SECRET_DATABASE_URL:-pewdiy-database-url}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"
DRY_RUN="${DRY_RUN:-0}"

SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

run() {
  echo "+ $*"
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}

exists() { "$@" >/dev/null 2>&1; }

echo "== PEW-DIY bootstrap: project=${PROJECT_ID} region=${REGION} image_tag=${IMAGE_TAG} dry_run=${DRY_RUN}"

# 1. APIs -------------------------------------------------------------------
echo "== 1. Enable APIs"
run gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --project "$PROJECT_ID"

# 2. Artifact Registry ------------------------------------------------------
echo "== 2. Artifact Registry repository"
if exists gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" --project "$PROJECT_ID"; then
  echo "   ${AR_REPO} already exists"
else
  run gcloud artifacts repositories create "$AR_REPO" \
    --repository-format docker --location "$REGION" \
    --description "PEW-DIY application images" --project "$PROJECT_ID"
fi

# 3. Cloud SQL --------------------------------------------------------------
echo "== 3. Cloud SQL instance (PostgreSQL 16, storage auto-increase off)"
if exists gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID"; then
  echo "   ${SQL_INSTANCE} already exists"
else
  run gcloud sql instances create "$SQL_INSTANCE" \
    --project "$PROJECT_ID" --region "$REGION" \
    --database-version POSTGRES_16 --edition enterprise \
    --tier "$SQL_TIER" --storage-size 10GB --no-storage-auto-increase \
    --availability-type ZONAL --quiet
fi

if exists gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" --project "$PROJECT_ID"; then
  echo "   database ${DB_NAME} already exists"
else
  run gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE" --project "$PROJECT_ID"
fi

DB_PASSWORD=""
if gcloud sql users list --instance "$SQL_INSTANCE" --project "$PROJECT_ID" --format='value(name)' 2>/dev/null | grep -qx "$DB_USER"; then
  echo "   user ${DB_USER} already exists (password untouched; it is already in Secret Manager)"
else
  DB_PASSWORD="$(openssl rand -hex 16)"
  if [ "$DRY_RUN" = "1" ]; then
    echo "   [plan] create user ${DB_USER} with a generated password"
  else
    gcloud sql users create "$DB_USER" --instance "$SQL_INSTANCE" \
      --project "$PROJECT_ID" --password "$DB_PASSWORD"
  fi
fi

# 4. Runtime service account ------------------------------------------------
echo "== 4. Runtime service account (Cloud SQL Client + Secret Accessor)"
if exists gcloud iam service-accounts describe "$RUNTIME_SA" --project "$PROJECT_ID"; then
  echo "   ${RUNTIME_SA} already exists"
else
  run gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --display-name "PEW-DIY Cloud Run runtime" --project "$PROJECT_ID"
fi
run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${RUNTIME_SA}" --role roles/cloudsql.client --quiet

# 5. Secret Manager ---------------------------------------------------------
echo "== 5. Secret Manager: DATABASE_URL"
if exists gcloud secrets describe "$SECRET_DATABASE_URL" --project "$PROJECT_ID"; then
  echo "   secret ${SECRET_DATABASE_URL} already exists"
else
  if [ "$DRY_RUN" = "1" ]; then
    echo "   [plan] create secret ${SECRET_DATABASE_URL}"
  else
    gcloud secrets create "$SECRET_DATABASE_URL" --replication-policy automatic --project "$PROJECT_ID"
    if [ -z "$DB_PASSWORD" ]; then
      echo "ERROR: the database user already existed but no secret exists; set the user password in the console and rerun." >&2
      exit 1
    fi
    DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${SQL_CONNECTION}"
    printf '%s' "$DB_URL" | gcloud secrets versions add "$SECRET_DATABASE_URL" --data-file=- --project "$PROJECT_ID"
  fi
fi
run gcloud secrets add-iam-policy-binding "$SECRET_DATABASE_URL" \
  --member "serviceAccount:${RUNTIME_SA}" \
  --role roles/secretmanager.secretAccessor --project "$PROJECT_ID" --quiet

# 6. Build the image --------------------------------------------------------
echo "== 6. Build and push the image with Cloud Build"
run gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID" .

# 7. Migration job ----------------------------------------------------------
echo "== 7. Migration Cloud Run job"
COMMON_ENV="NODE_ENV=production,PORT=8080,APP_ORIGIN=http://localhost,SESSION_IDLE_MINUTES=60,SESSION_ABSOLUTE_MINUTES=480,SESSION_COOKIE_NAME=pew_session,SESSION_COOKIE_SECURE=true,APP_TIMEZONE=Asia/Bangkok"
if exists gcloud run jobs describe "$MIGRATE_JOB" --project "$PROJECT_ID" --region "$REGION"; then
  run gcloud run jobs update "$MIGRATE_JOB" \
    --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
    --set-secrets "DATABASE_URL=${SECRET_DATABASE_URL}:latest" \
    --set-env-vars "$COMMON_ENV" --command node --args dist/db/migrate.js
else
  run gcloud run jobs create "$MIGRATE_JOB" \
    --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
    --set-secrets "DATABASE_URL=${SECRET_DATABASE_URL}:latest" \
    --set-env-vars "$COMMON_ENV" --command node --args dist/db/migrate.js
fi

# 8. Cloud Run service ------------------------------------------------------
echo "== 8. Cloud Run service"
if exists gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION"; then
  run gcloud run services update "$SERVICE_NAME" \
    --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
    --set-secrets "DATABASE_URL=${SECRET_DATABASE_URL}:latest" \
    --set-env-vars "$COMMON_ENV" --min-instances 0 --max-instances 3
else
  run gcloud run deploy "$SERVICE_NAME" \
    --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" \
    --set-secrets "DATABASE_URL=${SECRET_DATABASE_URL}:latest" \
    --set-env-vars "$COMMON_ENV" --min-instances 0 --max-instances 3 \
    --allow-unauthenticated --quiet
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "== Dry run complete. Nothing was created."
  exit 0
fi

# 9. Point APP_ORIGIN at the real URL --------------------------------------
SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
echo "== 9. Service URL: ${SERVICE_URL}"
gcloud run services update "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" \
  --update-env-vars "APP_ORIGIN=${SERVICE_URL}" --quiet >/dev/null

# 10. Apply migrations ------------------------------------------------------
echo "== 10. Run the migration job"
gcloud run jobs execute "$MIGRATE_JOB" --project "$PROJECT_ID" --region "$REGION" --wait

# 11. Smoke test ------------------------------------------------------------
echo "== 11. Smoke test"
python3 deploy/smoke_test.py "$SERVICE_URL"

echo
echo "Deployment completed."
echo "Public URL: ${SERVICE_URL}"
echo "Running image: ${IMAGE}"
