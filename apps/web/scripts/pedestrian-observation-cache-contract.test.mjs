import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(path.join(here, "../supabase/migrations/20261104000006_pedestrian_observation_cache.sql"), "utf8");

assert.match(migration, /old_geom extensions\.geometry/);
assert.match(migration, /new_geom extensions\.geometry/);
assert.match(migration, /for update skip locked/i);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /status = 'done'/);
assert.match(migration, /spot\.status = 'validated'/);
assert.match(migration, /p_replace_segment_ids/);
assert.match(migration, /revoke all on table public\.pedestrian_risk_cache_invalidation_events/);

console.log("pedestrian observation cache contract: PASS");
