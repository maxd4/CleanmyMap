import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { afterEach, describe, it } from "node:test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB_SOURCE = join(ROOT, "apps", "web", "src");
const STRESS_DIR = join(WEB_SOURCE, "..", ".next-codex-guard-stress");
const QUICK_SENTINEL = join(WEB_SOURCE, "components", "cmm-quick-guard-sentinel.ts");
const QUICK_TEST_SENTINEL = join(WEB_SOURCE, "components", "cmm-quick-guard-sentinel.test.ts");
const SECRET_SENTINEL = join(WEB_SOURCE, "__codex-secret-audit-sentinel.ts");
const CLEAN_SENTINEL = join(WEB_SOURCE, "__codex-secret-audit-clean-sentinel.ts");
const STAGED_QUICK_SENTINEL = join(WEB_SOURCE, "components", "ui", "__codex-staged-dialog.test.ts");
const DIRTY_ROUTE_SENTINEL = join(WEB_SOURCE, "app", "api", "route", "recommend", "__codex-dirty-route.test.ts");
const STAGED_SECRET_SENTINEL = join(WEB_SOURCE, "components", "ui", "__codex-staged-secret.ts");
const DIRTY_SECRET_SENTINEL = join(WEB_SOURCE, "app", "api", "route", "recommend", "__codex-dirty-secret.ts");
const POWER_SHELL_COMMAND = process.platform === "win32" ? "powershell.exe" : "pwsh";

function runPowerShell(scriptPath, args = [], envOverrides = {}, cwd = ROOT) {
  return spawnSync(
    POWER_SHELL_COMMAND,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...envOverrides },
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

function runNode(scriptPath, args = [], envOverrides = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...envOverrides },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });
}

