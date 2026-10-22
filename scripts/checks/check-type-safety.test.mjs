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

function commentedWithoutVoid(): void {
  // fire-and-forget -- telemetry intentionally detached
  Promise.resolve();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- telemetry is intentionally detached
void Promise.resolve();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
void Promise.resolve();

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
    assert.equal(report.exceptions.length, 3);
    assert.ok(report.exceptions.every((exception) => exception.documentedException));
    assert.ok(report.findings.some((finding) => finding.ruleId === "@typescript-eslint/no-floating-promises"));
    const commentedWithoutVoidLine = project.source.split(/\r?\n/).findIndex((line) => line.includes("fire-and-forget -- telemetry intentionally detached")) + 2;
    assert.ok(report.findings.some((finding) => finding.ruleId === "@typescript-eslint/no-floating-promises" && finding.line === commentedWithoutVoidLine));
    assert.ok(report.findings.some((finding) => finding.ruleId === "typescript/ignore"));
    assert.ok(report.findings.some((finding) => finding.ruleId === "eslint/suppression" && finding.message.includes("sans justification")));
    assert.ok(report.exceptions.some((exception) => exception.ruleId === "eslint/suppression" && exception.reason.includes("telemetry is intentionally detached")));
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

test("préserve la couverture Mobile par fichier malgré une configuration Web incompatible", async () => {
  const project = fixtureProject();
  const mobilePath = path.join(project.root, "mobile.ts");
  const webPath = path.join(project.root, "web.ts");
  const cleanMobile = `async function mobileClean(): Promise<number> { return await Promise.resolve(1); }\n`;
  fs.writeFileSync(mobilePath, cleanMobile, "utf8");
  fs.writeFileSync(webPath, "function webClean(value: any): string { return value; }\n", "utf8");
  fs.writeFileSync(path.join(project.root, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", noEmit: true }, include: ["*.ts"] }), "utf8");
  const baseFile = (sourcePath, filePath, workspace, source) => ({
    path: filePath,
    absolutePath: sourcePath,
    source,
    workspace,
    tracked: true,
    gitStatus: "",
    fixture: true,
  });
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [
        baseFile(webPath, "apps/web/src/web.ts", "web", fs.readFileSync(webPath, "utf8")),
        baseFile(mobilePath, "apps/mobile/mobile.ts", "mobile", cleanMobile),
      ],
      projects: [
        { workspace: "web", workspaceRoot: path.join(process.cwd(), "apps/web"), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: ["@typescript-eslint/no-unsafe-assignment"] },
        { workspace: "mobile", workspaceRoot: process.cwd(), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: ["@typescript-eslint/no-floating-promises", "@typescript-eslint/no-misused-promises"] },
      ],
    });
    const webCoverage = report.coverage.find((entry) => entry.workspace === "web");
    const mobileCoverage = report.coverage.find((entry) => entry.workspace === "mobile");
    assert.equal(report.status, "FAIL");
    assert.equal(webCoverage.effectiveCoverage, "UNSUPPORTED_CONFIGURATION");
    assert.deepEqual(webCoverage.measuredFilePaths, []);
    assert.deepEqual(mobileCoverage.measuredFilePaths, ["apps/mobile/mobile.ts"]);
    assert.deepEqual(report.summary.measuredFilePaths, ["apps/mobile/mobile.ts"]);
    assert.equal(report.summary.filesMeasured, 1);
    assert.equal(report.summary.filesWithTypedCoverage, 1);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === "UNSUPPORTED_TYPESCRIPT_VERSION"));
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("ne déclare pas TYPED un fichier dont le parser échoue", async () => {
  const project = fixtureProject();
  project.source = "function broken( {\n";
  fs.writeFileSync(project.sourcePath, project.source, "utf8");
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [fixtureFile(project)],
      projects: [{ workspace: "mobile", workspaceRoot: process.cwd(), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: ["@typescript-eslint/no-floating-promises"] }],
    });
    const coverage = report.coverage[0];
    assert.equal(report.status, "FAIL");
    assert.equal(report.measurementStatus, "MEASUREMENT_FAILED");
    assert.equal(coverage.filesMeasured, 0);
    assert.deepEqual(coverage.measuredFilePaths, []);
    assert.deepEqual(coverage.failedFilePaths, ["fixture.ts"]);
    assert.equal(coverage.notMeasuredFileReasons["fixture.ts"], "PARSER_FAILED");
    assert.equal(report.summary.filesMeasured, 0);
    assert.equal(report.summary.filesWithTypedCoverage, 0);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === "PARSER_FAILED"));
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("rattache une exception void à l'expression exacte du finding", async () => {
  const project = fixtureProject();
  project.source = `
function sameLine(): void {
  // fire-and-forget -- telemetry intentionally detached
  void Promise.resolve(); Promise.resolve();
}

function adjacentLines(): void {
  // fire-and-forget -- telemetry intentionally detached
  void Promise.resolve();
  Promise.resolve();
}
`;
  fs.writeFileSync(project.sourcePath, project.source, "utf8");
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [fixtureFile(project)],
      projects: [{ workspace: "mobile", workspaceRoot: process.cwd(), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: ["@typescript-eslint/no-floating-promises"] }],
    });
    const floatingFindings = report.findings.filter((finding) => finding.ruleId === "@typescript-eslint/no-floating-promises");
    assert.equal(report.diagnostics.length, 0);
    assert.equal(report.exceptions.length, 2);
    assert.equal(floatingFindings.length, 2);
    assert.ok(floatingFindings.every((finding) => finding.line >= 1 && finding.column >= 1));
    assert.equal(new Set(report.exceptions.map((exception) => exception.line)).size, 2);
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});

test("ne fabrique pas de couverture TYPED pour un fichier ignoré par ESLint", async () => {
  const project = fixtureProject();
  const ignoredPath = path.join(project.root, "ignored.ts");
  fs.writeFileSync(ignoredPath, "Promise.resolve();\n", "utf8");
  try {
    const report = await analyzeTypeSafetySources({
      root: project.root,
      files: [{ path: "ignored.ts", absolutePath: ignoredPath, source: fs.readFileSync(ignoredPath, "utf8"), workspace: "mobile", tracked: true, gitStatus: "" }],
      projects: [{ workspace: "mobile", workspaceRoot: process.cwd(), eslintCwd: project.root, tsconfigPath: path.join(project.root, "tsconfig.json"), ruleIds: ["@typescript-eslint/no-floating-promises"], ignorePatterns: ["**/ignored.ts"] }],
      eslintFactory: () => ({ lintText: async () => [{ ignored: true, messages: [] }] }),
    });
    const coverage = report.coverage[0];
    assert.equal(report.status, "FAIL");
    assert.equal(coverage.filesMeasured, 0);
    assert.deepEqual(coverage.measuredFilePaths, []);
    assert.deepEqual(coverage.ignoredFilePaths, ["ignored.ts"]);
    assert.equal(coverage.notMeasuredFileReasons["ignored.ts"], "ESLINT_IGNORED");
    assert.equal(report.summary.filesWithTypedCoverage, 0);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.code === "ESLINT_IGNORED"));
  } finally {
    fs.rmSync(project.root, { recursive: true, force: true });
  }
});
