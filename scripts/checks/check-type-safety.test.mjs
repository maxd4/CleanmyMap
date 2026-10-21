import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { analyzeTypeSafetySources } from "./check-type-safety.mjs";

function fixtureProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-type-safety-"));
  const sourcePath = path.join(root, "fixture.ts");
  const source = `
async function floating(): Promise<void> {
  Promise.resolve();
}

async function handled(): Promise<string> {
  return await Promise.resolve("ok");
}

function misused(condition: Promise<boolean>): boolean {
  if (condition) return true;
  [1].forEach(async () => { await Promise.resolve(); });
  return false;
}

function unsafe(): string {
  const raw: any = JSON.parse("{}");
  const assigned: string = raw;
  raw.value;
  raw();
  return raw;
}

function documentedFireAndForget(): void {
  // fire-and-forget -- the caller intentionally does not await telemetry
  void Promise.resolve();
}

function undocumentedFireAndForget(): void {
  void Promise.resolve();
}

// @ts-expect-error -- fixture intentionally exercises a documented exception
const documentedException: string = 1;

// @ts-ignore
const undocumentedSuppression: string = 2;
`;
  fs.writeFileSync(sourcePath, source, "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", noEmit: true }, include: ["fixture.ts"] }), "utf8");
  return { root, sourcePath, source };
}

function fixtureFile(project, workspace = "mobile") {
  return {
    path: "fixture.ts",
    absolutePath: project.sourcePath,
    source: project.source,
    workspace,
    tracked: false,
    gitStatus: "",
    fixture: true,
  };
}

test("détecte TYPE_SAFETY et ASYNC_SAFETY sans confondre une promesse attendue", async () => {
  const project = fixtureProject();
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [fixtureFile(project)],
      projects: [{ workspace: "mobile", workspaceRoot: process.cwd(), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: [
        "@typescript-eslint/no-floating-promises",
        "@typescript-eslint/no-misused-promises",
        "@typescript-eslint/no-unsafe-assignment",
        "@typescript-eslint/no-unsafe-member-access",
        "@typescript-eslint/no-unsafe-call",
        "@typescript-eslint/no-unsafe-return",
        "@typescript-eslint/no-explicit-any",
      ] }],
    });
    const ruleIds = new Set(report.findings.map((finding) => finding.ruleId));
    assert.equal(report.status, "PASS");
    assert.equal(report.diagnostics.length, 0);
    assert.ok(ruleIds.has("@typescript-eslint/no-floating-promises"));
    assert.ok(ruleIds.has("@typescript-eslint/no-misused-promises"));
    assert.ok(ruleIds.has("@typescript-eslint/no-explicit-any"));
    assert.ok(ruleIds.has("@typescript-eslint/no-unsafe-assignment"));
    assert.ok(ruleIds.has("@typescript-eslint/no-unsafe-member-access"));
    assert.ok(ruleIds.has("@typescript-eslint/no-unsafe-call"));
    assert.ok(ruleIds.has("@typescript-eslint/no-unsafe-return"));
    assert.equal(report.exceptions.length, 2);
    assert.ok(report.exceptions.every((exception) => exception.documentedException));
    assert.ok(report.findings.some((finding) => finding.ruleId === "@typescript-eslint/no-floating-promises"));
    assert.ok(report.findings.some((finding) => finding.ruleId === "typescript/ignore"));
    assert.ok(report.findings.every((finding) => finding.line >= 1 && finding.column >= 1));
    assert.ok(report.findings.every((finding) => finding.status === "FIXTURE"));
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("une fixture linéaire et correctement attendue reste propre", async () => {
  const project = fixtureProject();
  project.source = `
async function clean(): Promise<number> {
  const value = await Promise.resolve(1);
  return value;
}
`;
  fs.writeFileSync(project.sourcePath, project.source, "utf8");
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [fixtureFile(project)],
      projects: [{ workspace: "mobile", workspaceRoot: process.cwd(), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: [
        "@typescript-eslint/no-floating-promises", "@typescript-eslint/no-misused-promises", "@typescript-eslint/no-unsafe-assignment", "@typescript-eslint/no-unsafe-member-access", "@typescript-eslint/no-unsafe-call", "@typescript-eslint/no-unsafe-return", "@typescript-eslint/no-explicit-any",
      ] }],
    });
    assert.equal(report.status, "PASS");
    assert.equal(report.diagnostics.length, 0);
    assert.equal(report.findings.length, 0);
    assert.equal(report.summary.findingsByFamily.TYPE_SAFETY, 0);
    assert.equal(report.summary.findingsByFamily.ASYNC_SAFETY, 0);
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("refuse une couverture Web lorsque TypeScript est hors peer range", async () => {
  const project = fixtureProject();
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [fixtureFile(project, "web")],
      projects: [{ workspace: "web", workspaceRoot: path.join(process.cwd(), "apps/web"), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: ["@typescript-eslint/no-unsafe-assignment"] }],
    });
    assert.equal(report.status, "FAIL");
    assert.equal(report.measurementStatus, "MEASUREMENT_FAILED");
    assert.equal(report.coverage[0].effectiveCoverage, "UNSUPPORTED_CONFIGURATION");
    assert.equal(report.summary.filesMeasured, 0);
    assert.equal(report.diagnostics[0].code, "UNSUPPORTED_TYPESCRIPT_VERSION");
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});
