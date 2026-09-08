import test from "node:test";
import assert from "node:assert/strict";
import { buildMarkdown, sessionMemoryStatus, validateSessionMemory } from "./update_session_memory.mjs";

const VALID_MEMORY = buildMarkdown(
  {
    Done: ["One completed item"],
    "In Progress": ["One active item"],
    Next: ["One next item"],
    Risks: ["None."],
  },
  new Date("2026-09-08T12:00:00Z"),
);

test("builds and validates the canonical four-section format", () => {
  const result = validateSessionMemory(VALID_MEMORY);
  assert.equal(result.valid, true);
  assert.deepEqual(result.state.Next, ["One next item"]);
  assert.equal(result.date, "2026-09-08");
});

test("reports old valid memory as stale without invalidating it", () => {
  const result = sessionMemoryStatus(VALID_MEMORY, new Date("2026-09-30T12:00:00Z"));
  assert.equal(result.valid, true);
  assert.equal(result.stale, true);
  assert.equal(result.ageDays, 22);
});

test("rejects legacy or manually shaped memory as invalid", () => {
  const result = validateSessionMemory("# Latest Session\n\n## Snapshot\n- legacy\n");
  assert.equal(result.valid, false);
  assert.match(result.errors.join("; "), /updated date|expected section/);
});
