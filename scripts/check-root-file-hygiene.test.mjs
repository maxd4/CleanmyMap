import test from "node:test";
import assert from "node:assert/strict";

import {
  allowedRootDirectories,
  findForbiddenRootDirectories,
  findForbiddenTrackedPaths,
  localOnlyRootDirectories,
  localOnlyTrackedPrefixes,
  trackedCanonicalRootDirectories,
  trackedTransitionalRootDirectories,
} from "./check-root-file-hygiene.mjs";

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
      "scripts/check-root-file-hygiene.mjs",
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
