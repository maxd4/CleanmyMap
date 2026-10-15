import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  cleanLocalTemp,
  collectCandidates,
  removeCandidate,
} from "./clean-local-temp.mjs";

function makeFixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-temp-test-"));
}

function removeFixtureRoot(root) {
  fs.rmSync(root, { recursive: true, force: true });
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
