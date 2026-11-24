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
start_fifo="$temp_root/supabase-start-$run_key.fifo"
progress_file="$temp_root/supabase-start-$run_key-progress.ndjson"
events_file="$temp_root/supabase-start-$run_key-events.ndjson"
postgres_log="$temp_root/supabase-start-$run_key-postgres.log"
postgres_server_log="$temp_root/supabase-start-$run_key-postgres-server.log"
bootstrap_workdir="$temp_root/supabase-bootstrap-$run_key"
postgres_log_watch_pid=""
start_pid=""
capture_pid=""
progress_pid=""
events_pid=""
start_timeout_seconds="${CMM_SUPABASE_START_TIMEOUT_SECONDS:-1200}"
if [[ ! "$start_timeout_seconds" =~ ^[0-9]+$ ]] || (( start_timeout_seconds < 60 || start_timeout_seconds > 1800 )); then
  echo "CMM_SUPABASE_START_TIMEOUT_SECONDS must be between 60 and 1800." >&2
  exit 2
fi
if ! command -v timeout >/dev/null 2>&1; then
  echo "GNU timeout is required to bound the ephemeral Supabase startup." >&2
  exit 2
fi
if ! command -v setsid >/dev/null 2>&1; then
  echo "setsid is required to supervise the ephemeral Supabase process group." >&2
  exit 2
fi

stop_pid_or_group() {
  local pid="$1" group="${2:-false}" attempt=0
  [[ -n "$pid" ]] || return 0
  if [[ "$group" == true ]]; then kill -TERM -- "-$pid" 2>/dev/null || true; else kill -TERM "$pid" 2>/dev/null || true; fi
  while { [[ "$group" == true ]] && kill -0 -- "-$pid" 2>/dev/null || [[ "$group" != true ]] && kill -0 "$pid" 2>/dev/null; } && (( attempt < 20 )); do sleep 0.1; ((attempt+=1)); done
  if { [[ "$group" == true ]] && kill -0 -- "-$pid" 2>/dev/null || [[ "$group" != true ]] && kill -0 "$pid" 2>/dev/null; }; then
    if [[ "$group" == true ]]; then kill -KILL -- "-$pid" 2>/dev/null || true; else kill -KILL "$pid" 2>/dev/null || true; fi
  fi
  wait "$pid" 2>/dev/null || true
}

cleanup() {
  stop_pid_or_group "${start_pid:-}" true
  stop_pid_or_group "${capture_pid:-}"
  stop_pid_or_group "${progress_pid:-}"
  stop_pid_or_group "$postgres_log_watch_pid"
  stop_pid_or_group "${events_pid:-}" true
  rm -f "$start_log" "$start_fifo" "$progress_file" "$events_file" "$postgres_log" "$postgres_server_log"
  case "$bootstrap_workdir" in
    "$temp_root"/supabase-bootstrap-*) rm -rf -- "$bootstrap_workdir" ;;
    *) echo "Refusing to remove an unexpected bootstrap workdir path." >&2 ;;
  esac
}
trap cleanup EXIT
handle_external_cancellation() {
  printf 'Supabase start diagnostic (bounded; raw log withheld):\nresult=failure exit_code=143\ncategory=START_CANCELLED\ndiagnostic_code=SUPABASE_START_START_CANCELLED\n' > "$diagnostic_output"
  exit 143
}
trap handle_external_cancellation TERM INT

: > "$progress_file"
: > "$events_file"
mkdir -p "$bootstrap_workdir/supabase"
node "$root/scripts/ci/supabase-config.mjs" \
  --source-config="$workdir/supabase/config.toml" \
  --target-config="$bootstrap_workdir/supabase/config.toml"
start_started_at="$(date +%s)"
setsid bash -c 'docker events --since "$1" --filter type=container --format "{{json .}}" 2>/dev/null | node "$2/scripts/ci/capture-bounded-log.mjs" "$3" 4194304' _ "$start_started_at" "$root" "$events_file" &
events_pid=$!
mkfifo "$start_fifo"
node "$root/scripts/ci/capture-bounded-log.mjs" "$start_log" 8388608 < "$start_fifo" &
capture_pid=$!
setsid timeout --signal=TERM --kill-after=15s "$start_timeout_seconds" "$root/node_modules/.bin/supabase" start --debug --workdir "$bootstrap_workdir" --yes --output-format json --network-id="$network" > "$start_fifo" 2>&1 &
start_pid=$!
watch_postgres_log() {
  local container_id=""
  local docker_log_pid=""
  local server_log_pid=""
  trap 'stop_pid_or_group "$docker_log_pid" true; stop_pid_or_group "$server_log_pid" true' EXIT
  while kill -0 "$start_pid" 2>/dev/null; do
    container_id="$(docker ps -q --filter 'name=supabase_db_web' | head -n 1)"
    if [[ -n "$container_id" ]]; then
      setsid bash -c 'docker logs --follow --timestamps "$1" 2>/dev/null | node "$2/scripts/ci/capture-bounded-log.mjs" "$3" 8388608' _ "$container_id" "$root" "$postgres_log" &
      docker_log_pid=$!
      setsid bash -c 'docker exec "$1" sh -c '\''exec tail -n 0 -F /var/log/postgresql/*.json /var/lib/postgresql/data/log/*.json 2>/dev/null'\'' 2>/dev/null | node "$2/scripts/ci/capture-bounded-log.mjs" "$3" 8388608' _ "$container_id" "$root" "$postgres_server_log" &
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
stop_pid_or_group "$start_pid" true
start_pid=""
set +e
wait "$capture_pid"
capture_exit_code=$?
set -e
capture_pid=""
if [[ "$capture_exit_code" -ne 0 && "$start_exit_code" -eq 0 ]]; then start_exit_code="$capture_exit_code"; fi
start_finished_at="$(date +%s)"
stop_pid_or_group "$progress_pid"
progress_pid=""
stop_pid_or_group "$postgres_log_watch_pid"
postgres_log_watch_pid=""
stop_pid_or_group "$events_pid" true
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
