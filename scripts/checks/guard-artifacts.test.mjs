import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

function runPowerShell(scriptPath, args = [], envOverrides = {}) {
  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
    {
      cwd: ROOT,
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
  writeFileSync(join(binRoot, "npm.cmd"), "@echo off\r\nexit /b 0\r\n");
  return binRoot;
}

function createStressFixture() {
  mkdirSync(STRESS_DIR, { recursive: true });
  for (let index = 0; index < 1500; index += 1) {
    writeFileSync(join(STRESS_DIR, `chunk-${index}.js`), "export const generated = true;\n");
  }
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
    createStressFixture();
    writeFileSync(QUICK_SENTINEL, "export const quickGuardSentinel = true;\n");
    writeFileSync(
      QUICK_TEST_SENTINEL,
      'import { describe, expect, it } from "vitest";\ndescribe("guard sentinel", () => it("passes", () => expect(true).toBe(true)));\n',
    );

    const result = runPowerShell(join(ROOT, "scripts", "checks", "check_changed_quick.ps1"));
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.match(output, /cmm-quick-guard-sentinel\.ts/);
    assert.match(output, /cmm-quick-guard-sentinel\.test\.ts/);
    assert.doesNotMatch(output, /\.next-codex-guard-stress/);
    assert.doesNotMatch(output, /too long|longueur de commande/i);
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
          { ...env, PATH: `${binRoot};${process.env.PATH ?? ""}` },
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
