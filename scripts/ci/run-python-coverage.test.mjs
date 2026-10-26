import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { pythonCoverageCommands, resolvePythonExecutable, runPythonCoverage } from "./run-python-coverage.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("Python coverage prefers the declared Windows virtual environment", () => {
  const executable = resolvePythonExecutable({
    platform: "win32",
    root,
    fileExists: (candidate) => candidate.endsWith(path.join(".venv", "Scripts", "python.exe")),
  });
  assert.equal(executable, path.join(root, "maintenance", "python", ".venv", "Scripts", "python.exe"));
});

test("Python coverage prefers the declared POSIX virtual environment", () => {
  const executable = resolvePythonExecutable({
    platform: "linux",
    root,
    fileExists: (candidate) => candidate.endsWith(path.join(".venv", "bin", "python")),
  });
  assert.equal(executable, path.join(root, "maintenance", "python", ".venv", "bin", "python"));
});

test("Python coverage falls back to the configured CI interpreter when no local environment exists", () => {
  assert.equal(resolvePythonExecutable({ platform: "linux", root, fileExists: () => false }), "python");
});

test("Python coverage delegates to the locked coverage and pytest modules", () => {
  const commands = pythonCoverageCommands({ pythonExecutable: "python-test" });
  assert.deepEqual(commands[0], {
    executable: "python-test",
    args: [
      "-m", "coverage", "run", "--branch",
      "--source=maintenance/python/src,maintenance/python/scripts",
      "--data-file=maintenance/python/.coverage.sonar",
      "-m", "pytest", "-q", "maintenance/python/tests",
    ],
  });
  assert.deepEqual(commands[1], {
    executable: "python-test",
    args: ["-m", "coverage", "xml", "--data-file=maintenance/python/.coverage.sonar", "-o", "maintenance/python/coverage.xml"],
  });
});

test("Python coverage runs both reports before publication", () => {
  const calls = [];
  const spawn = (executable, args) => {
    calls.push({ executable, args });
    return { status: 0 };
  };
  assert.equal(runPythonCoverage({ spawn, pythonExecutable: "python-test", nodeExecutable: "node-test" }), 0);
  assert.deepEqual(calls, [
    { executable: "python-test", args: pythonCoverageCommands({ pythonExecutable: "python-test" })[0].args },
    { executable: "python-test", args: pythonCoverageCommands({ pythonExecutable: "python-test" })[1].args },
    { executable: "node-test", args: ["scripts/checks/write-coverage-publication-proof.mjs", "--scope=python"] },
  ]);
});
