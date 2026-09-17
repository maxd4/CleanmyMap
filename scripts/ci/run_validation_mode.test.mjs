import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { runValidationMode } from "./run_validation_mode.mjs";
import {
  VALIDATION_EVIDENCE_RELATIVE_ROOT,
} from "./validation-evidence.mjs";
import {
  resolveValidationCommand,
  runCommandWithTimeout,
} from "./validation-process.mjs";

test("resolves npm through Node and npm-cli.js on Windows", () => {
  const command = resolveValidationCommand(
    { executable: "npm", args: ["run", "test"] },
    "win32",
    "C:\\Program Files\\nodejs\\node.exe",
  );

  assert.deepEqual(command, {
    executable: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "test",
    ],
  });
});

test("resolves npx through Node and npx-cli.js on Windows", () => {
  const command = resolveValidationCommand(
    { executable: "npx", args: ["eslint", "apps/web"] },
    "win32",
    "C:\\Program Files\\nodejs\\node.exe",
  );

  assert.deepEqual(command, {
    executable: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      "eslint",
      "apps/web",
    ],
  });
});

test("keeps npm unchanged on non-Windows platforms", () => {
  const original = { executable: "npm", args: ["run", "test"] };

  assert.equal(resolveValidationCommand(original, "linux", "/usr/bin/node"), original);
});

test("keeps executables other than npm and npx unchanged", () => {
  const original = { executable: "node", args: ["scripts/check.mjs"] };

  assert.equal(
    resolveValidationCommand(original, "win32", "C:\\Program Files\\nodejs\\node.exe"),
    original,
  );
});

test("keeps arguments containing spaces as separate arguments", () => {
  const command = resolveValidationCommand(
    { executable: "npm", args: ["run", "check", "path with spaces/file.mjs"] },
    "win32",
    "C:\\Program Files\\nodejs\\node.exe",
  );

  assert.deepEqual(command.args, [
    "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
    "run",
    "check",
    "path with spaces/file.mjs",
  ]);
});

function makeRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-validation-mode-"));
  fs.mkdirSync(path.join(root, "documentation", "development"), { recursive: true });
  fs.writeFileSync(path.join(root, "documentation", "development", "TESTING.md"), "candidate\n");
  return root;
}

test("stores mode evidence below the canonical artifacts root", () => {
  assert.equal(
    VALIDATION_EVIDENCE_RELATIVE_ROOT,
    path.join("artifacts", "validation", "mode-evidence"),
  );
  assert.notEqual(
    VALIDATION_EVIDENCE_RELATIVE_ROOT,
    path.join(".artifacts", "validation", "mode-evidence"),
  );
});

test("FULL reuses FAST evidence only for the exact unchanged candidate", async () => {
  const root = makeRepository();
  const options = {
    candidateScope: "WORKTREE",
    changedFiles: ["documentation/development/TESTING.md"],
  };
  const fastCalls = [];
  const fullCalls = [];
  try {
    assert.equal(
      await runValidationMode({ ...options, mode: "FAST" }, {
        repositoryRoot: root,
        runCheck: async (check) => {
          fastCalls.push(check.id);
          return { status: "PASS", exitCode: 0 };
        },
      }),
      0,
    );
    assert.ok(fastCalls.includes("documentation-governance"));

    assert.equal(
      await runValidationMode({ ...options, mode: "FULL" }, {
        repositoryRoot: root,
        runCheck: async (check) => {
          fullCalls.push(check.id);
          return { status: "PASS", exitCode: 0 };
        },
      }),
      0,
    );
    assert.equal(fullCalls.includes("diff-check"), false);
    assert.equal(fullCalls.includes("security-secrets"), false);
    assert.equal(fullCalls.includes("documentation-governance"), false);
    assert.ok(fullCalls.includes("root-file-hygiene"));
    assert.equal(
      fs.existsSync(path.join(root, VALIDATION_EVIDENCE_RELATIVE_ROOT)),
      false,
    );

    fs.appendFileSync(path.join(root, "documentation", "development", "TESTING.md"), "changed\n");
    const changedFullCalls = [];
    assert.equal(
      await runValidationMode({ ...options, mode: "FULL" }, {
        repositoryRoot: root,
        runCheck: async (check) => {
          changedFullCalls.push(check.id);
          return { status: "PASS", exitCode: 0 };
        },
      }),
      0,
    );
    assert.ok(changedFullCalls.includes("diff-check"));
    assert.ok(changedFullCalls.includes("documentation-governance"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runner keeps unknown failures as FAIL and accepts only verified foreign proof", async () => {
  const root = makeRepository();
  const options = {
    mode: "FAST",
    candidateScope: "WORKTREE",
    changedFiles: ["documentation/development/TESTING.md"],
  };
  try {
    const unknownResult = await runValidationMode(options, {
      repositoryRoot: root,
      runCheck: async () => ({
        status: "FAIL",
        exitCode: 1,
        failureFiles: ["apps/mobile/src/parallel.ts"],
      }),
    });
    assert.equal(unknownResult, 1);

    const provenResult = await runValidationMode(options, {
      repositoryRoot: root,
      runCheck: async () => ({
        status: "FAIL",
        exitCode: 1,
        failureFiles: ["apps/mobile/src/parallel.ts"],
        preexistingProof: { verified: true, kind: "reproduction", source: "reproduction" },
      }),
    });
    assert.equal(provenResult, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function isAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pid) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && isAlive(pid)) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return isAlive(pid);
}

test("timeout terminates the parent and its child process", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-validation-timeout-"));
  const parentPidFile = path.join(root, "parent.pid");
  const childPidFile = path.join(root, "child.pid");
  const childCode = "setInterval(() => {}, 1000);";
  const parentCode = [
    "const fs = require('node:fs');",
    "const { spawn } = require('node:child_process');",
    `fs.writeFileSync(${JSON.stringify(parentPidFile)}, String(process.pid));`,
    `const child = spawn(process.execPath, ['-e', ${JSON.stringify(childCode)}], { stdio: 'ignore' });`,
    `fs.writeFileSync(${JSON.stringify(childPidFile)}, String(child.pid));`,
    "setInterval(() => {}, 1000);",
  ].join("\n");
  try {
    const result = await runCommandWithTimeout({
      command: { executable: process.execPath, args: ["-e", parentCode] },
      cwd: root,
      timeoutMs: 150,
    });
    assert.equal(result.status, "TIME_BUDGET_EXCEEDED");
    const parentPid = Number(fs.readFileSync(parentPidFile, "utf8"));
    const childPid = Number(fs.readFileSync(childPidFile, "utf8"));
    assert.equal(await waitForExit(parentPid), false);
    assert.equal(await waitForExit(childPid), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
