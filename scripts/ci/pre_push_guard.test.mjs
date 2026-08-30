import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const GUARD_PATH = join(REPO_ROOT, "scripts", "ci", "pre_push_guard.ps1");
const POLICY_PATH = join(REPO_ROOT, "scripts", "checks", "validation-policy.mjs");
const GUARD_SOURCE = readFileSync(GUARD_PATH, "utf8");
const POLICY_SOURCE = readFileSync(POLICY_PATH, "utf8");

function writeCommandStub(binRoot, name, lines) {
  writeFileSync(
    join(binRoot, `${name}.cmd`),
    ["@echo off", ...lines, "exit /b 0", ""].join("\r\n"),
  );
}

function runGuard({ changedFiles, vercelLinks = [] }) {
  const testRoot = mkdtempSync(join(tmpdir(), "cleanmymap-pre-push-guard-"));
  const scriptsRoot = join(testRoot, "scripts", "ci");
  const checksRoot = join(testRoot, "scripts", "checks");
  const binRoot = join(testRoot, "bin");
  const logPath = join(testRoot, "commands.log");

  mkdirSync(scriptsRoot, { recursive: true });
  mkdirSync(checksRoot, { recursive: true });
  mkdirSync(binRoot, { recursive: true });
  writeFileSync(join(scriptsRoot, "pre_push_guard.ps1"), GUARD_SOURCE);
  writeFileSync(join(checksRoot, "validation-policy.mjs"), POLICY_SOURCE);
  writeCommandStub(binRoot, "npm", ['>>"%GUARD_TEST_LOG%" echo npm %*']);
  writeCommandStub(binRoot, "npx", ['>>"%GUARD_TEST_LOG%" echo npx %*']);
  writeCommandStub(
    binRoot,
    "git",
    changedFiles.map((file) => `echo ${file}`),
  );

  for (const relativePath of vercelLinks) {
    const projectFile = join(testRoot, relativePath);
    mkdirSync(dirname(projectFile), { recursive: true });
    writeFileSync(projectFile, "{}\n");
  }

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
      ],
      {
        cwd: testRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          GUARD_TEST_LOG: logPath,
          PATH: `${binRoot};${process.env.PATH ?? ""}`,
        },
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
      },
    );

    return {
      status: result.status,
      output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
      log: existsSync(logPath) ? readFileSync(logPath, "utf8") : "",
    };
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

function assertCommand(log, command) {
  assert.ok(log.split(/\r?\n/).some((line) => line === command), `missing command: ${command}\n${log}`);
}

function assertNoCommand(log, command) {
  assert.ok(!log.split(/\r?\n/).some((line) => line === command), `unexpected command: ${command}\n${log}`);
}

test("pre-push guard keeps docs checks and skips unrelated web, script, and Supabase gates", () => {
  const result = runGuard({ changedFiles: ["documentation/development/TESTING.md"] });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /\[skip\] web quality gates: no web-relevant changes/);
  assert.match(result.output, /No Vercel project link detected; skipping vercel build\./);
  assertCommand(result.log, "npm run check:doc-visuals");
  assertNoCommand(result.log, "npm run lint");
  assertNoCommand(result.log, "npm run typecheck");
  assertNoCommand(result.log, "npm run build");
  assertNoCommand(result.log, "npm run test:scripts");
  assertNoCommand(result.log, "npm run audit:supabase-migration-trees");
  assertNoCommand(result.log, "npx vercel build --yes");
});

test("pre-push guard applies Supabase gates without forcing a production build", () => {
  const result = runGuard({ changedFiles: ["apps/web/supabase/migrations/20260901000000_example.sql"] });

  assert.equal(result.status, 0, result.output);
  assertCommand(result.log, "npm run audit:supabase-migration-trees");
  assertCommand(result.log, "npm run lint");
  assertCommand(result.log, "npm run typecheck");
  assertNoCommand(result.log, "npm run build");
  assert.match(result.output, /\[skip\] build: changed web scope does not require a production build/);
  assert.match(result.output, /No Vercel project link detected; skipping vercel build\./);
});

test("pre-push guard applies web TypeScript gates and build, while skipping script-only gates", () => {
  const result = runGuard({ changedFiles: ["apps/web/src/lib/example.ts"] });

  assert.equal(result.status, 0, result.output);
  assertCommand(result.log, "npm run lint");
  assertCommand(result.log, "npm run typecheck");
  assertCommand(result.log, "npm run build");
  assertNoCommand(result.log, "npm run check:doc-visuals");
  assertNoCommand(result.log, "npm run test:scripts");
  assertNoCommand(result.log, "npm run audit:supabase-migration-trees");
  assert.match(result.output, /No Vercel project link detected; skipping vercel build\./);
});

test("pre-push guard runs the Vercel build for a Vercel configuration change", () => {
  const result = runGuard({
    changedFiles: ["apps/web/vercel.json"],
    vercelLinks: [".vercel/project.json"],
  });

  assert.equal(result.status, 0, result.output);
  assertCommand(result.log, "npm run build");
  assertCommand(result.log, "npx vercel build --yes");
  assert.match(result.output, /Vercel project link detected:/);
  assert.match(result.output, /- \.vercel\/project\.json/);
});

test("pre-push guard handles a clean clone without project.json", () => {
  const result = runGuard({ changedFiles: ["apps/web/src/lib/example.ts"] });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /No Vercel project link detected; skipping vercel build\./);
  assertNoCommand(result.log, "npx vercel build --yes");
  assert.doesNotMatch(result.output, /Property .*Count.* cannot be found|Count.*does not exist/i);
});
