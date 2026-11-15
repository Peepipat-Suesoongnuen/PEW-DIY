# Lab 5 — GCP runbook (PEW-DIY)

Project-specific execution steps for the parts that happen outside the repository.
Values are already adapted; do not copy another team's numbers.

| Item | Value |
|---|---|
| Project ID | `cpe334-2026-pew-diy` |
| Region | `asia-southeast1` |
| Repository | `Peepipat-Suesoongnuen/PEW-DIY` |
| Repository ID | `1443286369` |
| Repository owner ID | `314545086` |
| GitHub environment | `demo` |

## Episode 1 — access

- [ ] One member signs up for the GCP Free Trial with a personal Gmail account (never `@mail.kmutt.ac.th`).
- [ ] Create project `cpe334-2026-pew-diy`; note the **project number**.
- [ ] Add the teammate in IAM with the Editor role.
- [ ] Create the budget alert **before** any resource.
- [ ] Do not click Upgrade and do not prepay.

## Episode 5 — first deployment

Run in Cloud Shell, signed in as the project owner:

```bash
git clone https://github.com/Peepipat-Suesoongnuen/PEW-DIY.git
cd PEW-DIY
git checkout main
git rev-parse --short HEAD
export PROJECT_ID=cpe334-2026-pew-diy
export REGION=asia-southeast1
gcloud config set project "$PROJECT_ID"

DRY_RUN=1 PROJECT_ID="$PROJECT_ID" REGION="$REGION" bash deploy/bootstrap.sh
PROJECT_ID="$PROJECT_ID" REGION="$REGION" bash deploy/bootstrap.sh
```

`bootstrap.sh` prints the service URL and runs the smoke test. After it finishes:

```bash
export SERVICE_URL=$(gcloud run services describe pewdiy --region "$REGION" --format='value(status.url)')
curl --fail "$SERVICE_URL/api/ready"
gcloud sql instances describe pewdiy-pg --project "$PROJECT_ID" \
  --format="value(settings.activationPolicy,settings.storageAutoResize)"
```

Check in the Console (Guide 5.7): enabled APIs, IAM (runner has only `Cloud SQL Client`),
Cloud SQL (storage auto-increase off), Secret Manager (secret names only), Cloud Run
revision (env vars and Secret reference), Artifact Registry image, and scaling 0/3.

## Episode 6 — keyless deploys and the merge gate

### Deployer service account

```bash
gcloud iam service-accounts create pewdiy-deployer \
  --display-name "PEW-DIY GitHub deployer" --project "$PROJECT_ID"

for ROLE in roles/run.admin roles/artifactregistry.writer roles/cloudsql.client roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:pewdiy-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "$ROLE" --quiet
done
```

### Workload Identity Federation (Console)

IAM & Admin → Workload Identity Federation → Create pool `github-actions` → provider
`github-main` (OpenID Connect), then use this attribute condition exactly:

```text
assertion.repository_id == '1443286369' &&
assertion.repository_owner_id == '314545086' &&
assertion.ref == 'refs/heads/main' &&
assertion.workflow_ref == 'Peepipat-Suesoongnuen/PEW-DIY/.github/workflows/deploy.yml@refs/heads/main' &&
assertion.sub == 'repo:Peepipat-Suesoongnuen@314545086/PEW-DIY@1443286369:environment:demo'
```

If the provider reports the subject as non-immutable, use
`assertion.sub == 'repo:Peepipat-Suesoongnuen/PEW-DIY:environment:demo'` instead.

Also grant the deployer service account permission to be impersonated by the pool
(Grant access → service account `pewdiy-deployer`).

### GitHub environment `demo`

Settings → Environments → New environment `demo`:

| Kind | Name | Value |
|---|---|---|
| Variable | `GCP_PROJECT_ID` | `cpe334-2026-pew-diy` |
| Variable | `GCP_REGION` | `asia-southeast1` |
| Variable | `WIF_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-actions/providers/github-main` |
| Variable | `WIF_SERVICE_ACCOUNT` | `pewdiy-deployer@cpe334-2026-pew-diy.iam.gserviceaccount.com` |
| Variable (optional) | `SMOKE_EMAIL` | a low-privilege demo account |
| Secret (optional) | `SMOKE_PASSWORD` | that account's password |

Restrict the environment's deployment branches to `main`.

### Ruleset `protect-main`

Settings → Rulesets → New branch ruleset:

- Target branch: `main`
- Require a pull request before merging, **1** approval, dismiss stale approvals
- Require status checks: **`Build and regression tests`** (and optionally `Docker image build and readiness`)
- Require branches to be up to date before merging
- Block force pushes and deletion

Repeat with a second ruleset (or the same one) for `sprint/1-staging` with 1 approval.

Then prove the gate: branch `test/prove-gate` from `main`, break one expected value,
open a PR into `main`, screenshot the red check and the blocked merge button, close the
PR, and delete the branch.

## Episode 7 — automatic release

1. Merge a reviewed change into `sprint/1-staging`.
2. Open a release PR `sprint/1-staging` → `main`, label `lab5`, and wait for the required check.
3. Merge. `Deploy demo` runs: CI, WIF login, image build, migration, deploy, smoke test.
4. Copy the run link, image tag, digest and URL into Issue #50.
5. Compare the digest with Cloud Run → service → Revision history.

## Episode 8 — persistence and rollback

1. On the public URL, create a borrowing request as borrower `B-A`; screenshot with the URL and commit.
2. Restart: `gcloud run services update pewdiy --region asia-southeast1 --update-env-vars RESTART_MARKER=$(date +%s)`.
3. Confirm the request is still listed.
4. Release a second change through the pipeline; confirm the request again (C-05).
5. Rollback: `gh workflow run "Deploy demo" -f image_tag=<previous-sha>`, check the record, then roll forward with an empty input.
6. Demo accounts for Lab 6: run the one-off seed job only if decided; passwords stay in Secret Manager.

## Troubleshooting

| Symptom | Check |
|---|---|
| `PERMISSION_DENIED` right after enabling APIs | Wait one or two minutes and rerun |
| `/api/ready` 503 | `DATABASE_URL` secret, Cloud SQL attachment, instance state |
| Login works but write returns 403 | `APP_ORIGIN` does not match the public URL |
| Deploy rejected by attribute condition | repository id, owner id, ref, workflow_ref, environment name must all match |
| Migration job fails | Read its log: `gcloud run jobs executions list --job pewdiy-migrate --region asia-southeast1` |
