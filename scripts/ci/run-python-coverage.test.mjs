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
  assert.equal(runPythonCoverage({ spawn, pythonExecutable: "python-test", nodeExecutable: "node-test", candidateIdentity: () => null }), 0);
  assert.deepEqual(calls, [
    { executable: "python-test", args: pythonCoverageCommands({ pythonExecutable: "python-test" })[0].args },
    { executable: "python-test", args: pythonCoverageCommands({ pythonExecutable: "python-test" })[1].args },
    { executable: "node-test", args: ["scripts/checks/write-coverage-publication-proof.mjs", "--scope=python"] },
  ]);
});

test("Python coverage stops before XML and publication when pytest fails", () => {
  const calls = [];
  const spawn = (executable, args) => {
    calls.push({ executable, args });
    return { status: 3 };
  };

  assert.equal(runPythonCoverage({ spawn, pythonExecutable: "python-test", nodeExecutable: "node-test", candidateIdentity: () => null }), 3);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    executable: "python-test",
    args: pythonCoverageCommands({ pythonExecutable: "python-test" })[0].args,
  });
});

test("Python coverage reports a missing interpreter without publishing partial evidence", () => {
  const calls = [];
  const spawn = (executable, args) => {
    calls.push({ executable, args });
    return { status: null, error: new Error("interpreter unavailable") };
  };

  assert.equal(runPythonCoverage({ spawn, pythonExecutable: "missing-python", nodeExecutable: "node-test", candidateIdentity: () => null }), 1);
  assert.equal(calls.length, 1);
});

test("Python coverage stops before publication when XML generation fails", () => {
  const calls = [];
  const spawn = (executable, args) => {
    calls.push({ executable, args });
    return { status: calls.length === 1 ? 0 : 4 };
  };

  assert.equal(runPythonCoverage({ spawn, pythonExecutable: "python-test", nodeExecutable: "node-test", candidateIdentity: () => null }), 4);
  assert.equal(calls.length, 2);
});

test("Python coverage propagates a publication failure", () => {
  const calls = [];
  const spawn = (executable, args) => {
    calls.push({ executable, args });
    return { status: calls.length === 3 ? 7 : 0 };
  };

  assert.equal(runPythonCoverage({ spawn, pythonExecutable: "python-test", nodeExecutable: "node-test", candidateIdentity: () => null }), 7);
  assert.equal(calls.length, 3);
});

test("Python coverage stops before instrumentation when the declared candidate is dirty", () => {
  let spawnCalls = 0;
  const result = runPythonCoverage({
    spawn: () => {
      spawnCalls += 1;
      return { status: 0 };
    },
    candidateIdentity: () => {
      throw new Error("dirty relevant source");
    },
    pythonExecutable: "python-test",
    nodeExecutable: "node-test",
  });
  assert.equal(result, 1);
  assert.equal(spawnCalls, 0);
});

test("Python coverage carries the verified candidate identity through publication", () => {
  const calls = [];
  const identity = {
    version: 1,
    method: "git-tree-v1",
    candidateSha: "a".repeat(40),
    candidateScope: "CI_CANDIDATE",
    scope: "python",
    sourceTreeSha: "b".repeat(40),
    relevantDirtyFiles: [],
    verified: true,
  };
  const spawn = (executable, args, options) => {
    calls.push({ executable, args, options });
    return { status: 0 };
  };
  assert.equal(runPythonCoverage({ spawn, candidateIdentity: () => identity, pythonExecutable: "python-test", nodeExecutable: "node-test" }), 0);
  assert.equal(JSON.parse(calls[2].options.env.CMM_COVERAGE_CANDIDATE_IDENTITY).sourceTreeSha, identity.sourceTreeSha);
});
