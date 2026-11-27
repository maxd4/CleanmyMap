import assert from "node:assert/strict";
import test from "node:test";
import { buildPsqlArgs } from "./supabase-local-psql.mjs";

const localDbUrl = "postgresql://localhost/fixture";

test("keeps expanded output as the helper default while enabling scalar rows on request", () => {
  const expandedArgs = buildPsqlArgs(localDbUrl);
  assert.ok(expandedArgs.includes("-x"));
  assert.ok(!expandedArgs.includes("-t"));
  assert.ok(expandedArgs.includes("ON_ERROR_STOP=1"));
  assert.ok(expandedArgs.includes("VERBOSITY=verbose"));

  const tupleArgs = buildPsqlArgs(localDbUrl, { tuplesOnly: true });
  assert.ok(!tupleArgs.includes("-x"));
  assert.ok(tupleArgs.includes("-A"));
  assert.ok(tupleArgs.includes("-t"));
  assert.ok(tupleArgs.includes("ON_ERROR_STOP=1"));
  assert.ok(tupleArgs.includes("VERBOSITY=verbose"));
});
