import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("private log capture retains only a bounded tail and marks truncation", (context) => {
  const root = resolve("artifacts/ci");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(resolve(root, "bounded-log-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const log = resolve(directory, "private.log");
  const child = spawnSync(process.execPath, ["scripts/ci/capture-bounded-log.mjs", log, "512"], {
    input: `${"x".repeat(4096)}END_OF_PRIVATE_LOG`,
    encoding: "utf8",
  });
  assert.equal(child.status, 0, child.stderr);
  const content = readFileSync(log, "utf8");
  assert.ok(Buffer.byteLength(content, "utf8") <= 512);
  assert.match(content, /END_OF_PRIVATE_LOG/);
  assert.match(content, /private diagnostic log truncated/);
  assert.doesNotMatch(content, /^x{1000}/);
});
