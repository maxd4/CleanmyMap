import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createFilesystemRepositoryView,
  createGitRepositoryView,
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
