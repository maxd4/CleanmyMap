import assert from "node:assert/strict";
import test from "node:test";
import { parsePgTapOutput } from "./run-supabase-sql-proof.mjs";

test("pgTAP summary counters ignore unrelated failure prose but reject incomplete summary counters", () => {
  const output = [
    "Failed network probes are retried by the runner.",
    "Files=1, Tests=2",
    "Result: PASS",
  ].join("\n");

  assert.equal(parsePgTapOutput(output, 2).passed, 2);
  assert.throws(
    () => parsePgTapOutput("Files=1, Tests=2, Failed checks\nResult: PASS\n", 2),
    /Failed counter has no numeric value/,
  );
});
