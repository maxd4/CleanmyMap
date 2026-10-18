import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  cleanLocalTemp,
  collectCandidates,
  hasActiveEditorProcesses,
  removeCandidate,
  resolvePowerShellExecutable,
} from "./clean-local-temp.mjs";

function makeFixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-temp-test-"));
}

function removeFixtureRoot(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function privateQuarantineParent() {
  return path.join(os.homedir(), ".cleanmymap", "temp-cleanup");
}

function listPrivateQuarantineDirectories() {
  const parent = privateQuarantineParent();
  if (!fs.existsSync(parent)) {
    return [];
  }

  return fs.readdirSync(parent)
    .filter((entry) => entry.startsWith("run-"))
    .map((entry) => path.join(parent, entry));
}

function removePrivateQuarantineDirectories(directories) {
  for (const directory of directories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("cleans only old allowlisted entries directly under the fixture root", async () => {
  const root = makeFixtureRoot();
  const outside = path.join(path.dirname(root), `${path.basename(root)}-outside.txt`);
  const safeFile = path.join(root, "codex-clipboard-safe.png");

  try {
    fs.writeFileSync(safeFile, "fixture", "utf8");
    fs.writeFileSync(outside, "must survive", "utf8");

    await cleanLocalTemp({
      root,
      force: true,
      now: Date.now() + 1_000,
      activeEditorProcesses: false,
      log: () => {},
    });

    assert.equal(fs.existsSync(safeFile), false);
    assert.equal(fs.readFileSync(outside, "utf8"), "must survive");
  } finally {
    removeFixtureRoot(root);
    fs.rmSync(outside, { force: true });
  }
});

test("ignores a symlinked allowlisted entry and refuses a symlinked root", async (t) => {
  const root = makeFixtureRoot();
  const outside = makeFixtureRoot();
  const linkedEntry = path.join(root, "node-compile-cache");
  const linkedRoot = `${root}-link`;

  try {
    try {
      fs.symlinkSync(outside, linkedEntry, "junction");
      fs.symlinkSync(root, linkedRoot, "junction");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }

    const result = await collectCandidates({ root, force: true });
    assert.deepEqual(result.candidates, []);
    await assert.rejects(
      () => collectCandidates({ root: linkedRoot, force: true }),
      /unsafe temporary root|redirected temporary root/,
    );
    assert.equal(fs.existsSync(outside), true);
  } finally {
    removeFixtureRoot(root);
    removeFixtureRoot(outside);
    fs.rmSync(linkedRoot, { recursive: true, force: true });
  }
});

test("rejects a candidate that escapes the direct-child boundary", async () => {
  const root = makeFixtureRoot();
  const outside = path.join(path.dirname(root), `${path.basename(root)}-escape.txt`);

  try {
    fs.writeFileSync(outside, "must survive", "utf8");
    await assert.rejects(
      () => removeCandidate(root, {
        kind: "file",
        name: "codex-clipboard-escape.png",
        fullPath: outside,
      }),
      /outside the temporary root/,
    );
    assert.equal(fs.readFileSync(outside, "utf8"), "must survive");
  } finally {
    removeFixtureRoot(root);
    fs.rmSync(outside, { force: true });
  }
});

test("rejects relative traversal paths before opening or mutating them", async () => {
  const root = makeFixtureRoot();
  const outside = path.join(path.dirname(root), `${path.basename(root)}-relative-escape.txt`);

  try {
    fs.writeFileSync(outside, "must survive", "utf8");
    await assert.rejects(
      () => removeCandidate(root, {
        kind: "file",
        name: "codex-clipboard-relative.png",
        fullPath: path.join(root, "..", path.basename(outside)),
      }),
      /outside the temporary root/,
    );
    assert.equal(fs.readFileSync(outside, "utf8"), "must survive");
  } finally {
    removeFixtureRoot(root);
    fs.rmSync(outside, { force: true });
  }
});

test("ignores recent allowlisted entries", async () => {
  const root = makeFixtureRoot();
  const file = path.join(root, "codex-clipboard-recent.png");

  try {
    fs.writeFileSync(file, "fixture", "utf8");
    const result = await collectCandidates({ root, now: Date.now(), force: false });
    assert.deepEqual(result.candidates, []);
    assert.equal(fs.existsSync(file), true);
  } finally {
    removeFixtureRoot(root);
  }
});

test("rejects a candidate whose type changes before removal", async () => {
  const root = makeFixtureRoot();
  const candidatePath = path.join(root, "codex-clipboard-type-change.png");

  try {
    fs.writeFileSync(candidatePath, "fixture", "utf8");
    const { candidates } = await collectCandidates({ root, force: true, now: Date.now() + 1_000 });
    fs.rmSync(candidatePath);
    fs.mkdirSync(candidatePath);

    await assert.rejects(
      () => removeCandidate(root, candidates[0]),
      /changed type before cleanup/,
    );
    assert.equal(fs.existsSync(candidatePath), true);
  } finally {
    removeFixtureRoot(root);
  }
});

test("does not follow a concurrent symlink substitution", async () => {
  const root = makeFixtureRoot();
  const outside = makeFixtureRoot();
  const candidatePath = path.join(root, "codex-clipboard-race.png");
  const outsidePath = path.join(outside, "keep.txt");

  try {
    fs.writeFileSync(candidatePath, "fixture", "utf8");
    fs.writeFileSync(outsidePath, "must survive", "utf8");
    const { candidates } = await collectCandidates({ root, force: true, now: Date.now() + 1_000 });

    await assert.rejects(
      () => removeCandidate(root, candidates[0], {
        beforeRename: async () => {
          fs.rmSync(candidatePath);
          try {
            fs.symlinkSync(outside, candidatePath, "junction");
          } catch (error) {
            if (error.code === "EPERM" || error.code === "EACCES") {
              return;
            }
            throw error;
          }
        },
      }),
      /changed identity|ENOENT|no such file/i,
    );
    assert.equal(fs.readFileSync(outsidePath, "utf8"), "must survive");
  } finally {
    removeFixtureRoot(root);
    removeFixtureRoot(outside);
  }
});

test("refuses a concurrent replacement with a different file identity", async () => {
  const root = makeFixtureRoot();
  const candidatePath = path.join(root, "codex-clipboard-identity.png");
  const quarantineBefore = new Set(listPrivateQuarantineDirectories());

  try {
    fs.writeFileSync(candidatePath, "original", "utf8");
    const { candidates } = await collectCandidates({ root, force: true, now: Date.now() + 1_000 });

    await assert.rejects(
      () => removeCandidate(root, candidates[0], {
        beforeRename: async () => {
          fs.rmSync(candidatePath);
          fs.writeFileSync(candidatePath, "replacement", "utf8");
        },
      }),
      /changed identity/,
    );

    const quarantineDirectory = listPrivateQuarantineDirectories()
      .find((directory) => !quarantineBefore.has(directory));
    assert.ok(quarantineDirectory);
    assert.equal(
      fs.readFileSync(path.join(quarantineDirectory, "codex-clipboard-identity.png"), "utf8"),
      "replacement",
    );
  } finally {
    removeFixtureRoot(root);
    removePrivateQuarantineDirectories(
      listPrivateQuarantineDirectories().filter((directory) => !quarantineBefore.has(directory)),
    );
  }
});

test("does not delete a directory substituted with a junction between validation and rename", async (t) => {
  const root = makeFixtureRoot();
  const outside = makeFixtureRoot();
  const candidatePath = path.join(root, "node-compile-cache");
  const outsidePath = path.join(outside, "keep.txt");
  let junctionCreated = false;
  const quarantineBefore = new Set(listPrivateQuarantineDirectories());

  try {
    fs.mkdirSync(candidatePath);
    fs.writeFileSync(path.join(candidatePath, "original.txt"), "original", "utf8");
    fs.writeFileSync(outsidePath, "must survive", "utf8");
    const { candidates } = await collectCandidates({
      root,
      force: true,
      activeEditorProcesses: false,
      now: Date.now() + 1_000,
    });

    await assert.rejects(
      () => removeCandidate(root, candidates[0], {
        beforeRename: async () => {
          fs.rmSync(candidatePath, { recursive: true, force: false });
          try {
            fs.symlinkSync(outside, candidatePath, "junction");
            junctionCreated = true;
          } catch (error) {
            if (error.code !== "EPERM" && error.code !== "EACCES") {
              throw error;
            }
          }
        },
      }),
      /changed identity|ENOENT|no such file/i,
    );

    if (!junctionCreated) {
      t.skip("junction fixtures unavailable on this platform");
    }
    assert.equal(fs.readFileSync(outsidePath, "utf8"), "must survive");
    assert.equal(fs.existsSync(path.join(outside, "original.txt")), false);
  } finally {
    removeFixtureRoot(root);
    removeFixtureRoot(outside);
    removePrivateQuarantineDirectories(
      listPrivateQuarantineDirectories().filter((directory) => !quarantineBefore.has(directory)),
    );
  }
});

test("fails closed when the candidate disappears between validation and rename", async () => {
  const root = makeFixtureRoot();
  const candidatePath = path.join(root, "codex-clipboard-missing.png");

  try {
    fs.writeFileSync(candidatePath, "fixture", "utf8");
    const { candidates } = await collectCandidates({ root, force: true, now: Date.now() + 1_000 });

    await assert.rejects(
      () => removeCandidate(root, candidates[0], {
        beforeRename: async () => {
          fs.rmSync(candidatePath);
        },
      }),
      /ENOENT|no such file/i,
    );
    assert.equal(fs.existsSync(candidatePath), false);
  } finally {
    removeFixtureRoot(root);
  }
});

test("propagates EPERM without deleting the candidate on POSIX", async (t) => {
  if (process.platform === "win32") {
    t.skip("Windows ACLs do not provide a portable chmod-based EPERM fixture");
    return;
  }

  const root = makeFixtureRoot();
  const candidatePath = path.join(root, "codex-clipboard-permission.png");

  try {
    fs.writeFileSync(candidatePath, "fixture", "utf8");
    const { candidates } = await collectCandidates({ root, force: true, now: Date.now() + 1_000 });
    fs.chmodSync(root, 0o500);

    await assert.rejects(
      () => removeCandidate(root, candidates[0]),
      /EACCES|EPERM|permission denied/i,
    );
  } finally {
    fs.chmodSync(root, 0o700);
    assert.equal(fs.readFileSync(candidatePath, "utf8"), "fixture");
    removeFixtureRoot(root);
  }
});

test("resolves PowerShell only from the trusted Windows system directory", () => {
  assert.equal(
    resolvePowerShellExecutable({ platform: "win32", env: { SystemRoot: "C:\\Windows" } }),
    path.win32.join("C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
  );
  assert.equal(
    resolvePowerShellExecutable({ platform: "win32", env: { SystemRoot: "C:/Windows" } }),
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  );
  assert.equal(resolvePowerShellExecutable({ platform: "win32", env: { SystemRoot: "Windows" } }), null);
  assert.equal(resolvePowerShellExecutable({ platform: "win32", env: { SystemRoot: "C:Windows" } }), null);
  assert.equal(resolvePowerShellExecutable({ platform: "win32", env: {} }), null);
  assert.equal(resolvePowerShellExecutable({ platform: "linux", env: { SystemRoot: "C:\\Windows" } }), null);
});

test("keeps editor protection fail-closed for missing, invalid or ambiguous PowerShell results", () => {
  assert.equal(hasActiveEditorProcesses({ platform: "win32", env: {}, spawn: () => { throw new Error("not called"); } }), true);
  assert.equal(hasActiveEditorProcesses({ platform: "linux", env: {}, spawn: () => { throw new Error("not called"); } }), true);

  const options = { platform: "win32", env: { SystemRoot: "C:\\Windows" } };
  assert.equal(hasActiveEditorProcesses({ ...options, spawn: () => ({ status: 0, stdout: "0" }) }), false);
  assert.equal(hasActiveEditorProcesses({ ...options, spawn: () => ({ status: 0, stdout: "2" }) }), true);

  for (const stdout of ["", "not-a-number", "2 processes", "0x2", "2.0", "-1"]) {
    assert.equal(
      hasActiveEditorProcesses({ ...options, spawn: () => ({ status: 0, stdout }) }),
      true,
      `ambiguous PowerShell output must keep cleanup blocked: ${JSON.stringify(stdout)}`,
    );
  }

  assert.equal(
    hasActiveEditorProcesses({
      ...options,
      spawn: () => ({ error: new Error("missing"), status: null, stdout: "0" }),
    }),
    true,
  );
  assert.equal(
    hasActiveEditorProcesses({ ...options, spawn: () => { throw new Error("launch failed"); } }),
    true,
  );
});
