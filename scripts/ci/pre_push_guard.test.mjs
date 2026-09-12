import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const GUARD_PATH = join(REPO_ROOT, "scripts", "ci", "pre_push_guard.ps1");
const POLICY_PATH = join(REPO_ROOT, "scripts", "checks", "validation-policy.mjs");
const GUARD_SOURCE = readFileSync(GUARD_PATH, "utf8");
const POLICY_SOURCE = readFileSync(POLICY_PATH, "utf8");

function withoutCandidateGitEnvironment(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function writeCommandStub(binRoot, name, lines) {
  writeFileSync(
    join(binRoot, `${name}.cmd`),
    ["@echo off", ...lines, "exit /b 0", ""].join("\r\n"),
  );
}

function writeGitStub(binRoot, config) {
  const gitScript = `
const fs = require("node:fs");
const config = ${JSON.stringify(config)};
const args = process.argv.slice(2);
const logPath = process.env.GUARD_TEST_LOG;
if (process.env.GIT_OPTIONAL_LOCKS !== "0") {
  console.error("GIT_OPTIONAL_LOCKS was not propagated to the pre-push Git client");
  process.exit(97);
}
if (logPath) fs.appendFileSync(logPath, \`git \${args.join(" ")}\\n\`);

if (args[0] === "cat-file") process.exit(config.catFileExit ?? 0);
if (args[0] === "merge-base" && args[1] === "--is-ancestor") {
  process.exit(config.ancestorExit ?? 0);
}
if (args[0] === "merge-base") {
  console.log(config.mergeBase ?? "merge-base-sha");
  process.exit(0);
}
if (args[0] === "rev-parse") {
  console.log(config.remoteBase ?? "remote-main-sha");
  process.exit(0);
}
if (args[0] === "diff" && args[1] === "--check") process.exit(0);
if (args[0] === "diff" && args[1] === "--name-only") {
  const range = args.find((arg) => arg.includes("..") && arg !== "--") ?? "";
  const files = config.rangeFiles?.[range] ?? config.manualFiles ?? [];
  process.stdout.write(files.join("\\n"));
  process.exit(0);
}
process.exit(0);
`;
  writeFileSync(join(binRoot, "git-test.cjs"), gitScript);
  writeFileSync(
    join(binRoot, "git.cmd"),
    ["@echo off", 'node "%~dp0git-test.cjs" %*', "exit /b %errorlevel%", ""].join("\r\n"),
  );
}

function runGuard({
  records = [],
  rangeFiles = {},
  manualFiles = [],
  remoteArgs = ["origin", "https://example.invalid/CleanMyMap.git"],
  ancestorExit = 0,
  remoteBase = "remote-main-sha",
  mergeBase = "merge-base-sha",
  foreignLockfile = false,
  foreignWebWorktree = false,
  secretAuditExit = 0,
  catFileExit = 0,
  full = false,
} = {}) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-pre-push-guard-"));
  const scriptsRoot = join(testRoot, "scripts", "ci");
  const checksRoot = join(testRoot, "scripts", "checks");
  const binRoot = join(testRoot, "bin");
  const logPath = join(testRoot, "commands.log");

  mkdirSync(scriptsRoot, { recursive: true });
  mkdirSync(checksRoot, { recursive: true });
  mkdirSync(binRoot, { recursive: true });
  if (foreignLockfile) {
    mkdirSync(join(testRoot, "artifacts", "foreign"), { recursive: true });
    writeFileSync(join(testRoot, "artifacts", "foreign", "package-lock.json"), "{\"name\":\"foreign\"}\n");
  }
  if (foreignWebWorktree) {
    mkdirSync(join(testRoot, "apps", "web", "src"), { recursive: true });
    writeFileSync(join(testRoot, "apps", "web", "src", "foreign-invalid.test.ts"), "this is not valid TypeScript\n");
  }
  writeFileSync(join(scriptsRoot, "pre_push_guard.ps1"), GUARD_SOURCE);
  writeFileSync(join(checksRoot, "validation-policy.mjs"), POLICY_SOURCE);
  writeCommandStub(binRoot, "npm", [
    ...(secretAuditExit === 0
      ? []
      : [`if /I "%~1"=="run" if /I "%~2"=="security:secrets" exit /b ${secretAuditExit}`]),
    '>>"%GUARD_TEST_LOG%" echo npm %*',
  ]);
  writeCommandStub(binRoot, "npx", ['>>"%GUARD_TEST_LOG%" echo npx %*']);
  writeCommandStub(binRoot, "node", [
    'if /I "%~1"=="scripts/checks/validation-policy.mjs" goto :runreal',
    'if /I "%~nx1"=="git-test.cjs" goto :runreal',
    '>>"%GUARD_TEST_LOG%" echo node %*',
    'exit /b 0',
    ':runreal',
    '"%ProgramFiles%\\nodejs\\node.exe" %*',
    'exit /b %errorlevel%',
  ]);
  writeGitStub(binRoot, { rangeFiles, manualFiles, ancestorExit, remoteBase, mergeBase, catFileExit });

  try {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(scriptsRoot, "pre_push_guard.ps1"),
        ...remoteArgs,
        ...(full ? ["-Full"] : []),
      ],
      {
        cwd: testRoot,
        input: records.length > 0 ? `${records.join("\n")}\n` : undefined,
        encoding: "utf8",
        env: withoutCandidateGitEnvironment({
          GUARD_TEST_LOG: logPath,
          PATH: `${binRoot};${process.env.PATH ?? ""}`,
        }),
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
      },
    );

    return {
      status: result.status,
      output: `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${existsSync(logPath) ? readFileSync(logPath, "utf8") : ""}`,
      log: existsSync(logPath) ? readFileSync(logPath, "utf8") : "",
    };
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

