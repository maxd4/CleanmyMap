import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { isTrustedGitPath, resolveGitExecutable } from "./git-executable.mjs";

test("accepts the fixed Windows Git installation path without consulting PATH", () => {
  assert.equal(isTrustedGitPath("C:\\Program Files\\Git\\cmd\\git.exe", "win32"), true);
  assert.equal(isTrustedGitPath("C:\\Users\\attacker\\bin\\git.exe", "win32"), false);
  assert.equal(resolveGitExecutable({
    platform: "win32",
    candidates: ["C:\\Users\\attacker\\bin\\git.exe", "C:\\Program Files\\Git\\cmd\\git.exe"],
    fileExists: () => true,
  }), "C:\\Program Files\\Git\\cmd\\git.exe");
});

test("accepts only known system Git locations on POSIX", () => {
  assert.equal(isTrustedGitPath("/usr/bin/git", "linux"), true);
  assert.equal(isTrustedGitPath("/tmp/attacker/git", "linux"), false);
  assert.throws(
    () => resolveGitExecutable({ platform: "linux", candidates: ["/tmp/attacker/git"], fileExists: () => true }),
    /PATH is intentionally not used/,
  );
});

test("ignores a hostile PATH instead of resolving its Git binary", () => {
  const hostileRoot = mkdtempSync(path.join(os.tmpdir(), "cleanmymap-hostile-path-"));
  const fakeGit = path.join(hostileRoot, process.platform === "win32" ? "git.cmd" : "git");
  writeFileSync(fakeGit, process.platform === "win32" ? "@echo attacker\r\n" : "#!/bin/sh\necho attacker\n");
  if (process.platform !== "win32") chmodSync(fakeGit, 0o755);

  try {
    const repositoryRoot = path.resolve(import.meta.dirname, "../..");
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import("./scripts/ci/git-executable.mjs").then(({ gitExecutable }) => process.stdout.write(gitExecutable()))',
      ],
      {
        cwd: repositoryRoot,
        env: { ...process.env, PATH: hostileRoot },
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /hostile-path/);
    assert.doesNotMatch(result.stdout, /attacker/);
    assert.match(result.stdout, process.platform === "win32" ? /Program Files\\Git/i : /\/(?:usr|opt|bin)\//);
  } finally {
    rmSync(hostileRoot, { recursive: true, force: true });
  }
});
