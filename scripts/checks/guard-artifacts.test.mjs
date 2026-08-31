import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB_SOURCE = join(ROOT, "apps", "web", "src");
const STRESS_DIR = join(WEB_SOURCE, "..", ".next-codex-guard-stress");
const QUICK_SENTINEL = join(WEB_SOURCE, "__codex-quick-guard-sentinel.ts");
const QUICK_TEST_SENTINEL = join(WEB_SOURCE, "__codex-quick-guard-sentinel.test.ts");
const SECRET_SENTINEL = join(WEB_SOURCE, "__codex-secret-audit-sentinel.ts");
const CLEAN_SENTINEL = join(WEB_SOURCE, "__codex-secret-audit-clean-sentinel.ts");

function runPowerShell(scriptPath) {
  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  );
}

function runNode(scriptPath, args = []) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });
}

function getChangedFiles() {
  const commands = [
    ["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD", "--"],
    ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--"],
    [
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      ".",
      ":(exclude,glob)**/.next-codex-*/**",
      ":(exclude,glob).artifacts/apps-web-node_modules-incomplete-0830/**",
    ],
  ];

  return new Set(
    commands.flatMap((args) => {
      const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.split(/\r?\n/).filter(Boolean);
    }),
  );
}

function createStressFixture() {
  mkdirSync(STRESS_DIR, { recursive: true });
  for (let index = 0; index < 1500; index += 1) {
    writeFileSync(join(STRESS_DIR, `chunk-${index}.js`), "export const generated = true;\n");
  }
}

function cleanupFixtures() {
  for (const file of [QUICK_SENTINEL, QUICK_TEST_SENTINEL, SECRET_SENTINEL, CLEAN_SENTINEL]) {
    if (existsSync(file)) rmSync(file, { force: true });
  }
  if (existsSync(STRESS_DIR)) rmSync(STRESS_DIR, { recursive: true, force: true });
}

afterEach(cleanupFixtures);

describe("generated artifact guard boundaries", { concurrency: 1 }, () => {
  it("ignores a large generated tree while retaining an untracked source and test", () => {
    const baselineChangedFiles = getChangedFiles();
    const baselineWebSourceCount = [...baselineChangedFiles].filter(
      (file) => /^apps\/web\/.*\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) && !file.endsWith(".d.ts"),
    ).length;
    const baselineWebTestCount = [...baselineChangedFiles].filter(
      (file) => /^apps\/web\/.*\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file),
    ).length;

    createStressFixture();
    writeFileSync(QUICK_SENTINEL, "export const quickGuardSentinel = true;\n");
    writeFileSync(
      QUICK_TEST_SENTINEL,
      'import { describe, expect, it } from "vitest";\ndescribe("guard sentinel", () => it("passes", () => expect(true).toBe(true)));\n',
    );

    const result = runPowerShell(join(ROOT, "scripts", "checks", "check_changed_quick.ps1"));
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.match(output, new RegExp(`changed web source files: ${baselineWebSourceCount + 2}`));
    assert.match(output, new RegExp(`changed web test files: ${baselineWebTestCount + 1}`));
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
});
