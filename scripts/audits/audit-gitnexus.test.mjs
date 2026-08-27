import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { main, parseArgs } from "./audit-gitnexus.mjs";

test("GitNexus audit accepts only the optional cycles flag", () => {
  assert.deepEqual(parseArgs([]), { cycles: false });
  assert.deepEqual(parseArgs(["--cycles"]), { cycles: true });
  assert.throws(() => parseArgs(["--force"]), /Usage:/);
});

test("GitNexus audit fails clearly when the local runner is missing", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-audit-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  assert.equal(main([], repoRoot), 1);
});
