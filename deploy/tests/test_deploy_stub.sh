#!/usr/bin/env bash
# Offline regression checks: every gcloud and openssl call is a local stub.
# ==============================================================================
# WHAT THIS TEST DOES (no real GCP calls, no cost)
#   Puts fake `gcloud` / `openssl` first on PATH and runs deploy/deploy.sh in
#   these scenarios, asserting on the recorded commands:
#     first_run : nothing exists      -> everything is created
#     rerun     : everything exists   -> nothing replaced (credentials kept)
#     partial   : DB secret missing   -> DB user password reset + secret created
#     job-fail  : migration fails     -> script exits 1, service NOT deployed
#     demo      : --demo flag         -> seed secrets created/granted + seed job
#     upgrade   : --demo on an old deployment whose policy still grants the API
#                 identity the seed passwords -> those legacy grants are revoked
#   It also checks: `--edition=enterprise`, storage auto-increase off, min 0 /
#   max 3 instances, no project-wide secretAccessor role, DB password == password
#   inside DATABASE_URL, no seed secret/job without --demo, that the seed-
#   password secrets are readable ONLY by the dedicated seed-job identity
#   (pewdiy-seeder) and never by the API service account (pewdiy-runner), that
#   legacy runtime grants on the seed-password secrets are revoked on upgrade
#   (and nothing is revoked when there is nothing to revoke), that
#   the migrate and seed job env carries every required loadConfig() key with its
#   expected value (and still reads DATABASE_URL from Secret Manager), and that
#   no password/secret value leaks into the output.
#   Finally DRY_RUN=1 must make zero gcloud calls.
#
# HOW TO RUN (repo root, needs bash):  bash deploy/tests/test_deploy_stub.sh
#   Prints `PASS: <scenario>` per scenario; any `FAIL ...` exits non-zero.
#   CI runs it too (.github/workflows/ci-docker.yml).
# ==============================================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/../deploy.sh"
export TEST_STATE_DIR
TEST_STATE_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_STATE_DIR"' EXIT
mkdir -p "$TEST_STATE_DIR/bin"

# --- Fake `openssl` (deterministic "random" values) ---------------------------
cat > "$TEST_STATE_DIR/bin/openssl" <<'STUB'
#!/usr/bin/env bash
if [ "$2" = "-hex" ]; then
  printf '%s\n' '0123456789abcdef0123456789abcdef0123456789abcdef'
else
  printf '%s\n' 'TESTONLYGENERATEDPASSWORD'
fi
STUB

# --- Fake `gcloud`: logs each call (password redacted), answers per $STUB_MODE
cat > "$TEST_STATE_DIR/bin/gcloud" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
redacted=()
for arg in "$@"; do
  case "$arg" in
    --password=*)
      printf '%s' "${arg#--password=}" > "$TEST_STATE_DIR/sql-pass"
      redacted+=("--password=<REDACTED>") ;;
    *) redacted+=("$arg") ;;
  esac
done
printf '%s\n' "${redacted[*]}" >> "$GCLOUD_LOG"
if [ "${1:-} ${2:-}" = 'config get-value' ]; then
  echo stub-gcp-project
  exit 0
fi
if [ "${1:-} ${2:-} ${3:-}" = 'run services describe' ]; then
  echo https://pewdiy-stub.example.invalid
  exit 0
fi
if [ "${1:-} ${2:-} ${3:-}" = 'run jobs execute' ]; then
  [ "$STUB_MODE" != job-fail ]
  exit $?
fi
if [ "${1:-} ${2:-} ${3:-}" = 'secrets versions add' ]; then
  cat > "$TEST_STATE_DIR/payload-${4}"
  exit 0
fi
if [ "${1:-} ${2:-}" = 'secrets get-iam-policy' ]; then
  # The upgrade scenario simulates an old deployment whose policy still grants
  # the runtime identity access to the seed-password secrets. The secret name
  # is $3 (gcloud secrets get-iam-policy NAME).
  if [ "$STUB_MODE" = upgrade ]; then
    case "${3:-}" in
      pewdiy-seed-password-*)
        printf 'roles/secretmanager.secretAccessor\t%s\n' \
          "serviceAccount:pewdiy-runner@stub-gcp-project.iam.gserviceaccount.com"
        ;;
    esac
  fi
  exit 0
