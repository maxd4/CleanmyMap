import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createFilesystemRepositoryView,
  createGitRepositoryView,
  partitionGitBlobBatches,
} from "./repository-view.mjs";

function writeFile(root, relativePath, content) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test("Git repository view reads the committed tree and ignores dirty/untracked files", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-repository-view-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFile(root, "README.md", "committed\n");
  writeFile(root, "documentation/active.md", "active\n");
  execFileSync("git", ["add", "--", "."], { cwd: root });
  execFileSync("git", [
    "-c", "user.name=Codex test", "-c", "user.email=codex-test",
    "commit", "-qm", "fixture",
  ], { cwd: root });
  const ref = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

  writeFile(root, "README.md", "dirty\n");
  writeFile(root, "documentation/parallel.md", "parallel\n");

  const gitView = createGitRepositoryView(ref, root);
  assert.equal(gitView.readText("README.md"), "committed\n");
  assert.equal(gitView.exists("documentation/active.md"), true);
  assert.equal(gitView.exists("documentation/parallel.md"), false);
  assert.deepEqual(gitView.rootFiles(), ["README.md"]);
  assert.deepEqual(gitView.rootDirectories(), ["documentation"]);
  assert.deepEqual(gitView.listPathsUnder("documentation"), ["documentation/active.md"]);

  const filesystemView = createFilesystemRepositoryView(root);
  assert.equal(filesystemView.readText("README.md"), "dirty\n");
  assert.equal(filesystemView.exists("documentation/parallel.md"), true);
});

test("Git repository view reads bounded blob batches without leaving the ref", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-repository-view-batches-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFile(root, "README.md", "committed README\n");
  writeFile(root, "documentation/active.md", "committed documentation\n");
  writeFile(root, "src/entry.ts", "export const committed = true;\n");
  execFileSync("git", ["add", "--", "."], { cwd: root });
  execFileSync("git", [
    "-c", "user.name=Codex test", "-c", "user.email=codex-test",
    "commit", "-qm", "bounded batches",
  ], { cwd: root });
  const ref = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

  writeFile(root, "README.md", "dirty README\n");
  writeFile(root, "documentation/untracked.md", "untracked\n");

  const forcedBatches = partitionGitBlobBatches([
    { objectId: "one", size: 3 },
    { objectId: "two", size: 3 },
    { objectId: "three", size: 3 },
  ], 4);
  assert.equal(forcedBatches.length, 3);

  const gitView = createGitRepositoryView(ref, root, { batchContentTargetBytes: 1 });
  assert.deepEqual(gitView.listFiles(), ["README.md", "documentation/active.md", "src/entry.ts"]);
  assert.equal(gitView.readText("README.md"), "committed README\n");
  assert.equal(gitView.readText("documentation/active.md"), "committed documentation\n");
  assert.equal(gitView.readText("src/entry.ts"), "export const committed = true;\n");
  assert.equal(gitView.exists("documentation/untracked.md"), false);
  assert.equal(gitView.isFile("documentation/untracked.md"), false);
  assert.equal(gitView.isDirectory("documentation"), true);
  assert.deepEqual(gitView.rootFiles(), ["README.md"]);
  assert.deepEqual(gitView.rootDirectories(), ["documentation", "src"]);
  assert.deepEqual(gitView.listPathsUnder("documentation"), ["documentation/active.md"]);

  const filesystemView = createFilesystemRepositoryView(root);
  assert.equal(filesystemView.readText("README.md"), "dirty README\n");
  assert.equal(filesystemView.exists("documentation/untracked.md"), true);
});

test("Git repository view opens trees above 64 MiB and reads blobs lazily from the commit", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-repository-view-lazy-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  execFileSync("git", ["init", "-q"], { cwd: root });
  const largeContent = Buffer.alloc(65 * 1024 * 1024, 65);
  writeFile(root, "large.bin", largeContent);
  writeFile(root, "src/entry.ts", "export const committed = true;\n");
  execFileSync("git", ["add", "--", "."], { cwd: root });
  execFileSync("git", [
    "-c", "user.name=Codex test", "-c", "user.email=codex-test",
    "commit", "-qm", "lazy blobs",
  ], { cwd: root });
  const ref = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

  writeFile(root, "src/entry.ts", "dirty = true;\n");
  writeFile(root, "untracked.ts", "export const untracked = true;\n");

  const gitView = createGitRepositoryView(ref, root);
  assert.equal(gitView.exists("large.bin"), true);
  assert.equal(gitView.readText("src/entry.ts"), "export const committed = true;\n");
  assert.equal(gitView.readBinary("large.bin").length, largeContent.length);
  assert.equal(gitView.exists("untracked.ts"), false);
  assert.equal(gitView.readText("src/entry.ts"), "export const committed = true;\n");
});
