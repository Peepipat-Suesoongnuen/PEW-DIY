#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PEW-DIY — Idempotent Google Cloud Run Deployment Script (Lab 5 Episode 5)
# ==============================================================================
# Usage:
#   ./deploy/deploy.sh            # provision and deploy, no demo accounts
#   ./deploy/deploy.sh --demo     # also create the seed secrets + seed job
#
# Environment Variables (Optional):
#   PROJECT_ID   GCP Project ID (defaults to active gcloud config project)
#   REGION       GCP Region (default: asia-southeast1)
#   DRY_RUN      Set DRY_RUN=1 to print all gcloud commands without executing
#
# WHAT THIS SCRIPT DOES  (one-time / manual first setup; safe to re-run)
#   Creates every cloud resource the app needs and does the first deployment:
#   1 enable APIs     2 Artifact Registry  3 Cloud SQL instance  4 database
#   5 runtime SA+IAM  6 DB user + secret   7 seed secrets (--demo only)
#   8 build image     9 migration job     10 seed job (--demo only)
#   11 Cloud Run service
#   After this, routine releases are done by GitHub Actions (deploy.yml ->
#   deploy/release.sh), which only UPDATES these resources.
#
# IMPORTANT
#   - Idempotent: existing resources/secrets are reused, never overwritten
#     (a re-run does not replace credentials).
#   - Passwords are generated with openssl and live only in Secret Manager;
#     they are never printed (run_cmd redacts --password=...).
#   - Preview first with:  DRY_RUN=1 ./deploy/deploy.sh   (no gcloud calls)
#   - Run from the REPO ROOT (step 8 builds the root Dockerfile).
#   - Offline test: deploy/tests/test_deploy_stub.sh
#   - Seeding requires both SEED_MODE=cloud-demo and --cloud-demo (the app
#     refuses to seed production otherwise). The API service never receives
#     SEED_MODE or any seed password.
#
# REFERENCES
#   - gcloud run deploy : https://cloud.google.com/sdk/gcloud/reference/run/deploy
#   - Cloud Run jobs    : https://cloud.google.com/run/docs/create-jobs
#   - Cloud SQL + Run   : https://cloud.google.com/sql/docs/postgres/connect-run
#   - Secret Manager    : https://cloud.google.com/secret-manager/docs
#   - Artifact Registry : https://cloud.google.com/artifact-registry/docs/docker
# ==============================================================================

# ------------------------------------------------------------------------------
# Settings & argument parsing
# ------------------------------------------------------------------------------
DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"
SEED_DEMO_DATA="false"

for arg in "$@"; do
  case "$arg" in
    --demo)
      SEED_DEMO_DATA="true"
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--demo]" >&2
      exit 1
      ;;
  esac
done

# Helper: prints the command (DRY_RUN=1) or prints then executes it.
# IMPORTANT: --password=... is redacted in the log; keep this behaviour.
run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then
    printf '[DRY_RUN] '
  else
    printf '+ '
  fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then
    "$@"
  fi
}

# Resolve the GCP project: $PROJECT_ID, else the active gcloud project.
if [ "$DRY_RUN" = "1" ]; then
  PROJECT_ID="${PROJECT_ID:-example-gcp-project}"
else
  PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
  if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is not set and no active gcloud project was found." >&2
    echo "Run: gcloud config set project YOUR_PROJECT_ID" >&2
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# Resource names
# deploy/release.sh, deploy/teardown.sh, .github/workflows/deploy.yml and the
# offline tests use the same names. Rename them together.
# ------------------------------------------------------------------------------
REPO_NAME="pewdiy"
SQL_INSTANCE="pewdiy-pg"
DB_NAME="pewdiy"
DB_USER="pewdiy"
SERVICE_NAME="pewdiy"
MIGRATE_JOB_NAME="pewdiy-migrate"
SEED_JOB_NAME="pewdiy-seed"
SA_NAME="pewdiy-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

# Secret Manager secret names (values are never stored in this repo).
SECRET_DB_URL="pewdiy-database-url"
SECRET_SEED_BA="pewdiy-seed-password-ba"
SECRET_SEED_BB="pewdiy-seed-password-bb"
SECRET_SEED_CA="pewdiy-seed-password-ca"

GENERATED_SEED_PASSWORDS=()

echo "=================================================================="
echo "PEW-DIY Cloud Run Deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Demo    : ${SEED_DEMO_DATA}"
echo "Dry Run : ${DRY_RUN}"
echo "=================================================================="

# ==============================================================================
# 1. Enable required GCP APIs
# ==============================================================================
run_cmd gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --project "$PROJECT_ID"

# ==============================================================================
# 2. Create Artifact Registry repository (idempotent)
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud artifacts repositories describe "$REPO_NAME" --location "$REGION" --project "$PROJECT_ID"
  run_cmd gcloud artifacts repositories create "$REPO_NAME" --repository-format=docker --location "$REGION" --description="PEW-DIY container repository" --project "$PROJECT_ID"