function assertCommand(log, command) {
  assert.ok(log.split(/\r?\n/).some((line) => line === command), `missing command: ${command}\n${log}`);
}

function assertCommandPrefix(log, prefix) {
  assert.ok(log.split(/\r?\n/).some((line) => line.startsWith(prefix)), `missing command prefix: ${prefix}\n${log}`);
}

function assertCommandCount(log, command, expected) {
  const count = log.split(/\r?\n/).filter((line) => line === command).length;
  assert.equal(count, expected, `expected ${expected} occurrences of ${command}, got ${count}\n${log}`);
}

function assertNoCommand(log, command) {
  assert.ok(!log.split(/\r?\n/).some((line) => line === command), `unexpected command: ${command}\n${log}`);
}

function candidateCheckCommand(ref, script, extraArguments = []) {
  return [
    "node scripts/ci/run-static-candidate-check.mjs",
    `--ref=${ref}`,
    `--script=${script}`,
    "--",
    ...extraArguments,
    `--ref=${ref}`,
  ].join(" ");
}

function dynamicCandidateCommand(ref, command, commandArguments = [], dependencyMode = "reuse") {
  return [
    "node scripts/ci/run-dynamic-candidate-check.mjs",
    `--ref=${ref}`,
    `--command=${command}`,
    `--dependency-mode=${dependencyMode}`,
    "--",
    ...commandArguments,
  ].join(" ");
}

