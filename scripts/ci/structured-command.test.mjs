import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const powershell = process.platform === "win32" ? "powershell" : "pwsh";

test("run_focus passes literal spaces and control characters as one argument", (t) => {
  if (spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
  }).error) {
    t.skip("PowerShell is unavailable on this host");
    return;
  }

  const command = `Write-Output "safe argument; literal\u001f"`;
  const result = spawnSync(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      path.join(repositoryRoot, "scripts", "ci", "run_focus.ps1"),
      "-Command",
      command,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /safe argument; literal/);
  assert.match(result.stdout, /\u001f/);
});

test("run_focus rejects chained commands before executing any command", (t) => {
  if (spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
  }).error) {
    t.skip("PowerShell is unavailable on this host");
    return;
  }

  const result = spawnSync(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      path.join(repositoryRoot, "scripts", "ci", "run_focus.ps1"),
      "-Command",
      "Write-Output safe; Write-Output forged",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /exactly one invocation/);
  assert.doesNotMatch(result.stdout, /forged/);
});

test("both CI helpers use the structured parser instead of Invoke-Expression", () => {
  const runFocus = fs.readFileSync(path.join(repositoryRoot, "scripts", "ci", "run_focus.ps1"), "utf8");
  const runChecks = fs.readFileSync(path.join(repositoryRoot, "scripts", "ci", "run_checks2.ps1"), "utf8");

  assert.doesNotMatch(runFocus, /Invoke-Expression/);
  assert.doesNotMatch(runChecks, /Invoke-Expression/);
  assert.match(runFocus, /ConvertTo-StructuredInvocation/);
  assert.match(runChecks, /ConvertTo-StructuredInvocation/);
});
