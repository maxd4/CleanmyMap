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
postgres_log_watch_pid=""

cleanup() {
  if [[ -n "$postgres_log_watch_pid" ]]; then
    kill "$postgres_log_watch_pid" 2>/dev/null || true
    wait "$postgres_log_watch_pid" 2>/dev/null || true
  fi
  if [[ -n "${events_pid:-}" ]]; then
    kill "$events_pid" 2>/dev/null || true
    wait "$events_pid" 2>/dev/null || true
  fi
  rm -f "$start_log" "$progress_file" "$events_file" "$postgres_log"
}
trap cleanup EXIT

: > "$progress_file"
: > "$events_file"
start_started_at="$(date +%s)"
docker events --since "$start_started_at" --filter type=container --format '{{json .}}' > "$events_file" 2>/dev/null &
events_pid=$!
"$root/node_modules/.bin/supabase" start --debug --workdir "$workdir" --yes --output-format json --network-id="$network" > "$start_log" 2>&1 &
start_pid=$!
watch_postgres_log() {
  local container_id=""
  local docker_log_pid=""
  trap 'if [[ -n "$docker_log_pid" ]]; then kill "$docker_log_pid" 2>/dev/null || true; wait "$docker_log_pid" 2>/dev/null || true; fi' EXIT
  while kill -0 "$start_pid" 2>/dev/null; do
    container_id="$(docker ps -q --filter 'name=supabase_db_web' | head -n 1)"
    if [[ -n "$container_id" ]]; then
      docker logs --follow --timestamps "$container_id" > "$postgres_log" 2>&1 &
      docker_log_pid=$!
      wait "$docker_log_pid" || true
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
start_finished_at="$(date +%s)"
kill "$progress_pid" 2>/dev/null || true
wait "$progress_pid" 2>/dev/null || true
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