test("docs-only push ignores a foreign web commit in HEAD", () => {
  const result = runGuard({
    records: ["refs/heads/docs refs/docs-local refs/heads/main refs/docs-remote"],
    rangeFiles: { "refs/docs-remote..refs/docs-local": ["documentation/development/TESTING.md"] },
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /mode = push-protocol/);
  assert.match(result.output, /Quick PUSH_CANDIDATE checks/);
  assertCommand(result.log, candidateCheckCommand("refs/docs-local", "scripts/checks/check-env-contract.mjs"));
  assertCommand(result.log, candidateCheckCommand("refs/docs-local", "scripts/checks/check-canonical-workspaces.mjs"));
  assertCommand(result.log, "npm run security:secrets -- --candidate-ref=refs/docs-local --candidate-range=refs/docs-remote..refs/docs-local");
  assertNoCommand(result.log, "npm run lint");
  assertNoCommand(result.log, "npm run typecheck");
  assertNoCommand(result.log, "npm run build");
  assertNoCommand(result.log, "npm run test:scripts");
  assertNoCommand(result.log, "npm run checks:full");
  assertNoCommand(result.log, "npm run check:doc-visuals");
  assert.match(result.log, /git diff --check refs\/docs-remote\.\.refs\/docs-local --/);
});

test("web push keeps only quick candidate gates by default", () => {
  const result = runGuard({
    records: ["refs/heads/web refs/web-local refs/heads/main refs/web-remote"],
    rangeFiles: { "refs/web-remote..refs/web-local": ["apps/web/src/lib/example.ts"] },
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Pre-push quick guardrail passed/);
  assertCommand(result.log, candidateCheckCommand("refs/web-local", "scripts/checks/check-github-actions-security.mjs"));
  assertCommand(result.log, candidateCheckCommand("refs/web-local", "scripts/checks/check-lockfile-policy.mjs"));
  assertCommand(result.log, "npm run security:secrets -- --candidate-ref=refs/web-local --candidate-range=refs/web-remote..refs/web-local");
  assertCommand(result.log, "git diff --check refs/web-remote..refs/web-local --");
  assertNoCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "lint"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "typecheck"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "build"], "isolated"));
  assertNoCommand(result.log, "npm run test:scripts");
  assertNoCommand(result.log, "scripts/checks/validation-policy.mjs");
  assertNoCommand(result.log, "vercel build");
});

test("web candidate ignores a foreign artifact lockfile during quick checks", () => {
  const result = runGuard({
    foreignLockfile: true,
    foreignWebWorktree: true,
    records: ["refs/heads/web refs/web-local refs/heads/main refs/web-remote"],
    rangeFiles: { "refs/web-remote..refs/web-local": ["apps/web/src/lib/example.ts"] },
  });

  assert.equal(result.status, 0, result.output);
  assertCommandCount(result.log, candidateCheckCommand("refs/web-local", "scripts/checks/check-lockfile-policy.mjs"), 1);
  assertNoCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "lint"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "typecheck"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "build"], "isolated"));
  assert.doesNotMatch(result.output, /foreign-invalid\.test\.ts|artifacts[\\/]foreign[\\/]package-lock\.json/);
});

test("explicit full candidate validation retains the heavy gates", () => {
  const result = runGuard({
    full: true,
    records: ["refs/heads/web refs/web-local refs/heads/main refs/web-remote"],
    rangeFiles: { "refs/web-remote..refs/web-local": ["apps/web/src/lib/example.ts"] },
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Full PUSH_CANDIDATE checks \(-Full\)/);
  assertCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "lint"]));
  assertCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "typecheck"]));
  assertCommand(result.log, dynamicCandidateCommand("refs/web-local", "npm", ["run", "build"], "isolated"));
  assertCommandPrefix(result.log, dynamicCandidateCommand("refs/web-local", "node", [
    "scripts/checks/validation-policy.mjs",
    "--run-vitest",
    "--groups",
    "security,regression",
  ]));
});