function runGit(args, env) {
  const result = spawnSync("git", args, { cwd: ROOT, env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function runGitAt(cwd, args, env = process.env) {
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function withoutCandidateGitEnvironment(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function withAlternateIndex(callback) {
  const indexRoot = mkdtempSync(join(tmpdir(), "cleanmymap-guard-index-"));
  const env = { ...process.env, GIT_INDEX_FILE: join(indexRoot, "index") };
  try {
    runGit(["read-tree", "HEAD"], env);
    return callback(env);
  } finally {
    rmSync(indexRoot, { recursive: true, force: true });
  }
}

function createNpmStub() {
  const binRoot = mkdtempSync(join(tmpdir(), "cleanmymap-guard-bin-"));
  if (process.platform === "win32") {
    writeFileSync(join(binRoot, "npm.cmd"), "@echo off\r\nexit /b 0\r\n");
  } else {
    const npmPath = join(binRoot, "npm");
    writeFileSync(npmPath, "#!/bin/sh\nexit 0\n");
    chmodSync(npmPath, 0o755);
  }
  return binRoot;
}

function createLoggingNpmStub() {
  const binRoot = mkdtempSync(join(tmpdir(), "cleanmymap-guard-npm-log-"));
  writeFileSync(
    join(binRoot, "npm-stub.cjs"),
    `const fs = require("node:fs");
const args = process.argv.slice(2);
fs.writeFileSync(process.env.CMM_GUARD_NPM_LOG, JSON.stringify(args), "utf8");
const failOn = process.env.CMM_GUARD_NPM_FAIL_ARG;
process.exit(failOn && args.includes(failOn) ? 1 : 0);
`,
    "utf8",
  );
  if (process.platform === "win32") {
    writeFileSync(
      join(binRoot, "npm.cmd"),
      "@echo off\r\nnode \"%~dp0npm-stub.cjs\" %*\r\nexit /b %errorlevel%\r\n",
      "utf8",
    );
  } else {
    const npmPath = join(binRoot, "npm");
    writeFileSync(npmPath, "#!/bin/sh\nexec node \"$(dirname \"$0\")/npm-stub.cjs\" \"$@\"\n", "utf8");
    chmodSync(npmPath, 0o755);
  }
  return { binRoot, logPath: join(binRoot, "npm-args.json") };
}

function readLoggedNpmArgs(logPath) {
  return JSON.parse(readFileSync(logPath, "utf8"));
}

function createStressFixture() {
  mkdirSync(STRESS_DIR, { recursive: true });
  for (let index = 0; index < 1500; index += 1) {
    writeFileSync(join(STRESS_DIR, `chunk-${index}.js`), "export const generated = true;\n");
  }
}

function createQuickCheckFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cleanmymap-quick-guard-"));
  mkdirSync(join(fixtureRoot, "scripts", "checks"), { recursive: true });
  mkdirSync(join(fixtureRoot, "apps", "web", "src", "components"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".gitignore"), ".next-codex-guard-stress/\nnode_modules/\n");
  writeFileSync(
    join(fixtureRoot, "scripts", "checks", "check_changed_quick.ps1"),
    readFileSync(join(ROOT, "scripts", "checks", "check_changed_quick.ps1"), "utf8"),
  );
  const fixtureEnv = withoutCandidateGitEnvironment();
  runGitAt(fixtureRoot, ["init", "-q"], fixtureEnv);
  runGitAt(fixtureRoot, ["config", "user.email", "codex.invalid"], fixtureEnv);
  runGitAt(fixtureRoot, ["config", "user.name", "Codex"], fixtureEnv);
  runGitAt(fixtureRoot, ["add", "."], fixtureEnv);
  runGitAt(fixtureRoot, ["commit", "-qm", "fixture baseline"], fixtureEnv);
  return fixtureRoot;
}

function cleanupFixtures() {
  for (const file of [
    QUICK_SENTINEL,
    QUICK_TEST_SENTINEL,
    SECRET_SENTINEL,
    CLEAN_SENTINEL,
    STAGED_QUICK_SENTINEL,
    DIRTY_ROUTE_SENTINEL,
    STAGED_SECRET_SENTINEL,
    DIRTY_SECRET_SENTINEL,
  ]) {
    if (existsSync(file)) rmSync(file, { force: true });
  }
  if (existsSync(STRESS_DIR)) rmSync(STRESS_DIR, { recursive: true, force: true });
}

afterEach(cleanupFixtures);

describe("generated artifact guard boundaries", { concurrency: 1 }, () => {
  it("ignores a large generated tree while retaining an untracked source and test", () => {
    const fixtureRoot = createQuickCheckFixture();
    const binRoot = createNpmStub();
    try {
      const sourceSentinel = join(fixtureRoot, "apps", "web", "src", "components", "cmm-quick-guard-sentinel.ts");
      const testSentinel = join(fixtureRoot, "apps", "web", "src", "components", "cmm-quick-guard-sentinel.test.ts");
      const generatedRoot = join(fixtureRoot, "apps", "web", ".next-codex-guard-stress");
      mkdirSync(generatedRoot, { recursive: true });
      writeFileSync(join(generatedRoot, "chunk.js"), "export const generated = true;\n");
      writeFileSync(sourceSentinel, "export const quickGuardSentinel = true;\n");
      writeFileSync(
        testSentinel,
        'import { describe, expect, it } from "vitest";\ndescribe("guard sentinel", () => it("passes", () => expect(true).toBe(true)));\n',
      );

      const result = runPowerShell(
        join(fixtureRoot, "scripts", "checks", "check_changed_quick.ps1"),
        [],
        withoutCandidateGitEnvironment({ PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}` }),
        fixtureRoot,
      );
      const output = `${result.stdout}\n${result.stderr}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /changed total: 2/);
      assert.match(output, /changed web test files: 1/);
      assert.doesNotMatch(output, /\.next-codex-guard-stress/);
      assert.doesNotMatch(output, /too long|longueur de commande/i);
    } finally {
      rmSync(binRoot, { recursive: true, force: true });
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("keeps detecting a real untracked source secret without scanning the cache", () => {
    createStressFixture();
    const fakeClerkSecret = ["sk", "test", "abcdefghijklmnopqrst"].join("_");
    writeFileSync(SECRET_SENTINEL, `const clerkSecret = "${fakeClerkSecret}"; // Clerk\n`);

    const result = runNode(join(ROOT, "scripts", "checks", "secret-audit.mjs"), ["--no-allowlist"]);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 1, output);
    assert.match(output, /Clerk secret key/);
    assert.doesNotMatch(output, new RegExp(fakeClerkSecret));
    assert.doesNotMatch(output, /ENOBUFS/);
  });

  it("completes the audit with an untracked TypeScript source and no secret", () => {
    createStressFixture();
    writeFileSync(CLEAN_SENTINEL, "export const cleanAuditSentinel = true;\n");

    const result = runNode(join(ROOT, "scripts", "checks", "secret-audit.mjs"));
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /ENOBUFS/);
    assert.match(output, /no probable secret found/i);
  });

  it("uses only the staged candidate for quick checks", () => {
    writeFileSync(STAGED_QUICK_SENTINEL, "describe(\"staged dialog\", () => {});\n");
    writeFileSync(DIRTY_ROUTE_SENTINEL, "describe(\"dirty route\", () => {});\n");
    const binRoot = createNpmStub();

    try {
      const stagedRelative = STAGED_QUICK_SENTINEL.slice(ROOT.length + 1).replaceAll("\\", "/");
      const result = withAlternateIndex((env) => {
        runGit(["add", "--", stagedRelative], env);
        return runPowerShell(
          join(ROOT, "scripts", "checks", "check_changed_quick.ps1"),
          ["-StagedOnly"],
          { ...env, PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}` },
        );
      });
      const output = `${result.stdout}\n${result.stderr}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /scope: STAGED/);
      assert.match(output, /changed total: 1/);
      assert.match(output, /changed web source files: 1/);
      assert.match(output, /changed web test files: 1/);
      assert.doesNotMatch(output, /dirty route/);
    } finally {
      rmSync(binRoot, { recursive: true, force: true });
    }
  });

  it("passes only staged files to direct ESLint for an ordinary shared index", () => {
    const fixtureRoot = createQuickCheckFixture();
    const { binRoot, logPath } = createLoggingNpmStub();
    try {
      const candidate = join(fixtureRoot, "apps", "web", "src", "components", "candidate.ts");
      const foreign = join(fixtureRoot, "apps", "web", "src", "components", "foreign.ts");
      writeFileSync(candidate, "export const candidate = true;\n");
      writeFileSync(foreign, "export const foreign = true;\n");
      runGitAt(fixtureRoot, ["add", "--", "apps/web/src/components/candidate.ts"]);

      const result = runPowerShell(
        join(fixtureRoot, "scripts", "checks", "check_changed_quick.ps1"),
        ["-StagedOnly"],
        {
          ...withoutCandidateGitEnvironment(),
          PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}`,
          CMM_GUARD_NPM_LOG: logPath,
        },
        fixtureRoot,
      );
      const output = `${result.stdout}\n${result.stderr}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /changed total: 1/);
      const args = readLoggedNpmArgs(logPath);
      assert.deepEqual(args, [
        "exec",
        "--",
        "eslint",
        "--max-warnings=0",
        "--config",
        "apps/web/eslint.config.mjs",
        "apps/web/src/components/candidate.ts",
      ]);
      assert.equal(args.includes("run"), false);
      assert.equal(args.includes("lint"), false);
      assert.equal(args.includes("apps/web/src/components/foreign.ts"), false);
    } finally {
      rmSync(binRoot, { recursive: true, force: true });
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("uses a temporary candidate index instead of foreign staged files", () => {
    const fixtureRoot = createQuickCheckFixture();
    const { binRoot, logPath } = createLoggingNpmStub();
    const indexRoot = mkdtempSync(join(tmpdir(), "cleanmymap-guard-candidate-index-"));
    try {
      const candidate = join(fixtureRoot, "apps", "web", "src", "components", "candidate.ts");
      const foreign = join(fixtureRoot, "apps", "web", "src", "components", "foreign.ts");
      writeFileSync(candidate, "export const candidate = true;\n");
      writeFileSync(foreign, "export const foreign = true;\n");
      runGitAt(fixtureRoot, ["add", "--", "apps/web/src/components/foreign.ts"]);

      const env = {
        ...withoutCandidateGitEnvironment({
          PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}`,
          CMM_GUARD_NPM_LOG: logPath,
        }),
        GIT_INDEX_FILE: join(indexRoot, "index"),
      };
      runGitAt(fixtureRoot, ["read-tree", "HEAD"], env);
      runGitAt(fixtureRoot, ["add", "--", "apps/web/src/components/candidate.ts"], env);

      const result = runPowerShell(
        join(fixtureRoot, "scripts", "checks", "check_changed_quick.ps1"),
        ["-StagedOnly"],
        env,
        fixtureRoot,
      );
      const output = `${result.stdout}\n${result.stderr}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /changed total: 1/);
      const args = readLoggedNpmArgs(logPath);
      assert.equal(args.includes("apps/web/src/components/candidate.ts"), true);
      assert.equal(args.includes("apps/web/src/components/foreign.ts"), false);
    } finally {
      rmSync(binRoot, { recursive: true, force: true });
      rmSync(indexRoot, { recursive: true, force: true });
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("fails when ESLint fails for a candidate and ignores a failing foreign file", () => {
    const fixtureRoot = createQuickCheckFixture();
    const { binRoot, logPath } = createLoggingNpmStub();
    const indexRoot = mkdtempSync(join(tmpdir(), "cleanmymap-guard-failure-index-"));
    try {
      const candidate = join(fixtureRoot, "apps", "web", "src", "components", "candidate.ts");
      const foreign = join(fixtureRoot, "apps", "web", "src", "components", "foreign.ts");
      writeFileSync(candidate, "export const candidate = true;\n");
      writeFileSync(foreign, "export const foreign = true;\n");

      const candidateEnv = {
        ...withoutCandidateGitEnvironment({
          PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}`,
          CMM_GUARD_NPM_LOG: logPath,
          CMM_GUARD_NPM_FAIL_ARG: "apps/web/src/components/candidate.ts",
        }),
        GIT_INDEX_FILE: join(indexRoot, "candidate-index"),
      };
      runGitAt(fixtureRoot, ["read-tree", "HEAD"], candidateEnv);
      runGitAt(fixtureRoot, ["add", "--", "apps/web/src/components/candidate.ts"], candidateEnv);
      const candidateResult = runPowerShell(
        join(fixtureRoot, "scripts", "checks", "check_changed_quick.ps1"),
        ["-StagedOnly"],
        candidateEnv,
        fixtureRoot,
      );
      assert.notEqual(candidateResult.status, 0);
      assert.match(`${candidateResult.stdout}\n${candidateResult.stderr}`, /eslint \(changed web files\) failed/);

      const foreignEnv = {
        ...withoutCandidateGitEnvironment({
          PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}`,
          CMM_GUARD_NPM_LOG: logPath,
          CMM_GUARD_NPM_FAIL_ARG: "apps/web/src/components/foreign.ts",
        }),
        GIT_INDEX_FILE: join(indexRoot, "foreign-index"),
      };
      runGitAt(fixtureRoot, ["read-tree", "HEAD"], foreignEnv);
      runGitAt(fixtureRoot, ["add", "--", "apps/web/src/components/candidate.ts"], foreignEnv);
      const foreignResult = runPowerShell(
        join(fixtureRoot, "scripts", "checks", "check_changed_quick.ps1"),
        ["-StagedOnly"],
        foreignEnv,
        fixtureRoot,
      );
      assert.equal(foreignResult.status, 0, `${foreignResult.stdout}\n${foreignResult.stderr}`);
      assert.equal(readLoggedNpmArgs(logPath).includes("apps/web/src/components/foreign.ts"), false);
    } finally {
      rmSync(binRoot, { recursive: true, force: true });
      rmSync(indexRoot, { recursive: true, force: true });
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("keeps the exact temporary index across the full pre-commit guard", () => {
    const candidate = join(WEB_SOURCE, "components", "ui", "__codex-pre-commit-index.ts");
    const indexRoot = mkdtempSync(join(tmpdir(), "cleanmymap-precommit-index-"));
    const env = {
      ...withoutCandidateGitEnvironment(),
      GIT_INDEX_FILE: join(indexRoot, "index"),
    };
    try {
      writeFileSync(candidate, "export const preCommitCandidate = true;\n");
      runGit(["read-tree", "HEAD"], env);
      runGit(["add", "--", candidate.slice(ROOT.length + 1).replaceAll("\\", "/")], env);
      const result = runPowerShell(join(ROOT, "scripts", "ci", "pre_commit_guard.ps1"), [], env);
      const output = `${result.stdout}\n${result.stderr}`;
      assert.equal(result.status, 0, output);
      assert.match(output, /staged canonical workspace sentinels/);
      assert.match(output, /changed total: 1/);
      assert.match(output, /staged readable typography/);
      assert.match(output, /staged secret audit/);
      assert.match(output, /staged Supabase migration history/);
      assert.match(output, /staged diff check/);
      assert.match(output, /Pre-commit guardrail passed/);
    } finally {
      rmSync(candidate, { force: true });
      rmSync(indexRoot, { recursive: true, force: true });
    }
  });

  it("scans staged secret content and ignores a dirty foreign secret", () => {
    const fakeClerkSecret = ["sk", "test", "abcdefghijklmnopqrst"].join("_");
    writeFileSync(STAGED_SECRET_SENTINEL, `const stagedClerkSecret = "${fakeClerkSecret}"; // Clerk\n`);
    writeFileSync(DIRTY_SECRET_SENTINEL, `const dirtyClerkSecret = "${fakeClerkSecret}"; // Clerk\n`);
    const stagedRelative = STAGED_SECRET_SENTINEL.slice(ROOT.length + 1).replaceAll("\\", "/");

    const result = withAlternateIndex((env) => {
      runGit(["add", "--", stagedRelative], env);
      return runNode(
        join(ROOT, "scripts", "checks", "secret-audit.mjs"),
        ["--no-allowlist", "--staged-only"],
        env,
      );
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 1, output);
    assert.match(output, /__codex-staged-secret\.ts/);
    assert.match(output, /Clerk secret key/);
    assert.doesNotMatch(output, /__codex-dirty-secret\.ts/);
    assert.doesNotMatch(output, new RegExp(fakeClerkSecret));
  });

  it("scans the committed ref without reading a dirty secret", () => {
    const fakeClerkSecret = ["sk", "test", "zyxwvutsrqponmlkjihg"].join("_");
    writeFileSync(DIRTY_SECRET_SENTINEL, `const dirtyClerkSecret = "${fakeClerkSecret}"; // Clerk\n`);

    const result = runNode(join(ROOT, "scripts", "checks", "secret-audit.mjs"), ["--ref=HEAD"]);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /__codex-dirty-secret\.ts/);
    assert.match(output, /no probable secret found/i);
  });
});
