#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: start-supabase-ephemeral.sh <workdir> <network> <diagnostic-output>" >&2
  exit 2
fi

workdir="$1"
network="$2"
diagnostic_output="$3"
root="$(git rev-parse --show-toplevel)"
temp_root="${RUNNER_TEMP:?RUNNER_TEMP is required for private startup diagnostics}"
run_key="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$$"
start_log="$temp_root/supabase-start-$run_key.log"
progress_file="$temp_root/supabase-start-$run_key-progress.ndjson"
events_file="$temp_root/supabase-start-$run_key-events.ndjson"
postgres_log="$temp_root/supabase-start-$run_key-postgres.log"
postgres_server_log="$temp_root/supabase-start-$run_key-postgres-server.log"
bootstrap_workdir="$temp_root/supabase-bootstrap-$run_key"
postgres_log_watch_pid=""
start_timeout_seconds="${CMM_SUPABASE_START_TIMEOUT_SECONDS:-1200}"
if [[ ! "$start_timeout_seconds" =~ ^[0-9]+$ ]] || (( start_timeout_seconds < 60 || start_timeout_seconds > 1800 )); then
  echo "CMM_SUPABASE_START_TIMEOUT_SECONDS must be between 60 and 1800." >&2
  exit 2
fi
if ! command -v timeout >/dev/null 2>&1; then
  echo "GNU timeout is required to bound the ephemeral Supabase startup." >&2
  exit 2
fi

cleanup() {
  if [[ -n "${start_pid:-}" ]]; then
    kill "$start_pid" 2>/dev/null || true
    wait "$start_pid" 2>/dev/null || true
  fi
  if [[ -n "${progress_pid:-}" ]]; then
    kill "$progress_pid" 2>/dev/null || true
    wait "$progress_pid" 2>/dev/null || true
  fi
  if [[ -n "$postgres_log_watch_pid" ]]; then
    kill "$postgres_log_watch_pid" 2>/dev/null || true
    wait "$postgres_log_watch_pid" 2>/dev/null || true
  fi
  if [[ -n "${events_pid:-}" ]]; then
    kill "$events_pid" 2>/dev/null || true
    wait "$events_pid" 2>/dev/null || true
  fi
  rm -f "$start_log" "$progress_file" "$events_file" "$postgres_log" "$postgres_server_log"
  case "$bootstrap_workdir" in
    "$temp_root"/supabase-bootstrap-*) rm -rf -- "$bootstrap_workdir" ;;
    *) echo "Refusing to remove an unexpected bootstrap workdir path." >&2 ;;
  esac
}
trap cleanup EXIT

: > "$progress_file"
: > "$events_file"
mkdir -p "$bootstrap_workdir/supabase"
node "$root/scripts/ci/supabase-config.mjs" \
  --source-config="$workdir/supabase/config.toml" \
  --target-config="$bootstrap_workdir/supabase/config.toml"
start_started_at="$(date +%s)"
docker events --since "$start_started_at" --filter type=container --format '{{json .}}' 2>/dev/null | node "$root/scripts/ci/capture-bounded-log.mjs" "$events_file" 4194304 &
events_pid=$!
timeout --signal=TERM --kill-after=15s "$start_timeout_seconds" "$root/node_modules/.bin/supabase" start --debug --workdir "$bootstrap_workdir" --yes --output-format json --network-id="$network" 2>&1 | node "$root/scripts/ci/capture-bounded-log.mjs" "$start_log" 8388608 &
start_pid=$!
watch_postgres_log() {
  local container_id=""
  local docker_log_pid=""
  local server_log_pid=""
  trap 'if [[ -n "$docker_log_pid" ]]; then kill "$docker_log_pid" 2>/dev/null || true; wait "$docker_log_pid" 2>/dev/null || true; fi; if [[ -n "$server_log_pid" ]]; then kill "$server_log_pid" 2>/dev/null || true; wait "$server_log_pid" 2>/dev/null || true; fi' EXIT
  while kill -0 "$start_pid" 2>/dev/null; do
    container_id="$(docker ps -q --filter 'name=supabase_db_web' | head -n 1)"
    if [[ -n "$container_id" ]]; then
      docker logs --follow --timestamps "$container_id" 2>/dev/null | node "$root/scripts/ci/capture-bounded-log.mjs" "$postgres_log" 8388608 &
      docker_log_pid=$!
      docker exec "$container_id" sh -c 'exec tail -n 0 -F /var/log/postgresql/*.json /var/lib/postgresql/data/log/*.json 2>/dev/null' 2>/dev/null | node "$root/scripts/ci/capture-bounded-log.mjs" "$postgres_server_log" 8388608 &
      server_log_pid=$!
      while kill -0 "$start_pid" 2>/dev/null; do sleep 0.2; done
      return
    fi
    sleep 0.2
  done
}
watch_postgres_log &
postgres_log_watch_pid=$!
node "$root/scripts/ci/diagnose-supabase-start.mjs" --watch-pid="$start_pid" --progress-file="$progress_file" --expected-network="$network" --root="$root" >/dev/null 2>&1 &
progress_pid=$!
set +e
wait "$start_pid"
start_exit_code=$?
set -e
start_pid=""
start_finished_at="$(date +%s)"
kill "$progress_pid" 2>/dev/null || true
wait "$progress_pid" 2>/dev/null || true
progress_pid=""
kill "$postgres_log_watch_pid" 2>/dev/null || true
wait "$postgres_log_watch_pid" 2>/dev/null || true
postgres_log_watch_pid=""
kill "$events_pid" 2>/dev/null || true
wait "$events_pid" 2>/dev/null || true
events_pid=""
start_duration_seconds=$((start_finished_at - start_started_at))

set +e
node "$root/scripts/ci/diagnose-supabase-start.mjs" \
  --log-file="$start_log" \
  --postgres-log-file="$postgres_log" \
  --postgres-server-log-file="$postgres_server_log" \
  --progress-file="$progress_file" \
  --docker-events-file="$events_file" \
  --expected-network="$network" \
  --root="$root" \
  --exit-code="$start_exit_code" \
  --duration-seconds="$start_duration_seconds" > "$diagnostic_output" 2>&1
diagnostic_exit_code=$?
set -e
cat "$diagnostic_output"

if [[ "$start_exit_code" -ne 0 ]]; then
  exit "$start_exit_code"
fi
exit "$diagnostic_exit_code"