else
  if ! gcloud artifacts repositories describe "$REPO_NAME" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud artifacts repositories create "$REPO_NAME" \
      --repository-format=docker \
      --location "$REGION" \
      --description="PEW-DIY container repository" \
      --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 3. Create Cloud SQL for PostgreSQL instance (idempotent)
#    db-f1-micro requires --edition=enterprise on POSTGRES_16.
#    IMPORTANT: keep `--edition=enterprise` (lowercase); it is asserted by
#    deploy/tests/test_deploy_stub.sh.
#    Storage auto-increase is off (cost control) and is asserted too.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID"
  run_cmd gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_16 --edition=enterprise --tier=db-f1-micro --region="$REGION" --storage-size=10GB --storage-type=SSD --no-storage-auto-increase --backup-start-time=03:00 --project "$PROJECT_ID"
else
  if ! gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud sql instances create "$SQL_INSTANCE" \
      --database-version=POSTGRES_16 \
      --edition=enterprise \
      --tier=db-f1-micro \
      --region="$REGION" \
      --storage-size=10GB \
      --storage-type=SSD \
      --no-storage-auto-increase \
      --backup-start-time=03:00 \
      --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 4. Create Database (idempotent)
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
  run_cmd gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
else
  if ! gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 5. Create Dedicated Runtime Service Account & IAM bindings (idempotent)
#    Least privilege: cloudsql.client only here; secret access is granted per
#    secret after the secrets exist (step 7).
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID"
  run_cmd gcloud iam service-accounts create "$SA_NAME" --display-name="PEW-DIY Cloud Run Service Account" --project "$PROJECT_ID"
else
  if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud iam service-accounts create "$SA_NAME" \
      --display-name="PEW-DIY Cloud Run Service Account" \
      --project "$PROJECT_ID"
  fi
fi

run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client" \
  --condition=None \
  --quiet

# ==============================================================================
# 6. Create DB User & Store DATABASE_URL in Secret Manager (only if it is missing)
#    IMPORTANT: the DB user's password and the password inside DATABASE_URL must
#    be the same value (checked by test_deploy_stub.sh). Never echo it.
#    The app connects through the Cloud SQL Unix socket, so no public IP is
#    needed and no schema/connection-limit parameters are used.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud secrets describe "$SECRET_DB_URL" --project "$PROJECT_ID"
  run_cmd gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT_ID" --format="value(name)"
  run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="<GENERATED_HEX_PASSWORD>" --project "$PROJECT_ID"
  run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy="automatic" --project "$PROJECT_ID"
  run_cmd gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project "$PROJECT_ID"
else
  if ! gcloud secrets describe "$SECRET_DB_URL" --project "$PROJECT_ID" >/dev/null 2>&1; then
    DB_PASS="$(openssl rand -hex 24)"
    if gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT_ID" --format="value(name)" | grep -qx "$DB_USER"; then
      run_cmd gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
    else
      run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
    fi
    DB_URL_VALUE="postgresql://${DB_USER}:${DB_PASS}@/${DB_NAME}?host=/cloudsql/${SQL_CONN_NAME}"
    run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy="automatic" --project "$PROJECT_ID"
    printf "%s" "$DB_URL_VALUE" | gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 7. Seed passwords in Secret Manager (only with --demo)
#    The app seeds three demo accounts (B-A, B-B, C-A) from SEED_PASSWORD_*.
#    Passwords are generated once, stored only in Secret Manager and never
#    printed. The long-running API never receives them.
# ==============================================================================
RUNTIME_SECRETS=("$SECRET_DB_URL")
SEED_SECRET_ARGS=""
if [ "$SEED_DEMO_DATA" = "true" ]; then
  for pair in "BA:${SECRET_SEED_BA}" "BB:${SECRET_SEED_BB}" "CA:${SECRET_SEED_CA}"; do
    account="${pair%%:*}"
    secret="${pair##*:}"
    if [ "$DRY_RUN" = "1" ]; then
      run_cmd gcloud secrets describe "$secret" --project "$PROJECT_ID"
      run_cmd gcloud secrets create "$secret" --replication-policy="automatic" --project "$PROJECT_ID"
      run_cmd gcloud secrets versions add "$secret" --data-file=- --project "$PROJECT_ID"
    else
      if ! gcloud secrets describe "$secret" --project "$PROJECT_ID" >/dev/null 2>&1; then
        generated="$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-14)Aa1!"
        GENERATED_SEED_PASSWORDS+=("$generated")
        run_cmd gcloud secrets create "$secret" --replication-policy="automatic" --project "$PROJECT_ID"
        printf "%s" "$generated" | gcloud secrets versions add "$secret" --data-file=- --project "$PROJECT_ID"
      fi
    fi
    SEED_SECRET_ARGS="${SEED_SECRET_ARGS}SEED_PASSWORD_${account}=${secret}:latest,"
    RUNTIME_SECRETS+=("$secret")
  done
fi

