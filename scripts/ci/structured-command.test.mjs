import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const powershell = process.platform === "win32" ? "powershell" : "pwsh";
const parserPath = path.join(repositoryRoot, "scripts", "ci", "structured-command.ps1");
const ANSI_ESCAPE_SEQUENCE = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function normalizePowerShellOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(ANSI_ESCAPE_SEQUENCE, "");
}

function powerShellOrSkip(t) {
  const probe = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
  });
  if (probe.error) {
    t.skip("PowerShell is unavailable on this host");
    return false;
  }
  return true;
}

function invokeParser(command) {
  const script = [
    `. '${parserPath.replaceAll("'", "''")}'`,
    "$result = ConvertTo-StructuredInvocation -CommandLine $env:STRUCTURED_COMMAND_TEST_INPUT",
    "$result | Select-Object Executable, Arguments | ConvertTo-Json -Compress",
  ].join("; ");

  return spawnSync(
    powershell,
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, STRUCTURED_COMMAND_TEST_INPUT: command },
    },
  );
}

test("run_focus passes literal spaces and control characters as one argument", (t) => {
  if (!powerShellOrSkip(t)) {
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
  if (!powerShellOrSkip(t)) {
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
  assert.match(normalizePowerShellOutput(result), /exactly one invocation/);
  assert.doesNotMatch(result.stdout, /forged/);
});

test("structured parser accepts literal command options without changing their spelling", (t) => {
  if (!powerShellOrSkip(t)) {
    return;
  }

  const result = invokeParser("tool -NoProfile --flag --flag=value");

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    Executable: "tool",
    Arguments: ["-NoProfile", "--flag", "--flag=value"],
  });
});

test("structured parser rejects variables, subexpressions, and attached parameter expressions", (t) => {
  if (!powerShellOrSkip(t)) {
    return;
  }

  for (const command of [
    "tool $env:UNTRUSTED",
    "tool $(Get-Location)",
    "tool -flag:$env:UNTRUSTED",
    "tool -flag:$(Get-Location)",
  ]) {
    const result = invokeParser(command);
    assert.notEqual(result.status, 0, command);
    const output = normalizePowerShellOutput(result);
    assert.doesNotMatch(output, /"Executable"\s*:/, command);
    assert.match(output, /not\s+allowed|literal\s+option/);
  }
});

test("run_focus keeps the documented npm --prefix command contract parseable without running build", (t) => {
  if (!powerShellOrSkip(t)) {
    return;
  }

  const documentedCommand = "npm.cmd --prefix apps/web run build";
  const parserResult = invokeParser(documentedCommand);
  const runFocus = fs.readFileSync(path.join(repositoryRoot, "scripts", "ci", "run_focus.ps1"), "utf8");

  assert.equal(parserResult.status, 0, parserResult.stderr);
  assert.deepEqual(JSON.parse(parserResult.stdout), {
    Executable: "npm.cmd",
    Arguments: ["--prefix", "apps/web", "run", "build"],
  });
  assert.match(runFocus, /npm\.cmd --prefix apps\/web run build/);

  const runFocusResult = spawnSync(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      path.join(repositoryRoot, "scripts", "ci", "run_focus.ps1"),
      "-Command",
      `${powershell} -NoProfile -Command "Write-Output run_focus-option-contract"`,
      "-IncludeRegex",
      "run_focus-option-contract",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  assert.equal(runFocusResult.status, 0, runFocusResult.stderr);
  assert.match(runFocusResult.stdout, /run_focus-option-contract/);
});

test("both CI helpers use the structured parser instead of Invoke-Expression", () => {
  const runFocus = fs.readFileSync(path.join(repositoryRoot, "scripts", "ci", "run_focus.ps1"), "utf8");
  const runChecks = fs.readFileSync(path.join(repositoryRoot, "scripts", "ci", "run_checks2.ps1"), "utf8");

  assert.doesNotMatch(runFocus, /Invoke-Expression/);
  assert.doesNotMatch(runChecks, /Invoke-Expression/);
  assert.match(runFocus, /ConvertTo-StructuredInvocation/);
  assert.match(runChecks, /ConvertTo-StructuredInvocation/);
});
