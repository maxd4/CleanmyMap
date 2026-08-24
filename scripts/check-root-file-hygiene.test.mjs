import test from "node:test";
import assert from "node:assert/strict";

import {
  findForbiddenTrackedPaths,
  localOnlyTrackedPrefixes,
} from "./check-root-file-hygiene.mjs";

test("local-only tracking guard rejects backups, scratch and Codex attachments", () => {
  assert.deepEqual(localOnlyTrackedPrefixes, [
    "backups/",
    "scratch/",
    ".codex-remote-attachments/",
  ]);

  assert.deepEqual(
    findForbiddenTrackedPaths([
      "README.md",
      "backups/example.json",
      "scratch/tool.py",
      ".codex-remote-attachments/session/image.jpg",
      "scripts/check-root-file-hygiene.mjs",
    ]),
    [
      "backups/example.json",
      "scratch/tool.py",
      ".codex-remote-attachments/session/image.jpg",
    ],
  );
});
