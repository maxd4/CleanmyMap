import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { main, parseArgs, runGitNexusCommand } from "./audit-gitnexus.mjs";

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

test("GitNexus audit captures a non-zero report for its parent checker", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-audit-"));
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(
    runnerPath,
    "process.stdout.write(JSON.stringify({ status: 'cycles_found', enumeration: 'complete', cycles: [{ files: ['a.ts', 'b.ts', 'a.ts'] }] })); process.exitCode = 1;\n",
  );
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const result = runGitNexusCommand(repoRoot, ["check", "--cycles", "--json"]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /cycles_found/);
});

test("GitNexus audit bounds a hung local runner", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-timeout-"));
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(runnerPath, "setInterval(() => {}, 1000);\n");
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const result = runGitNexusCommand(repoRoot, ["status"], { timeoutMs: 50 });
  assert.equal(result.timedOut, true);
});
