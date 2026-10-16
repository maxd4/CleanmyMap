import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveGitExecutable } from "../../../scripts/ci/git-executable.mjs";
import { resolveValidationCommand } from "../../../scripts/ci/validation-process.mjs";

const NODE_WIN = "C:\\Program Files\\nodejs\\node.exe";
const NPM_BIN_WIN = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin";

test("resolves npx beside Node on Windows without consulting a hostile PATH", () => {
  const args = ["supabase", "branches", "create", "feature/with spaces", "--project-ref", "ref;not-shell-code"];
  const resolved = resolveValidationCommand(
    { executable: "npx", args },
    "win32",
    NODE_WIN,
    (candidate) => candidate === `${NPM_BIN_WIN}\\npx-cli.js`,
  );

  assert.equal(resolved.executable, NODE_WIN);
  assert.deepEqual(resolved.args, [`${NPM_BIN_WIN}\\npx-cli.js`, ...args]);
  assert.notEqual(resolved.executable, "npx");
  assert.notEqual(resolved.executable, "C:\\hostile\\npx.exe");
});

test("resolves npx on POSIX and preserves argument boundaries", () => {
  const execPath = "/opt/Node JS/bin/node";
  const npxCli = "/opt/Node JS/lib/node_modules/npm/bin/npx-cli.js";
  const args = ["vercel", "env", "add", "KEY", "--value", "value with spaces; $HOME"];
  const resolved = resolveValidationCommand(
    { executable: "npx", args },
    "linux",
    execPath,
    (candidate) => candidate === npxCli,
  );

  assert.equal(resolved.executable, execPath);
  assert.deepEqual(resolved.args, [npxCli, ...args]);
});

test("fails closed when the deterministic npx CLI is absent", () => {
  assert.throws(
    () => resolveValidationCommand({ executable: "npx", args: ["supabase"] }, "win32", NODE_WIN, () => false),
    /HOST_ENVIRONMENT: npx CLI was not found beside Node/,
  );
});

test("resolves Git only from trusted fixed paths despite a hostile candidate", () => {
  const trusted = "C:\\Program Files\\Git\\cmd\\git.exe";
  const resolved = resolveGitExecutable({
    platform: "win32",
    candidates: ["C:\\hostile\\git.exe", trusted],
    fileExists: (candidate) => candidate === trusted,
  });

  assert.equal(resolved, trusted);
});

test("all five Web scripts use structured resolvers instead of shell wrappers", () => {
  const scripts = [
    "supabase-quota-audit-cli.mjs",
    "supabase-performance-advisors.mjs",
    "supabase-preview-branch.mjs",
    "supabase-security-advisors.mjs",
    "vercel-sync-env.mjs",
  ];

  for (const script of scripts) {
    const source = readFileSync(new URL(`./${script}`, import.meta.url), "utf8");
    assert.match(source, /resolveValidationCommand/);
    assert.doesNotMatch(source, /spawnSync\(\s*["'](?:powershell|powershell\.exe|cmd\.exe)["']/);
  }
});
