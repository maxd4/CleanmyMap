import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { runPreflight } from "./vercel-deploy-preflight.mjs";

function createFixture({ functions = [], links = [], sensitive = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "cmm-vercel-preflight-"));
  const appRoot = join(root, "apps", "web");
  const outputRoot = join(appRoot, ".vercel", "output");
  mkdirSync(join(appRoot, ".vercel"), { recursive: true });
  mkdirSync(join(outputRoot, "functions"), { recursive: true });
  writeFileSync(join(appRoot, ".vercelignore"), ".next/\nnode_modules/\nartifacts/\n");
  writeFileSync(
    join(appRoot, ".vercel", "project.json"),
    JSON.stringify({ settings: { rootDirectory: "apps/web" } }),
  );
  writeFileSync(join(appRoot, "vercel.json"), JSON.stringify({ ignoreCommand: "node scripts/ignored-build-step.mjs" }));

  for (const name of functions) {
    mkdirSync(join(outputRoot, "functions", name), { recursive: true });
  }
  for (const name of links) {
    mkdirSync(join(outputRoot, "targets", name), { recursive: true });
    try {
      symlinkSync(join(outputRoot, "targets", name), join(outputRoot, "functions", name), "junction");
    } catch (error) {
      rmSync(root, { recursive: true, force: true });
      throw error;
    }
  }
  if (sensitive) {
    writeFileSync(join(appRoot, ".vercel", ".env.production.local"), "STRIPE_SECRET_KEY=[SENSITIVE]\n");
  }
  return root;
}

test("source preflight accepts the canonical monorepo setup", () => {
  const root = createFixture();
  try {
    const result = runPreflight({ repoRoot: root, mode: "source" });
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("prebuilt preflight rejects Windows symlinks and Hobby overage", () => {
  const root = createFixture({ functions: Array.from({ length: 13 }, (_, index) => `route-${index}.func`), links: ["linked.func"] });
  try {
    const result = runPreflight({ repoRoot: root, mode: "prebuilt", plan: "hobby" });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /lien\(s\) symbolique\(s\)/);
    assert.match(result.errors.join("\n"), /limite Hobby/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("prebuilt preflight rejects redacted production environment values", () => {
  const root = createFixture({ sensitive: true });
  try {
    const result = runPreflight({ repoRoot: root, mode: "prebuilt", plan: "pro" });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /placeholders \[SENSITIVE\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
