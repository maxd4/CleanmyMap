import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertSafeDirectoryRoot, assertSafeExternalPath, resolvePathWithinRoot } from "./safe-paths.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-safe-paths-"));
  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports", "report.json"), "{}\n", "utf8");
  return root;
}

test("accepts a real root and a confined relative artifact", () => {
  const root = fixture();
  try {
    assert.equal(assertSafeDirectoryRoot(root), root);
    assert.equal(resolvePathWithinRoot(root, "reports/report.json"), path.join(root, "reports", "report.json"));
    assert.equal(assertSafeExternalPath(root), root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects traversal and absolute paths at a relative boundary", () => {
  const root = fixture();
  try {
    assert.throws(() => resolvePathWithinRoot(root, "../outside.json"), /escapes its .* root/);
    assert.throws(() => resolvePathWithinRoot(root, path.resolve(root, "outside.json")), /escapes its .* root/);
    assert.throws(() => assertSafeExternalPath(`${root}/../outside.json`), /traversal/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects symlinked roots and entries before filesystem access", (t) => {
  const root = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-safe-paths-outside-"));
  try {
    const linkedRoot = path.join(root, "linked-root");
    const linkedEntry = path.join(root, "reports", "linked.json");
    try {
      fs.symlinkSync(root, linkedRoot, "junction");
      fs.symlinkSync(path.join(outside, "outside.json"), linkedEntry, "file");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }
    assert.throws(() => assertSafeDirectoryRoot(linkedRoot), /symbolic-link|redirected/);
    assert.throws(() => resolvePathWithinRoot(root, "reports/linked.json"), /symbolic-link/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
