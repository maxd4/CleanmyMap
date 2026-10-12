import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

function runQuizAudit(scriptName) {
  const executable = process.platform === "win32" && fs.existsSync(npmCli) ? process.execPath : "npm";
  const argumentsList = process.platform === "win32" && executable === process.execPath
    ? [npmCli, "run", scriptName]
    : ["run", scriptName];

  return spawnSync(executable, argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    windowsHide: true,
  });
}

test("quiz quality audit runs from the repository root", () => {
  const result = runQuizAudit("audit:quiz-quality");
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, output);
  assert.doesNotMatch(output, /ERR_MODULE_NOT_FOUND|Cannot find package ['"]@\/lib/);
});

test("quiz source audit runs from the repository root", () => {
  const result = runQuizAudit("audit:quiz-sources");
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, output);
  assert.doesNotMatch(output, /ERR_MODULE_NOT_FOUND|Cannot find package ['"]@\/lib/);
});
