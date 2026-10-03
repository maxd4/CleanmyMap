import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canReuseGitNexusIndex,
  getGitNexusStepTimeoutMs,
  isReusableGitNexusIndex,
  main,
  parseArgs,
  runGitNexusCommand,
} from "./audit-gitnexus.mjs";

test("GitNexus audit accepts only the optional cycles flag", () => {
  assert.deepEqual(parseArgs([]), { cycles: false });
  assert.deepEqual(parseArgs(["--cycles"]), { cycles: true });
  assert.throws(() => parseArgs(["--force"]), /Usage:/);
});

test("GitNexus preflight fails immediately when the local runner is missing", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-audit-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const diagnostics = [];
  assert.equal(await main([], repoRoot, { writeDiagnostic: (line) => diagnostics.push(line) }), 1);
  assert.deepEqual(diagnostics.slice(0, 3), [
    "GITNEXUS_PREFLIGHT",
    `RUNNER_PATH: ${path.join(repoRoot, ".gitnexus", "run.cjs")}`,
    "RUNNER_PRESENT: no",
  ]);
  assert.ok(diagnostics.includes("HOST_ENVIRONMENT: GitNexus runner missing"));
  assert.ok(diagnostics.includes("GITNEXUS_STATUS: RUNNER_MISSING"));
  assert.ok(diagnostics.includes("SETUP_CANONICAL: npm install --global gitnexus@1.6.12"));
});

test("GitNexus audit reports visible steps and PASS for a controlled runner", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-audit-"));
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(
    runnerPath,
    "const args = process.argv.slice(2); if (args[0] === 'check') process.stdout.write(JSON.stringify({ status: 'clean', enumeration: 'complete', cycles: [] })); else process.stdout.write(args.join(' ') + '\\n');\n",
  );
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const diagnostics = [];
  const result = await main(["--cycles"], repoRoot, { writeDiagnostic: (line) => diagnostics.push(line) });
  assert.equal(result, 0);
  assert.ok(diagnostics.includes("GITNEXUS_STEP_START: analyze --index-only"));
  assert.ok(diagnostics.includes("GITNEXUS_STEP_START: status"));
  assert.ok(diagnostics.includes("GITNEXUS_STEP_START: check --cycles --json"));
  assert.ok(diagnostics.includes("GITNEXUS_STATUS: PASS"));
});

test("GitNexus audit captures a non-zero report for its parent checker", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-audit-"));
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(
    runnerPath,
    "process.stdout.write(JSON.stringify({ status: 'cycles_found', enumeration: 'complete', cycles: [{ files: ['a.ts', 'b.ts', 'a.ts'] }] })); process.exitCode = 1;\n",
  );
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const result = await runGitNexusCommand(repoRoot, ["check", "--cycles", "--json"]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /cycles_found/);
});

test("a healthy GitNexus phase is not bounded by the former ten-second ceiling", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-healthy-"));
  const diagnostics = [];
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const result = await runGitNexusCommand(repoRoot, ["analyze", "--index-only"], {
    runCommand: async ({ timeoutMs }) => ({
      status: "PASS",
      exitCode: 0,
      stdout: "healthy analysis\n",
      stderr: "",
      elapsedSeconds: 21.8,
      timedOut: false,
      interrupted: false,
      timeoutMs,
    }),
    writeDiagnostic: (line) => diagnostics.push(line),
    writeStdout: () => {},
    writeStderr: () => {},
  });

  assert.equal(result.status, 0);
  assert.equal(result.timedOut, false);
  assert.ok(getGitNexusStepTimeoutMs(["analyze", "--index-only"]) > 10_000);
  assert.ok(diagnostics.includes("GITNEXUS_STEP_START: analyze --index-only"));
});

test("GitNexus audit emits a heartbeat and bounds a silent local runner", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-timeout-"));
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(runnerPath, "setInterval(() => {}, 1000);\n");
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const diagnostics = [];
  const startedAt = performance.now();
  const result = await runGitNexusCommand(repoRoot, ["status"], {
    timeoutMs: 120,
    heartbeatMs: 20,
    writeDiagnostic: (line) => diagnostics.push(line),
    writeStdout: () => {},
    writeStderr: () => {},
  });
  assert.equal(result.timedOut, true);
  assert.ok(diagnostics.includes("GITNEXUS_STEP_START: status"));
  assert.ok(diagnostics.some((line) => line.startsWith("GITNEXUS_STILL_RUNNING: status elapsed=")));
  assert.ok(performance.now() - startedAt < 1000);
});

test("GitNexus audit preserves partial stdout and stderr diagnostics", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-partial-"));
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(runnerPath, "process.stdout.write('partial stdout'); process.stderr.write('partial stderr'); process.exitCode = 1;\n");
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const result = await runGitNexusCommand(repoRoot, ["status"], {
    writeStdout: () => {},
    writeStderr: () => {},
    writeDiagnostic: () => {},
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "partial stdout");
  assert.equal(result.stderr, "partial stderr");
});

test("GitNexus index reuse requires the same candidate, version, and index configuration", () => {
  const metadata = {
    lastCommit: "candidate-a",
    runnerIdentity: { cliVersion: "1.6.12" },
    contentRetention: "full",
    ftsProfile: "full",
    schemaFingerprint: "schema-a",
  };
  assert.equal(canReuseGitNexusIndex(metadata, { candidate: "candidate-a" }), true);
  assert.equal(canReuseGitNexusIndex(metadata, { candidate: "candidate-b" }), false);
  assert.equal(canReuseGitNexusIndex(metadata, { candidate: "candidate-a", expectedVersion: "1.6.13" }), false);
  assert.equal(canReuseGitNexusIndex({ ...metadata, schemaFingerprint: "" }, { candidate: "candidate-a" }), false);
});

test("GitNexus audit reuses a valid index instead of rerunning analyze", async (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-reuse-"));
  fs.writeFileSync(path.join(repoRoot, "README.md"), "fixture\n");
  fs.writeFileSync(path.join(repoRoot, ".gitignore"), ".gitnexus/\n");
  execFileSync("git", ["init", "-q"], { cwd: repoRoot });
  execFileSync("git", ["add", "README.md", ".gitignore"], { cwd: repoRoot });
  execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture", "commit", "-qm", "fixture"], { cwd: repoRoot });
  const candidate = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const runnerPath = path.join(repoRoot, ".gitnexus", "run.cjs");
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(runnerPath, "if (process.argv[2] === 'analyze') process.exitCode = 7; else process.stdout.write('status\\n');\n");
  fs.writeFileSync(path.join(repoRoot, ".gitnexus", "gitnexus.json"), JSON.stringify({
    lastCommit: candidate,
    runnerIdentity: { cliVersion: "1.6.12" },
    contentRetention: "full",
    ftsProfile: "full",
    schemaFingerprint: "schema-a",
  }));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const diagnostics = [];
  assert.equal(await main([], repoRoot, { writeDiagnostic: (line) => diagnostics.push(line) }), 0);
  assert.ok(diagnostics.includes("GITNEXUS_STEP_REUSED: analyze --index-only"));
  assert.ok(!diagnostics.includes("GITNEXUS_STEP_START: analyze --index-only"));

  fs.appendFileSync(path.join(repoRoot, "README.md"), "dirty candidate\n");
  assert.equal(isReusableGitNexusIndex(repoRoot), false);
});
