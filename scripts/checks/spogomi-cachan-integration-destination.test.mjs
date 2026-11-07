import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../e2e/spogomi-cachan-integration.mjs", import.meta.url), "utf8");

test("SPOGOMI Cachan integration is guarded to ephemeral local Supabase and local app URLs", () => {
  assert.match(source, /CMM_SUPABASE_TEST_ENVIRONMENT !== "ephemeral"/);
  assert.match(source, /I_UNDERSTAND_EPHEMERAL_ONLY/);
  assert.match(source, /parsed\.hostname !== "127\.0\.0\.1"/);
  assert.match(source, /parsed\.hostname !== "localhost"/);
  assert.doesNotMatch(source, /supabase\.co/i);
});

test("SPOGOMI Cachan integration consumes the canonical fixture and real browser/API contracts", () => {
  assert.match(source, /scenario_cachan_cleanmymap_mixed\.json/);
  assert.match(source, /cachan_2026_places_SYNTHETIQUES\.csv/);
  assert.match(source, /\/api\/spogomi\/events/);
  assert.match(source, /chromium\.launch/);
  assert.match(source, /export\.xlsx/);
  assert.match(source, /EXECUTED_SPOGOMI_INTEGRATION/);
});
