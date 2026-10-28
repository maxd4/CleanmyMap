import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

import {
  acquireFullValidationLock,
  removePathWithRetry,
} from "./validation-evidence.mjs";

const candidateSha = "a".repeat(40);

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-validation-evidence-"));
}

function lockPath(root) {
  return path.join(root, "artifacts", "validation", "full", "running.json");
}

function writeStaleLock(root) {
  fs.mkdirSync(path.dirname(lockPath(root)), { recursive: true });
  fs.writeFileSync(lockPath(root), `${JSON.stringify({
    version: 2,
    executionId: "abandoned-execution",
    pid: Number.MAX_SAFE_INTEGER,
    candidateSha,
    startedAt: "2020-01-01T00:00:00.000Z",
  })}\n`);
}

function runConcurrentOwner(root) {
  const moduleUrl = pathToFileURL(path.resolve("scripts/ci/validation-evidence.mjs")).href;
  const source = `
    import { acquireFullValidationLock } from ${JSON.stringify(moduleUrl)};
    try {
      const release = acquireFullValidationLock({ repositoryRoot: ${JSON.stringify(root)}, candidateSha: ${JSON.stringify(candidateSha)} });
      process.stdout.write("OWNER\\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      release();
      process.exit(0);
    } catch (error) {
      process.stderr.write(String(error?.message ?? error));
      process.exit(1);
    }
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", source], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test("refuses to recover an existing FULL lock that is still uninitialized", () => {
  const root = makeRoot();
  try {
    fs.mkdirSync(path.dirname(lockPath(root)), { recursive: true });
    fs.writeFileSync(lockPath(root), "");

    assert.throws(
      () => acquireFullValidationLock({ repositoryRoot: root, candidateSha }),
      /vide, partiel ou illisible; récupération automatique refusée/,
    );
    assert.equal(fs.readFileSync(lockPath(root), "utf8"), "");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("atomically reclaims a stale FULL lock so concurrent recovery has one owner", async () => {
  const root = makeRoot();
  try {
    writeStaleLock(root);
    const results = await Promise.all([
      runConcurrentOwner(root),
      runConcurrentOwner(root),
    ]);

    assert.equal(results.filter((result) => result.code === 0).length, 1);
    assert.equal(results.filter((result) => result.code === 1).length, 1);
    assert.match(
      results.find((result) => result.code === 1)?.stderr ?? "",
      /Un seul FULL|récupération concurrente|verrou FULL existant/,
    );
    assert.equal(fs.existsSync(lockPath(root)), false);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("uses distinct cryptographic identifiers for sequential FULL lock executions", () => {
  const root = makeRoot();
  try {
    const releaseFirst = acquireFullValidationLock({ repositoryRoot: root, candidateSha });
    const first = JSON.parse(fs.readFileSync(lockPath(root), "utf8"));
    releaseFirst();

    const releaseSecond = acquireFullValidationLock({ repositoryRoot: root, candidateSha });
    const second = JSON.parse(fs.readFileSync(lockPath(root), "utf8"));
    releaseSecond();

    assert.notEqual(first.executionId, second.executionId);
    assert.match(
      second.executionId,
      /^\d+-\d+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});
