#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const virtualEnvironmentPython = process.platform === "win32"
  ? join(root, "maintenance", "python", ".venv", "Scripts", "python.exe")
  : join(root, "maintenance", "python", ".venv", "bin", "python");
const python = existsSync(virtualEnvironmentPython)
  ? virtualEnvironmentPython
  : (process.platform === "win32" ? "python.exe" : "python3");

const result = spawnSync(
  python,
  ["-m", "pytest", "-q", "maintenance/python/tests", ...process.argv.slice(2)],
  { stdio: "inherit", cwd: root, windowsHide: true },
);

if (result.error) {
  console.error(`Python test runner unavailable: ${result.error.message}`);
  process.exitCode = 2;
} else {
  process.exitCode = result.status ?? 2;
}