# ------------------------------------------------------------------------------
# Secret access (per secret, NOT project-wide)
# test_deploy_stub.sh fails if a project-wide secretAccessor binding is added.
# ------------------------------------------------------------------------------
for secret in "${RUNTIME_SECRETS[@]}"; do
  run_cmd gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" --quiet
done

# ==============================================================================
# 8. Build & Push Unified Container Image via Cloud Build
#    Builds the root Dockerfile (run this script from the repo root).
#    Tag `latest` is only for this first manual setup; deploy.yml uses commit SHAs.
# ==============================================================================
run_cmd gcloud builds submit \
  --tag "$IMAGE_URI" \
  --project "$PROJECT_ID"

APP_ENV="NODE_ENV=production,APP_TIMEZONE=Asia/Bangkok,SESSION_IDLE_MINUTES=60,SESSION_ABSOLUTE_MINUTES=480,SESSION_COOKIE_NAME=pew_session,SESSION_COOKIE_SECURE=true"

# ==============================================================================
# 9. Create/Update & Execute the Cloud Run Job for migrations
#    IMPORTANT: if this job fails the script stops BEFORE deploying the service,
#    so a broken migration never reaches users.
#    deploy.yml / release.sh later re-run this same job (name: pewdiy-migrate).
# ==============================================================================
run_cmd gcloud run jobs deploy "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --set-env-vars "NODE_ENV=production,APP_TIMEZONE=Asia/Bangkok" \
  --command "node" \
  --args "dist/db/migrate.js" \
  --max-retries 1 \
  --task-timeout 300s \
  --project "$PROJECT_ID"

if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" \
  --region "$REGION" \
  --wait \
  --project "$PROJECT_ID"; then
  printf '%s\n' "ERROR: Cloud Run migration job '${MIGRATE_JOB_NAME}' failed. Aborting service deployment." >&2
  printf '%s\n' "View job logs with:" >&2
  printf '%s\n' "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}\" --project \"${PROJECT_ID}\" --limit 50 --format=\"value(textPayload)\"" >&2
  exit 1
fi

# ==============================================================================
# 10. Optional demo seed job (only with --demo)
#     Separate from the migration job and never part of the API service.
#     Both SEED_MODE=cloud-demo and --cloud-demo are required by the app.
# ==============================================================================
if [ "$SEED_DEMO_DATA" = "true" ]; then
  run_cmd gcloud run jobs deploy "$SEED_JOB_NAME" \
    --image "$IMAGE_URI" \
    --region "$REGION" \
    --service-account "$SA_EMAIL" \
    --set-cloudsql-instances "$SQL_CONN_NAME" \
    --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest,${SEED_SECRET_ARGS%,}" \
    --set-env-vars "NODE_ENV=production,SEED_MODE=cloud-demo,APP_TIMEZONE=Asia/Bangkok" \
    --command "node" \
    --args "dist/db/seed.js,--cloud-demo" \
    --max-retries 0 \
    --task-timeout 300s \
    --project "$PROJECT_ID"

  if ! run_cmd gcloud run jobs execute "$SEED_JOB_NAME" \
    --region "$REGION" \
    --wait \
    --project "$PROJECT_ID"; then
    printf '%s\n' "ERROR: Cloud Run demo seed job '${SEED_JOB_NAME}' failed." >&2
    exit 1
  fi
fi

# ==============================================================================
# 11. Deploy Cloud Run Service
#     --allow-unauthenticated makes the service public (needed for the demo).
#     Cost controls: min-instances 0, max-instances 3.
#     APP_ORIGIN must equal the public URL (anti-CSRF origin check), so it is
#     set in a follow-up update once the URL is known.
# ==============================================================================
run_cmd gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --set-env-vars "${APP_ENV},PORT=3000,APP_ORIGIN=http://placeholder.invalid" \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --project "$PROJECT_ID"

if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="https://${SERVICE_NAME}-<hash>-as.a.run.app"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
  run_cmd gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --update-env-vars "APP_ORIGIN=${SERVICE_URL}" \
    --project "$PROJECT_ID" --quiet >/dev/null
fi

# ------------------------------------------------------------------------------
# Summary output (URLs; passwords stay in Secret Manager and are not printed)
# ------------------------------------------------------------------------------
printf '\n'
printf '%s\n' "=================================================================="
printf '%s\n' "Deployment Completed!"
printf '%s\n' "Service URL    : ${SERVICE_URL}"
printf '%s\n' "Readiness Check: ${SERVICE_URL}/api/ready"
printf '%s\n' "Database URL   : Stored in Secret Manager: ${SECRET_DB_URL} (not printed)."
if [ "$SEED_DEMO_DATA" = "true" ]; then
  printf '%s\n' "Seed passwords : Stored in Secret Manager: ${SECRET_SEED_BA}, ${SECRET_SEED_BB}, ${SECRET_SEED_CA} (not printed)."
  printf '%s\n' "Demo accounts  : B-A (BORROWER), B-B (BORROWER), C-A (CUSTODIAN)."
fi
printf '%s\n' "=================================================================="
