import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBackendEnvironment, REQUIRED_LOCAL_ENV_KEYS, runDoctor } from "./backend-doctor.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const fixtureRoots = [];

const completeLocalEnv = [
  "NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-anon-key",
  "SUPABASE_SERVICE_ROLE_KEY=fixture-service-key",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture",
  "CLERK_SECRET_KEY=sk_test_fixture",
].join("\n");

function createFixture({ localEnv = completeLocalEnv, vercelEnv = null, links = true } = {}) {
  const validationRoot = join(repoRoot, ".artifacts", "validation");
  mkdirSync(validationRoot, { recursive: true });
  const appRoot = mkdtempSync(join(validationRoot, "backend-doctor-fixture-"));
  fixtureRoots.push(appRoot);

  writeFileSync(join(appRoot, ".env.local"), localEnv, "utf8");
  if (vercelEnv !== null) {
    writeFileSync(join(appRoot, ".env.vercel.local"), vercelEnv, "utf8");
  }
  if (links) {
    mkdirSync(join(appRoot, ".vercel"), { recursive: true });
    mkdirSync(join(appRoot, "supabase", ".temp"), { recursive: true });
    writeFileSync(join(appRoot, ".vercel", "project.json"), "{}\n", "utf8");
    writeFileSync(join(appRoot, "supabase", ".temp", "linked-project.json"), "{}\n", "utf8");
  }

  return appRoot;
}

afterEach(() => {
  while (fixtureRoots.length > 0) {
    rmSync(fixtureRoots.pop(), { recursive: true, force: true });
  }
});

describe("backend-doctor", () => {
  it("valide une fixture complète avec .env.local uniquement", () => {
    const appRoot = createFixture({
      vercelEnv: REQUIRED_LOCAL_ENV_KEYS.map((key) => `${key}=ignored-fixture-value`).join("\n"),
    });

    const report = checkBackendEnvironment(appRoot);

    assert.deepEqual(report.checks, {
      vercelLinked: true,
      supabaseLinked: true,
      localEnvHasRequired: true,
      localEnvHasValidRequired: true,
    });
    assert.deepEqual(report.missingLocal, []);
    assert.deepEqual(report.invalidLocal, []);
    assert.equal("pulledVercelEnvHasRequired" in report.checks, false);
  });

  it("signale les clés manquantes sans utiliser .env.vercel.local comme repli", () => {
    const appRoot = createFixture({
      localEnv: "",
      vercelEnv: completeLocalEnv,
      links: false,
    });

    const report = checkBackendEnvironment(appRoot);
    const serialized = JSON.stringify(report);

    assert.deepEqual(report.missingLocal, REQUIRED_LOCAL_ENV_KEYS);
    assert.deepEqual(report.invalidLocal, []);
    assert.equal(report.checks.vercelLinked, false);
    assert.equal(report.checks.supabaseLinked, false);
    assert.equal(report.checks.localEnvHasRequired, false);
    assert.equal(report.checks.localEnvHasValidRequired, false);
    assert.equal(serialized.includes("ignored-fixture-value"), false);
    assert.equal(serialized.includes("fixture-service-key"), false);
    assert.equal(readFileSync(join(appRoot, ".env.vercel.local"), "utf8"), completeLocalEnv);
  });

  it("distingue une URL mal formée des autres clés manquantes", () => {
    const appRoot = createFixture({
      localEnv: [
        "NEXT_PUBLIC_SUPABASE_URL=not-a-url",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY=",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture",
        "CLERK_SECRET_KEY=sk_test_fixture",
      ].join("\n"),
    });

    const report = checkBackendEnvironment(appRoot);

    assert.deepEqual(report.missingLocal, ["SUPABASE_SERVICE_ROLE_KEY"]);
    assert.deepEqual(report.invalidLocal, ["NEXT_PUBLIC_SUPABASE_URL"]);
    assert.equal(report.checks.localEnvHasRequired, false);
    assert.equal(report.checks.localEnvHasValidRequired, false);
  });

  it("refuse les clés Clerk de production pour le runtime localhost", () => {
    const appRoot = createFixture({
      localEnv: completeLocalEnv
        .replace("pk_test_fixture", "pk_live_fixture")
        .replace("sk_test_fixture", "sk_live_fixture"),
    });

    const report = checkBackendEnvironment(appRoot);

    assert.deepEqual(report.missingLocal, []);
    assert.deepEqual(report.invalidLocal, [
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
    ]);
    assert.equal(report.checks.localEnvHasValidRequired, false);
  });

  it("normalise les valeurs entre guillemets avant de vérifier leur forme", () => {
    const appRoot = createFixture({
      localEnv: completeLocalEnv
        .replace("https://fixture.supabase.co", '"https://fixture.supabase.co"')
        .replace("SUPABASE_SERVICE_ROLE_KEY=fixture-service-key", 'SUPABASE_SERVICE_ROLE_KEY="fixture-service-key"'),
    });

    const report = checkBackendEnvironment(appRoot);

    assert.deepEqual(report.missingLocal, []);
    assert.deepEqual(report.invalidLocal, []);
    assert.equal(report.checks.localEnvHasValidRequired, true);
  });

  it("retourne un code d'échec et un rapport sans valeurs sensibles", () => {
    const appRoot = createFixture({ localEnv: "NEXT_PUBLIC_SUPABASE_URL=not-a-url\n" });
    const output = [];

    const exitCode = runDoctor({ appRoot, log: (value) => output.push(value) });

    assert.equal(exitCode, 1);
    assert.equal(output.length, 1);
    assert.match(output[0], /missingLocal/);
    assert.doesNotMatch(output[0], /fixture-service-key|sk_test_fixture/);
  });
});