test("script push remains quick without dynamic script tests", () => {
  const result = runGuard({
    records: ["refs/heads/scripts refs/scripts-local refs/heads/main refs/scripts-remote"],
    rangeFiles: { "refs/scripts-remote..refs/scripts-local": ["scripts/ci/example.mjs"] },
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Pre-push quick guardrail passed/);
  assertNoCommand(result.log, dynamicCandidateCommand("refs/scripts-local", "npm", ["run", "test:scripts"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/scripts-local", "npm", ["run", "lint"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/scripts-local", "npm", ["run", "typecheck"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/scripts-local", "npm", ["run", "build"]));
});

test("Supabase push keeps the quick candidate path", () => {
  const result = runGuard({
    records: ["refs/heads/db refs/db-local refs/heads/main refs/db-remote"],
    rangeFiles: { "refs/db-remote..refs/db-local": ["apps/web/supabase/migrations/20260901000000_example.sql"] },
  });

  assert.equal(result.status, 0, result.output);
  assertCommand(result.log, candidateCheckCommand("refs/db-local", "scripts/checks/check-canonical-workspaces.mjs"));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/db-local", "npm", ["run", "lint"]));
  assertNoCommand(result.log, dynamicCandidateCommand("refs/db-local", "npm", ["run", "typecheck"]));
  assertNoCommand(result.log, "audit-supabase-migration-trees.mjs");
});

test("multi-ref push validates each exact candidate without heavy gates", () => {
  const result = runGuard({
    records: [
      "refs/heads/docs refs/docs-local refs/heads/main refs/docs-remote",
      "refs/heads/scripts refs/scripts-local refs/heads/main refs/scripts-remote",
    ],
    rangeFiles: {
      "refs/docs-remote..refs/docs-local": ["documentation/development/TESTING.md"],
      "refs/scripts-remote..refs/scripts-local": ["scripts/ci/example.mjs"],
    },
  });

  assert.equal(result.status, 0, result.output);
  assertCommandCount(result.log, candidateCheckCommand("refs/docs-local", "scripts/checks/check-env-contract.mjs"), 1);
  assertCommandCount(result.log, candidateCheckCommand("refs/scripts-local", "scripts/checks/check-env-contract.mjs"), 1);
  assertCommandCount(result.log, "npm run security:secrets -- --candidate-ref=refs/docs-local --candidate-range=refs/docs-remote..refs/docs-local --candidate-ref=refs/scripts-local --candidate-range=refs/scripts-remote..refs/scripts-local", 1);
  assertNoCommand(result.log, "npm run test:scripts");
  assertNoCommand(result.log, "scripts/checks/check-doc-visuals.mjs");
  assertNoCommand(result.log, dynamicCandidateCommand("refs/scripts-local", "npm", ["run", "lint"]));
});

test("ref deletion skips tree validation", () => {
  const result = runGuard({
    records: ["refs/heads/old 0000000000000000000000000000000000000000 refs/heads/main refs/old-remote"],
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /ref delete/);
  assert.match(result.output, /ref deletions only/);
  assertNoCommand(result.log, "npm run checks:full");
});

test("new ref uses an explicit remote-history fallback", () => {
  const result = runGuard({
    records: ["refs/heads/new refs/new-local refs/heads/new 0000000000000000000000000000000000000000"],
    remoteBase: "remote-base",
    mergeBase: "common-base",
    rangeFiles: { "common-base..refs/new-local": ["documentation/development/TESTING.md"] },
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.log, /git diff --check common-base\.\.refs\/new-local --/);
  assertNoCommand(result.log, "npm run checks:full");
});

test("non-fast-forward push stops explicitly", () => {
  const result = runGuard({
    records: ["refs/heads/bad refs/bad-local refs/heads/main refs/bad-remote"],
    ancestorExit: 1,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.output, /PUSH_CANDIDATE non-fast-forward/);
  assertNoCommand(result.log, "npm run lint");
});

test("invalid push candidate stops before static checks", () => {
  const result = runGuard({
    catFileExit: 1,
    records: ["refs/heads/bad refs/bad-local refs/heads/main refs/bad-remote"],
  });

  assert.notEqual(result.status, 0);
  assert.match(result.output, /Local push candidate is not a commit/);
  assertNoCommand(result.log, "npm run security:secrets");
  assertNoCommand(result.log, "run-static-candidate-check.mjs");
});

test("secret detection remains blocking on the quick path", () => {
  const result = runGuard({
    secretAuditExit: 23,
    records: ["refs/heads/secret refs/secret-local refs/heads/main refs/secret-remote"],
    rangeFiles: { "refs/secret-remote..refs/secret-local": ["apps/web/src/lib/example.ts"] },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.output, /secret audit failed with exit code 23/);
  assertNoCommand(result.log, "run-static-candidate-check.mjs");
});

test("manual invocation keeps the documented fallback visible", () => {
  const result = runGuard({
    remoteArgs: [],
    manualFiles: ["documentation/development/TESTING.md"],
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /mode = manual-fallback/);
  assert.match(result.output, /Pre-push quick guardrail passed/);
  assertCommand(result.log, candidateCheckCommand("HEAD", "scripts/checks/check-env-contract.mjs"));
  assertCommand(result.log, "npm run security:secrets -- --candidate-ref=HEAD --candidate-range=remote-main-sha...HEAD");
  assertNoCommand(result.log, "npm run lint");
});