fi
if [ "${1:-} ${2:-} ${3:-}" = 'sql users list' ]; then
  if [ "$STUB_MODE" = first_run ]; then
    echo postgres
  else
    printf 'postgres\npewdiy\n'
  fi
  exit 0
fi
for word in "$@"; do
  if [ "$word" = describe ]; then
    case "$STUB_MODE" in
      first_run) exit 1 ;;
      partial)
        if [ "${1:-} ${3:-}" = 'secrets pewdiy-database-url' ]; then
          exit 1
        fi ;;
    esac
  fi
done
STUB
chmod +x "$TEST_STATE_DIR/bin/openssl" "$TEST_STATE_DIR/bin/gcloud"
export PATH="$TEST_STATE_DIR/bin:$PATH"
export PROJECT_ID=stub-gcp-project
export REGION=asia-southeast1
export DRY_RUN=0

# --- Assertions -----------------------------------------------------------------
# The migrate/seed commands call the app's fail-closed loadConfig(), so their job
# env must carry every required non-secret key with the exact expected value, and
# DATABASE_URL must still come from Secret Manager. Extracting the single
# --set-env-vars value (never a substring match) means a dropped or mistyped key
# fails here instead of at job startup.
assert_job_env() {  # $1 = job name, remaining args = key=value pairs
  local job="$1" line envs pair
  shift
  line="$(grep "^run jobs deploy ${job} " "$GCLOUD_LOG" | head -n 1 || true)"
  if [ -z "$line" ]; then
    echo "FAIL $MODE: no deploy command recorded for ${job}"; exit 1
  fi
  case "$line" in
    *"--set-env-vars"*) ;;
    *) echo "FAIL $MODE: ${job} has no --set-env-vars"; exit 1 ;;
  esac
  envs=" $(printf '%s\n' "$line" | sed -n 's/.*--set-env-vars \([^ ]*\).*/\1/p' | tr ',' ' ') "
  for pair in "$@"; do
    case "$envs" in
      *" ${pair} "*) ;;
      *) echo "FAIL $MODE: ${job} env missing or wrong: ${pair}"; exit 1 ;;
    esac
  done
  case "$line" in
    *"--set-secrets DATABASE_URL=pewdiy-database-url:latest"*) ;;
    *) echo "FAIL $MODE: ${job} does not read DATABASE_URL from Secret Manager"; exit 1 ;;
  esac
}

