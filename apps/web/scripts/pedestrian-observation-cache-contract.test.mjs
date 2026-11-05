import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(path.join(here, "../supabase/migrations/20261104000006_pedestrian_observation_cache.sql"), "utf8");
const leaseMigration = fs.readFileSync(path.join(here, "../supabase/migrations/20261104000011_pedestrian_observation_cache_worker_lease.sql"), "utf8");
const forwardMigration = fs.readFileSync(path.join(here, "../supabase/migrations/20261105000016_pedestrian_observation_cache_lease_atomicity.sql"), "utf8");

assert.match(migration, /old_geom extensions\.geometry/);
assert.match(migration, /new_geom extensions\.geometry/);
assert.match(migration, /for update skip locked/i);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /status = 'done'/);
assert.match(migration, /spot\.status = 'validated'/);
assert.match(migration, /p_replace_segment_ids/);
assert.match(migration, /revoke all on table public\.pedestrian_risk_cache_invalidation_events/);
assert.match(leaseMigration, /create or replace function public\.refresh_pedestrian_observation_cache/i);
assert.match(leaseMigration, /locked_by = p_worker_id/);
assert.match(forwardMigration, /lease_token uuid/);
assert.match(forwardMigration, /lease_expires_at timestamptz/);
assert.match(forwardMigration, /clock_timestamp\(\)/);
assert.match(forwardMigration, /for update\s*\n\s*loop/i);
assert.match(forwardMigration, /v_closed_events <> v_expected_events/);
assert.match(forwardMigration, /invalidation lease requires events/);
assert.match(forwardMigration, /'projectionSegmentId'/);
assert.match(forwardMigration, /jsonb_agg\(jsonb_build_object/);

const worker = fs.readFileSync(path.join(here, "refresh-pedestrian-observation-cache.mjs"), "utf8");
assert.match(worker, /refresh_pedestrian_observation_cache/);
assert.doesNotMatch(worker, /get_active_pedestrian_observation_cache/);
assert.doesNotMatch(worker, /compute_pedestrian_observation_cache_rows/);
assert.match(worker, /p_lease_token/);
assert.match(worker, /leaseTokens/);

console.log("pedestrian observation cache contract: PASS");
