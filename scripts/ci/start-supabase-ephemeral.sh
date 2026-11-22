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

cleanup() {
  rm -f "$start_log" "$progress_file" "$events_file"
}
trap cleanup EXIT

: > "$progress_file"
start_started_at="$(date +%s)"
"$root/node_modules/.bin/supabase" start --workdir "$workdir" --yes --output-format json --network-id="$network" > "$start_log" 2>&1 &
start_pid=$!
node "$root/scripts/ci/diagnose-supabase-start.mjs" --watch-pid="$start_pid" --progress-file="$progress_file" --expected-network="$network" >/dev/null 2>&1 &
progress_pid=$!
set +e
wait "$start_pid"
start_exit_code=$?
set -e
start_finished_at="$(date +%s)"
kill "$progress_pid" 2>/dev/null || true
wait "$progress_pid" 2>/dev/null || true
docker events --since "$start_started_at" --until "$start_finished_at" --filter type=container --format '{{json .}}' > "$events_file" 2>/dev/null || true
start_duration_seconds=$((start_finished_at - start_started_at))

set +e
node "$root/scripts/ci/diagnose-supabase-start.mjs" \
  --log-file="$start_log" \
  --progress-file="$progress_file" \
  --docker-events-file="$events_file" \
  --expected-network="$network" \
  --exit-code="$start_exit_code" \
  --duration-seconds="$start_duration_seconds" > "$diagnostic_output" 2>&1
diagnostic_exit_code=$?
set -e
cat "$diagnostic_output"

if [[ "$start_exit_code" -ne 0 ]]; then
  exit "$start_exit_code"
fi
exit "$diagnostic_exit_code"
