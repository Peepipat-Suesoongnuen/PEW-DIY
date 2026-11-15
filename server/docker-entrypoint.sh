#!/bin/sh
set -e

# ------------------------------------------------------------------------------
# Container entrypoint (the Dockerfiles use it as ENTRYPOINT).
# It only hands control to the CMD (`node dist/index.js`) via `exec`, so the app
# becomes PID 1 and receives SIGTERM from Cloud Run for a graceful shutdown.
# Ref: https://cloud.google.com/run/docs/container-contract#instance-shutdown
# ------------------------------------------------------------------------------
exec "$@"
