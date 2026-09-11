import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import {
  allowedRootDirectories,
  findForbiddenRootDirectories,
  findForbiddenTrackedPaths,
  getTrackedFilesForHygiene,
  validateRootFileHygiene,
  localOnlyRootDirectories,
  localOnlyTrackedPrefixes,
  trackedCanonicalRootDirectories,
  trackedTransitionalRootDirectories,
} from "./check-root-file-hygiene.mjs";
import { createFilesystemRepositoryView } from "./repository-view.mjs";

function writeFile(root, relativePath, content) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test("root directory contract accepts canonical directories", () => {
  assert.deepEqual(findForbiddenRootDirectories(trackedCanonicalRootDirectories), []);
  assert.deepEqual(
    findForbiddenRootDirectories(trackedTransitionalRootDirectories),
    [],
  );
  assert.ok(allowedRootDirectories.includes(".artifacts"));
  assert.ok(allowedRootDirectories.includes("apps"));
  assert.equal(allowedRootDirectories.includes("companion-app"), false);
});

test("linked worktree metadata file is allowed at the repository root", () => {
  const result = validateRootFileHygiene({
    rootFiles: () => [".git"],
    rootDirectories: () => [],
  });
  assert.deepEqual(result.forbidden, []);
});

test("root directory contract accepts local-only directories when untracked", () => {
  assert.deepEqual(findForbiddenRootDirectories(localOnlyRootDirectories), []);
});

test("root directory contract rejects an unknown directory", () => {
  assert.deepEqual(findForbiddenRootDirectories([".artifacts", "unknown-root"]), [
    "unknown-root",
  ]);
});

test("local-only tracking guard rejects every local-only root directory", () => {
  assert.deepEqual(
    localOnlyTrackedPrefixes,
    localOnlyRootDirectories.map((directory) => `${directory}/`),
  );

  assert.deepEqual(
    findForbiddenTrackedPaths([
      "README.md",
      ".artifacts/validation/report.json",
      "backups/example.json",
      "scratch/tool.py",
      ".codex-remote-attachments/session/image.jpg",
      "artifacts/local-output.log",
      ".gitnexus/index.json",
      ".playwright-mcp/session.json",
      ".vercel/project.json",
      "node_modules/package/index.js",
      "scripts/checks/check-root-file-hygiene.mjs",
    ]),
    [
      "backups/example.json",
      "scratch/tool.py",
      ".codex-remote-attachments/session/image.jpg",
      "artifacts/local-output.log",
      ".gitnexus/index.json",
      ".playwright-mcp/session.json",
      ".vercel/project.json",
      "node_modules/package/index.js",
    ],
  );
});

test("filesystem mode distinguishes physical artifacts from tracked artifacts", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-root-hygiene-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFile(root, ".gitignore", "artifacts/\n");
  writeFile(root, "README.md", "fixture\n");
  writeFile(root, "artifacts/local-output.json", "ignored local output\n");
  execFileSync("git", ["add", "--", ".gitignore", "README.md"], { cwd: root });
  execFileSync("git", [
    "-c", "user.name=Codex test", "-c", "user.email=codex-test",
    "commit", "-qm", "fixture",
  ], { cwd: root });

  const view = createFilesystemRepositoryView(root);
  const allowed = validateRootFileHygiene(view, { repositoryRoot: root });
  assert.deepEqual(allowed.forbiddenTrackedPaths, []);
  assert.deepEqual(getTrackedFilesForHygiene(view, root), [".gitignore", "README.md"]);

  writeFile(root, "artifacts/tracked-output.json", "tracked output\n");
  execFileSync("git", ["add", "-f", "--", "artifacts/tracked-output.json"], { cwd: root });
  const blocked = validateRootFileHygiene(
    createFilesystemRepositoryView(root),
    { repositoryRoot: root },
  );
  assert.deepEqual(blocked.forbiddenTrackedPaths, ["artifacts/tracked-output.json"]);
});

test("filesystem mode still reports unknown root directories", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-root-hygiene-roots-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFile(root, ".gitignore", "artifacts/\n");
  writeFile(root, "README.md", "fixture\n");
  writeFile(root, "artifacts/local-output.json", "ignored local output\n");
  writeFile(root, "reports/local-report.json", "local report\n");
  writeFile(root, "work/local-work.txt", "local work\n");
  execFileSync("git", ["add", "--", ".gitignore", "README.md"], { cwd: root });
  execFileSync("git", [
    "-c", "user.name=Codex test", "-c", "user.email=codex-test",
    "commit", "-qm", "fixture",
  ], { cwd: root });

  const result = validateRootFileHygiene(
    createFilesystemRepositoryView(root),
    { repositoryRoot: root },
  );
  assert.deepEqual(result.forbiddenTrackedPaths, []);
  assert.deepEqual(result.forbiddenRootDirectories, ["reports", "work"]);
});

test("Git ref mode keeps every file in the candidate tree tracked", () => {
  const gitView = {
    mode: "git",
    listFiles: () => ["artifacts/from-candidate.json"],
    rootFiles: () => [],
    rootDirectories: () => ["artifacts"],
  };
  const result = validateRootFileHygiene(gitView);
  assert.deepEqual(result.forbiddenTrackedPaths, ["artifacts/from-candidate.json"]);
});