# --- Run every scenario and assert on what deploy.sh did ------------------------
for MODE in first_run rerun partial job-fail demo upgrade; do
  export STUB_MODE="$MODE"
  [ "$MODE" != demo ] || export STUB_MODE=first_run
  export GCLOUD_LOG="$TEST_STATE_DIR/gcloud-$MODE.log"
  rm -f "$TEST_STATE_DIR/sql-pass" "$TEST_STATE_DIR"/payload-*
  args=()
  if [ "$MODE" = demo ] || [ "$MODE" = upgrade ]; then args+=(--demo); fi
  result=0
  bash "$DEPLOY_SCRIPT" ${args[@]+"${args[@]}"} > "$TEST_STATE_DIR/output" 2>&1 || result=$?
  expected=0
  if [ "$MODE" = job-fail ]; then expected=1; fi
  if [ "$result" -ne "$expected" ]; then
    echo "FAIL $MODE: unexpected exit $result (wanted $expected)"
    exit 1
  fi
  if [ "$MODE" = job-fail ]; then
    if grep -q '^run deploy ' "$GCLOUD_LOG"; then
      echo 'FAIL: service deployed after migration failure'; exit 1
    fi
  else
    grep -q '^run deploy ' "$GCLOUD_LOG"
  fi
  if grep -q '^projects add-iam-policy-binding .*roles/secretmanager.secretAccessor' "$GCLOUD_LOG"; then
    echo 'FAIL: runtime has project-wide secret access'; exit 1
  fi
  grep -q '^secrets add-iam-policy-binding pewdiy-database-url .*roles/secretmanager.secretAccessor' "$GCLOUD_LOG"
  if [ "$MODE" = demo ] || [ "$MODE" = upgrade ]; then
    # IAM boundary (PR #57 review): each seed-password secret is readable by the
    # dedicated seed-job identity (pewdiy-seeder) ONLY. The long-running API's
    # identity (pewdiy-runner) must never be granted access to any of them.
    for secret in pewdiy-seed-password-ba pewdiy-seed-password-bb pewdiy-seed-password-ca; do
      binding="$(grep "^secrets add-iam-policy-binding $secret " "$GCLOUD_LOG" || true)"
      if [ -z "$binding" ]; then
        echo "FAIL $MODE: no secret access binding recorded for ${secret}"; exit 1
      fi
      case "$binding" in
        *"--member=serviceAccount:pewdiy-seeder@"*) ;;
        *) echo "FAIL $MODE: ${secret} is not readable by the seed-job identity"; exit 1 ;;
      esac
      case "$binding" in
        *"serviceAccount:pewdiy-runner@"*)
          echo "FAIL $MODE: API service account can read ${secret}"; exit 1 ;;
      esac
    done
    # The runtime identity gets the database URL secret and nothing else.
    if grep '^secrets add-iam-policy-binding ' "$GCLOUD_LOG" \
        | grep -- '--member=serviceAccount:pewdiy-runner@' \
        | grep -q 'pewdiy-seed-password'; then
      echo "FAIL $MODE: runtime identity granted a seed-password secret"; exit 1
    fi
    # Job identities: the seed job runs as pewdiy-seeder; the migration job and
    # the API service run as pewdiy-runner and never see a seed secret.
    grep -q '^run jobs deploy pewdiy-seed .*--service-account pewdiy-seeder@' "$GCLOUD_LOG"
    grep -q '^run jobs deploy pewdiy-migrate .*--service-account pewdiy-runner@' "$GCLOUD_LOG"
    grep -q '^run deploy pewdiy .*--service-account pewdiy-runner@' "$GCLOUD_LOG"
    if grep '^run jobs deploy pewdiy-migrate ' "$GCLOUD_LOG" | grep -q 'pewdiy-seed-password'; then
      echo "FAIL $MODE: migration job received a seed-password secret"; exit 1
    fi
    if grep '^run deploy pewdiy ' "$GCLOUD_LOG" | grep -q 'pewdiy-seed-password'; then
      echo "FAIL $MODE: API service received a seed-password secret"; exit 1
    fi
    grep -q '^run jobs deploy pewdiy-seed ' "$GCLOUD_LOG"
    grep -q 'SEED_MODE=cloud-demo' "$GCLOUD_LOG"
    grep -q -- '--cloud-demo' "$GCLOUD_LOG"
  else
    if grep -q '^run jobs deploy pewdiy-seed ' "$GCLOUD_LOG"; then
      echo 'FAIL: created the seed job without --demo'; exit 1
    fi
    if grep -q 'pewdiy-seeder' "$GCLOUD_LOG"; then
      echo 'FAIL: created the seed-job identity without --demo'; exit 1
    fi
  fi
  # Legacy-grant revocation (PR #58 review): an old version of the script
  # granted the runtime identity access to the seed-password secrets, and those
  # bindings survive a script upgrade. In the upgrade scenario every one of them
  # must be revoked (exact principal + role, database-URL grant untouched);
  # everywhere else there is nothing to revoke and the policy must be left alone.
  if [ "$MODE" = upgrade ]; then
    for secret in pewdiy-seed-password-ba pewdiy-seed-password-bb pewdiy-seed-password-ca; do
      revoke="$(grep "^secrets remove-iam-policy-binding $secret " "$GCLOUD_LOG" | head -n 1 || true)"
      if [ -z "$revoke" ]; then
        echo "FAIL $MODE: legacy runtime grant not revoked on ${secret}"; exit 1
      fi
      case "$revoke" in
        *"--member=serviceAccount:pewdiy-runner@"*"--role=roles/secretmanager.secretAccessor"*) ;;
        *) echo "FAIL $MODE: revoke targets the wrong principal or role: ${revoke}"; exit 1 ;;
      esac
    done
    if grep -q '^secrets remove-iam-policy-binding pewdiy-database-url ' "$GCLOUD_LOG"; then
      echo "FAIL $MODE: revoked the runtime database-URL grant"; exit 1
    fi
    if grep '^secrets remove-iam-policy-binding ' "$GCLOUD_LOG" | grep -q 'pewdiy-seeder@'; then
      echo "FAIL $MODE: revoked the seed-job identity grant"; exit 1
    fi
  elif grep -q '^secrets remove-iam-policy-binding ' "$GCLOUD_LOG"; then
    echo "FAIL $MODE: legacy revocation attempted with no legacy binding present"; exit 1
  fi
  # The migrate/seed commands run loadConfig(), so their job env must satisfy every
  # required value even though they never serve HTTP.
  assert_job_env pewdiy-migrate \
    NODE_ENV=production APP_TIMEZONE=Asia/Bangkok PORT=3000 \
    APP_ORIGIN=http://localhost:3000 SESSION_IDLE_MINUTES=60 \
    SESSION_ABSOLUTE_MINUTES=480 SESSION_COOKIE_NAME=pew_session
  if [ "$MODE" = demo ] || [ "$MODE" = upgrade ]; then
    assert_job_env pewdiy-seed \
      NODE_ENV=production APP_TIMEZONE=Asia/Bangkok PORT=3000 \
      APP_ORIGIN=http://localhost:3000 SESSION_IDLE_MINUTES=60 \
      SESSION_ABSOLUTE_MINUTES=480 SESSION_COOKIE_NAME=pew_session \
      SEED_MODE=cloud-demo
  fi
  case "$MODE" in
    first_run)
      grep -q -- '--edition=enterprise' "$GCLOUD_LOG"
      grep -q -- '--no-storage-auto-increase' "$GCLOUD_LOG"
      grep -q '^sql users create ' "$GCLOUD_LOG" ;;
    partial) grep -q '^sql users set-password ' "$GCLOUD_LOG" ;;
    rerun|upgrade)
      if grep -Eq '^(secrets create|sql users (create|set-password)) ' "$GCLOUD_LOG"; then
        echo "FAIL $MODE: replaced existing credentials"; exit 1
      fi ;;
  esac
  if [ -f "$TEST_STATE_DIR/sql-pass" ]; then
    db_pass="$(cat "$TEST_STATE_DIR/sql-pass")"
    db_url="$(cat "$TEST_STATE_DIR/payload-pewdiy-database-url")"
    case "$db_url" in
      "postgresql://pewdiy:${db_pass}@"*) ;;
      *) echo 'FAIL: DB password differs from secret'; exit 1 ;;
    esac
    if grep -Fq "$db_pass" "$TEST_STATE_DIR/output"; then
      echo 'FAIL: DB password leaked to output'; exit 1
    fi
  fi
  for secret_file in "$TEST_STATE_DIR"/payload-*; do
    [ -f "$secret_file" ] || continue
    secret_value="$(cat "$secret_file")"
    if [ -n "$secret_value" ] && grep -Fq "$secret_value" "$TEST_STATE_DIR/output"; then
      echo 'FAIL: secret payload leaked to output'; exit 1
    fi
  done
  echo "PASS: $MODE (exit, migration gate, cost controls, credential handling, secret redaction)"
done
# --- Dry run must not call gcloud at all ------------------------------------------
export GCLOUD_LOG="$TEST_STATE_DIR/dry-run-calls"
DRY_RUN=1 bash "$DEPLOY_SCRIPT" --demo > "$TEST_STATE_DIR/dry-run-output"
if [ -f "$GCLOUD_LOG" ]; then
  echo 'FAIL: dry run called gcloud'; exit 1
fi
echo 'PASS: dry run makes no gcloud calls'
