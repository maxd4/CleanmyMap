import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { runCheck, runChecksWithScheduler, runValidationMode } from "./run_validation_mode.mjs";
import {
  removePathWithRetry,
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

test("FULL checks do not install a timeout when the global budget is unlimited", async () => {
  const result = await runCheck(
    {
      label: "unlimited test check",
      command: { executable: process.execPath, args: ["-e", "setTimeout(() => {}, 50)"] },
    },
    Infinity,
  );
  assert.equal(result.status, "PASS");
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

function removeFixture(root) {
  removePathWithRetry(root, { recursive: true });
}

test("retries transient Windows cleanup failures and rethrows persistent failures", () => {
  let attempts = 0;
  const delays = [];
  removePathWithRetry("fixture", {
    maxRetries: 2,
    retryDelayMs: 10,
    remove: () => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error("fixture is still in use");
        error.code = "EPERM";
        throw error;
      }
    },
    sleep: (milliseconds) => delays.push(milliseconds),
  });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);

  assert.throws(
    () => removePathWithRetry("fixture", {
      maxRetries: 1,
      remove: () => {
        const error = new Error("fixture remains locked");
        error.code = "EPERM";
        throw error;
      },
      sleep: () => {},
    }),
    /fixture remains locked/,
  );
});

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
    removeFixture(root);
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

    const blockedResult = await runValidationMode(options, {
      repositoryRoot: root,
      runCheck: async () => ({
        status: "FAIL",
        exitCode: 1,
        output: "CONTROL_STATUS: BLOCKED_ACCESS",
      }),
    });
    assert.equal(blockedResult, 1);
  } finally {
    removeFixture(root);
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
    removeFixture(root);
  }
});

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test("scheduler runs independent checks in parallel and respects resources/dependencies", async () => {
  const checks = [
    { id: "independent-a", parallelizable: true, resources: ["a"], dependencies: [] },
    { id: "independent-b", parallelizable: true, resources: ["b"], dependencies: [] },
    { id: "dependent-a", parallelizable: true, resources: ["a"], dependencies: ["independent-a"] },
  ];
  const running = new Set();
  let maximumRunning = 0;
  const started = [];
  const result = await runChecksWithScheduler({
    checks,
    maxParallel: 2,
    getDecision: () => ({ decision: "execute", remainingSeconds: Infinity }),
    onStart: (check) => started.push(check.id),
    executeCheck: async (check) => {
      running.add(check.id);
      maximumRunning = Math.max(maximumRunning, running.size);
      await delay(25);
      running.delete(check.id);
      return { status: "PASS", elapsedSeconds: 0.025 };
    },
  });

  assert.equal(maximumRunning, 2);
  assert.deepEqual([...result.states.values()], ["PASS", "PASS", "PASS"]);
  assert.ok(started.indexOf("dependent-a") > started.indexOf("independent-a"));
});

test("scheduler keeps an independent check running after a failure and blocks its dependent", async () => {
  const checks = [
    { id: "failing", parallelizable: true, resources: ["failure"], dependencies: [] },
    { id: "independent", parallelizable: true, resources: ["independent"], dependencies: [] },
    { id: "dependent", parallelizable: true, resources: ["failure"], dependencies: ["failing"] },
  ];
  const finished = [];
  const result = await runChecksWithScheduler({
    checks,
    maxParallel: 2,
    getDecision: () => ({ decision: "execute", remainingSeconds: Infinity }),
    executeCheck: async (check) => {
      await delay(check.id === "failing" ? 10 : 30);
      finished.push(check.id);
      return check.id === "failing"
        ? { status: "FAIL", exitCode: 1 }
        : { status: "PASS", elapsedSeconds: 0.03 };
    },
  });

  assert.deepEqual(result.states.get("failing"), "FAIL");
  assert.deepEqual(result.states.get("independent"), "PASS");
  assert.deepEqual(result.states.get("dependent"), "BLOCKED");
  assert.deepEqual(finished, ["failing", "independent"]);
});

test("progress reports monotone completion and noninteractive final metrics", async () => {
  const lines = [];
  const root = makeRepository();
  try {
    const result = await runValidationMode({
      mode: "FAST",
      candidateScope: "WORKTREE",
      changedFiles: ["documentation/development/TESTING.md"],
      maxParallel: 2,
    }, {
      repositoryRoot: root,
      log: (line) => lines.push(line),
      interactive: false,
      runCheck: async () => ({ status: "PASS", elapsedSeconds: 0.01 }),
    });
    assert.equal(result, 0);
    const progress = lines
      .filter((line) => String(line).includes("[FAST]"))
      .map((line) => Number(String(line).match(/\((\d+)%\)/)?.[1]))
      .filter(Number.isFinite);
    assert.ok(progress.length > 0);
    for (let index = 1; index < progress.length; index += 1) {
      assert.ok(progress[index] >= progress[index - 1]);
    }
    assert.ok(lines.some((line) => String(line).includes("START candidate=")));
    assert.ok(lines.some((line) => String(line).includes("TOTAL_DURATION_SECONDS:")));
  } finally {
    removeFixture(root);
  }
});

test("silent child processes emit heartbeat callbacks", async () => {
  const heartbeats = [];
  const result = await runCommandWithTimeout({
    command: { executable: process.execPath, args: ["-e", "setTimeout(() => {}, 90)"] },
    timeoutMs: 1_000,
    heartbeatMs: 20,
    onHeartbeat: (elapsedSeconds) => heartbeats.push(elapsedSeconds),
  });
  assert.equal(result.status, "PASS");
  assert.ok(heartbeats.length > 0);
});

test("interactive progress uses terminal refreshes", async () => {
  const output = [];
  const logs = [];
  const root = makeRepository();
  try {
    assert.equal(await runValidationMode({
      mode: "FAST",
      candidateScope: "WORKTREE",
      changedFiles: ["documentation/development/TESTING.md"],
      maxParallel: 1,
    }, {
      repositoryRoot: root,
      interactive: true,
      write: (value) => output.push(value),
      log: (line) => logs.push(line),
      runCheck: async () => ({ status: "PASS", elapsedSeconds: 0.01 }),
    }), 0);
    assert.ok(output.some((value) => value.includes("\r")));
    assert.ok(logs.some((line) => String(line).includes("VALIDATION_MODE: FAST")));
  } finally {
    removeFixture(root);
  }
});
