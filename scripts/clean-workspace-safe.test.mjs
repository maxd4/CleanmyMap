import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CATALOG,
  ensureInsideRepo,
  formatSize,
  parseArgs,
  runWorkspaceCleanup,
  sizeOfPath,
} from "./clean-workspace-safe.mjs";

const tempRoot = mkdtempSync(join(tmpdir(), "clean-workspace-safe-test-"));

try {
  assert.equal(parseArgs(["node", "script"]).apply, false);
  assert.equal(parseArgs(["node", "script"]).dryRun, true);
  assert.equal(parseArgs(["node", "script", "--apply"]).apply, true);
  assert.equal(formatSize(1024 * 1024), "1.00 MB");
  assert.equal(CATALOG.find((entry) => entry.path === "artifacts")?.category, "PRESERVE_PROJECT");
  assert.equal(CATALOG.find((entry) => entry.path === "artifacts/playwright/report")?.category, "REGENERABLE_SAFE");
  assert.equal(CATALOG.find((entry) => entry.path === "apps/web/.next")?.category, "PRESERVE_WARM");

  const inside = ensureInsideRepo("safe/file.txt", tempRoot);
  assert.equal(inside, join(tempRoot, "safe", "file.txt"));

  assert.throws(
    () => ensureInsideRepo(join(tempRoot, "..", "outside.txt"), tempRoot),
    /Path escapes the repository/,
  );

  const safeDir = join(tempRoot, "safe");
  const preserveDir = join(tempRoot, "preserve");
  const artifactsDir = join(tempRoot, "artifacts");
  mkdirSync(safeDir, { recursive: true });
  mkdirSync(preserveDir, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });

  const safeFile = join(safeDir, "delete-me.txt");
  const preserveFile = join(preserveDir, "keep-me.txt");
  const artifactFile = join(artifactsDir, "keep-me.txt");
  writeFileSync(safeFile, "remove me", "utf8");
  writeFileSync(preserveFile, "keep me", "utf8");
  writeFileSync(artifactFile, "keep artifact", "utf8");

  const catalog = [
    {
      path: "safe/delete-me.txt",
      category: "REGENERABLE_SAFE",
      regenerate: "fake command",
      note: "test safe deletion",
    },
    {
      path: "preserve/keep-me.txt",
      category: "PRESERVE_PROJECT",
      regenerate: "none",
      note: "test preserve path",
    },
    {
      path: "artifacts",
      category: "PRESERVE_PROJECT",
      regenerate: "none",
      note: "artifacts must never be deleted globally",
    },
    {
      path: "missing/absent.txt",
      category: "REGENERABLE_SAFE",
      regenerate: "fake command",
      note: "test missing path",
    },
  ];

  const dryRun = runWorkspaceCleanup({
    catalog,
    apply: false,
    currentRepoRoot: tempRoot,
    logger: () => {},
  });
  assert.equal(dryRun.deletableCount, 1);
  assert.equal(sizeOfPath(safeFile) > 0, true);
  assert.equal(readFileSync(safeFile, "utf8"), "remove me");

  const applied = runWorkspaceCleanup({
    catalog,
    apply: true,
    currentRepoRoot: tempRoot,
    logger: () => {},
  });
  assert.equal(applied.deletableCount, 1);
  assert.equal(sizeOfPath(safeFile), 0);
  assert.equal(readFileSync(preserveFile, "utf8"), "keep me");
  assert.equal(sizeOfPath(preserveFile) > 0, true);
  assert.equal(readFileSync(artifactFile, "utf8"), "keep artifact");
  assert.equal(sizeOfPath(artifactFile) > 0, true);

  console.log("clean-workspace-safe validation passed");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
