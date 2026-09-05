import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const checkerPath = path.join(repoRoot, "scripts", "checks", "check-env-contract.mjs");
const fixtureRoots = [];

const template = [
  "NEXT_PUBLIC_APP_URL=http://localhost:3000",
  "CLEANMYMAP_SHEET_URL=https://sheet.example.test",
].join("\n");
const envTs = `const envSchema = z.object({\n  NEXT_PUBLIC_APP_URL: optionalUrl,\n  CLEANMYMAP_SHEET_URL: z.string().optional(),\n});`;
const envDts = `interface ProcessEnv {\n    NEXT_PUBLIC_APP_URL?: string;\n    CLEANMYMAP_SHEET_URL?: string;\n    NODE_ENV?: string;\n}`;

function createFixture(processSource) {
  const root = mkdtempSync(path.join(os.tmpdir(), "cleanmymap-env-contract-fixture-"));
  fixtureRoots.push(root);
  mkdirSync(path.join(root, "apps", "web", "src", "lib"), { recursive: true });
  writeFileSync(path.join(root, "apps", "web", ".env.local.example"), `${template}\n`, "utf8");
  writeFileSync(path.join(root, "apps", "web", "src", "lib", "env.ts"), envTs, "utf8");
  mkdirSync(path.join(root, "apps", "web", "src", "types"), { recursive: true });
  writeFileSync(path.join(root, "apps", "web", "src", "types", "env.d.ts"), envDts, "utf8");
  writeFileSync(path.join(root, "apps", "web", "src", "lib", "fixture.ts"), processSource, "utf8");
  return root;
}

function runChecker(root) {
  try {
    return { status: 0, stdout: execFileSync(process.execPath, [checkerPath, `--root=${root}`], { encoding: "utf8" }) };
  } catch (error) {
    return { status: error.status, stdout: error.stdout.toString("utf8") };
  }
}

test.afterEach(() => {
  while (fixtureRoots.length > 0) rmSync(fixtureRoots.pop(), { recursive: true, force: true });
});

test("check-env-contract échoue sur une variable statique non déclarée puis passe après restauration", () => {
  const root = createFixture('process.env["CLEANMYMAP_SHEET_URL"]; process.env.CMM_ENV_CONTRACT_FIXTURE;');
  const failed = runChecker(root);

  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /CMM_ENV_CONTRACT_FIXTURE/);
  assert.doesNotMatch(failed.stdout, /sheet\.example\.test/);

  writeFileSync(
    path.join(root, "apps", "web", "src", "lib", "fixture.ts"),
    'process.env["CLEANMYMAP_SHEET_URL"]; process.env.NODE_ENV; process.env.VERCEL_ENV;',
    "utf8",
  );
  const restored = runChecker(root);

  assert.equal(restored.status, 0);
  assert.match(restored.stdout, /"ok": true/);
});

test("allowlist explicitement les variables plateforme et outillage", () => {
  const root = createFixture(
    "process.env.NODE_ENV; process.env.CI; process.env.VERCEL_ENV; process.env.PORT; process.env.SENTRY_CLI_BIN; process.env.SUPABASE_ACCESS_TOKEN;",
  );
  const result = runChecker(root);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /"ok": true/);
});
