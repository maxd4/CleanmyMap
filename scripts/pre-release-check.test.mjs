import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import { runPreReleaseCheck } from "./pre-release-check.mjs";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmm-pre-release-"));
const previousCwd = process.cwd();

try {
  fs.mkdirSync(path.join(tempDir, "apps/web/src/components", "nested"), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, "apps/web/src/components", "nested", "SecretWidget.tsx"),
    `'use client'\nexport const secret = "PRIVATE_KEY";\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(tempDir, "apps/web/src/components", "nested", "ServerWidget.tsx"),
    `export const serverValue = "PRIVATE_KEY";\n`,
    "utf8",
  );

  process.chdir(tempDir);

  const issues = runPreReleaseCheck();

  assert.equal(issues, 1);
} finally {
  process.chdir(previousCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
}
