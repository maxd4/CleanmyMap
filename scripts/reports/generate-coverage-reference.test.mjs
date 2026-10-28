import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
  COVERAGE_SCOPE_FINGERPRINT,
} from "../checks/coverage-policy.mjs";
import {
  computeConfigurationFingerprint,
  computeCoverageEnvironmentFingerprint,
  computeCoverageFileHash,
  computeCoverageSummaryHash,
} from "../checks/coverage-evidence.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";
import {
  addDeficits,
  buildReference,
  metricDeficit,
  topAbsoluteDeficit,
  topDelta,
} from "./generate-coverage-reference.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const auditedSha = execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
const ciSourcePrefix = "/home/runner/work/CleanmyMap/CleanmyMap/";

const metrics = (values) => Object.fromEntries(Object.entries(values).map(([name, covered]) => [name, { covered, total: 10, pct: covered * 10 }]));

function metricRow(covered, total) {
  return { covered, total, pct: total === 0 ? 100 : covered / total * 100 };
}

function reportDefinition(scope) {
  if (scope === "web") return {
    source: "src/app/page.tsx",
    sourceFile: "apps/web/src/app/page.tsx",
    prefix: "apps/web",
  };
  if (scope === "mobile") return {
    source: "App.tsx",
    sourceFile: "apps/mobile/App.tsx",
    prefix: "apps/mobile",
  };
  return {
    source: "scripts/ci/detect-scope.mjs",
    sourceFile: "scripts/ci/detect-scope.mjs",
    prefix: "scripts",
  };
}

function coverageSummary(definition, { statements = [1, 2], branches = [1, 2], functions = [1, 1], lines = [1, 2] } = {}) {
  const [statementCovered, statementTotal] = statements;
  const [branchCovered, branchTotal] = branches;
  const [functionCovered, functionTotal] = functions;
  const [lineCovered, lineTotal] = lines;
  return {
    total: {
      statements: metricRow(statementCovered, statementTotal),
      branches: metricRow(branchCovered, branchTotal),
      functions: metricRow(functionCovered, functionTotal),
      lines: metricRow(lineCovered, lineTotal),
    },
    [definition.source]: {
      statements: metricRow(statementCovered, statementTotal),
      branches: metricRow(branchCovered, branchTotal),
      functions: metricRow(functionCovered, functionTotal),
      lines: metricRow(lineCovered, lineTotal),
    },
  };
}

function lcovFor(definition, { ciPaths = false } = {}) {
  const source = ciPaths ? `${ciSourcePrefix}${definition.sourceFile}` : definition.source;
  return [
    "TN:",
    `SF:${source}`,
    "FN:1,fixture",
    "FNDA:1,fixture",
    "FNF:1",
    "FNH:1",
    "DA:1,1",
    "DA:2,0",
    "BRDA:1,0,0,1",
    "BRDA:2,0,1,-1",
    "BRF:2",
    "BRH:1",
    "LF:2",
    "LH:1",
    "end_of_record",
    "",
  ].join("\n");
}

function writeLcovScope(root, scope, { ciPaths = false, summaryOptions } = {}) {
  const definition = reportDefinition(scope);
  const coverageRoot = path.join(root, ...(`${definition.prefix}/coverage`).split("/"));
  fs.mkdirSync(coverageRoot, { recursive: true });
  const baseSummary = coverageSummary(definition, summaryOptions);
  const summary = ciPaths
    ? { total: baseSummary.total, [`${ciSourcePrefix}${definition.sourceFile}`]: baseSummary[definition.source] }
    : baseSummary;
  const summaryPath = path.join(coverageRoot, "coverage-summary.json");
  const lcovPath = path.join(coverageRoot, "lcov.info");
  fs.writeFileSync(summaryPath, JSON.stringify(summary), "utf8");
  fs.writeFileSync(lcovPath, lcovFor(definition, { ciPaths }), "utf8");
  return { definition, summary, summaryPath, lcovPath };
}

function writePythonScope(root) {
  const coveragePath = path.join(root, "maintenance", "python", "coverage.xml");
  fs.mkdirSync(path.dirname(coveragePath), { recursive: true });
  fs.writeFileSync(coveragePath, [
    "<?xml version=\"1.0\" ?>",
    "<coverage><packages><package name=\"tests\"><classes>",
    "<class name=\"init\" filename=\"tests/__init__.py\"><lines><line number=\"1\" hits=\"1\"/></lines></class>",
    "</classes></package></packages></coverage>",
  ].join(""), "utf8");
  return coveragePath;
}

function copyReport(sourceRoot, targetRoot, relativePath) {
  const source = path.join(sourceRoot, ...relativePath.split("/"));
  const target = path.join(targetRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return target;
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writeWebEvidence(root, report, { candidate = auditedSha, ciPaths = false } = {}) {
  const evidencePath = path.join(root, "apps/web/coverage/coverage-evidence.json");
  const summaryPath = report.summaryPath;
  const lcovPath = report.lcovPath;
  const evidence = {
    schemaVersion: 2,
    kind: "cleanmymap-web-coverage",
    gitHead: candidate,
    scope: "web",
    scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT,
    configurationFingerprint: computeConfigurationFingerprint({ repositoryRoot, candidateRef: auditedSha }),
    environmentFingerprint: computeCoverageEnvironmentFingerprint(),
    summarySha256: computeCoverageSummaryHash(report.summary, root),
    summaryPath: "apps/web/coverage/coverage-summary.json",
    lcovSha256: computeCoverageFileHash(lcovPath),
    lcovPath: "apps/web/coverage/lcov.info",
  };
  if (ciPaths) {
    evidence.sourcePathStyle = "github-actions-absolute-paths";
  }
  fs.writeFileSync(evidencePath, JSON.stringify(evidence), "utf8");
  return evidencePath;
}

function writeMobileEvidence(root, report, { candidate = auditedSha } = {}) {
  const evidencePath = path.join(root, "apps/mobile/coverage/coverage-evidence.json");
  fs.writeFileSync(evidencePath, JSON.stringify({
    schemaVersion: 2,
    kind: "cleanmymap-mobile-coverage",
    gitHead: candidate,
    scope: "mobile",
    scopeFingerprint: MOBILE_COVERAGE_SCOPE_FINGERPRINT,
    configurationFingerprint: computeConfigurationFingerprint({ repositoryRoot, candidateRef: auditedSha, scope: "mobile" }),
    environmentFingerprint: computeCoverageEnvironmentFingerprint(),
    summarySha256: computeCoverageSummaryHash(report.summary, root),
    summaryPath: "apps/mobile/coverage/coverage-summary.json",
    lcovSha256: computeCoverageFileHash(report.lcovPath),
    lcovPath: "apps/mobile/coverage/lcov.info",
  }), "utf8");
  return evidencePath;
}

function writePublicationProof(scopeRoot, scope, { candidate = auditedSha, candidateScope = "CI_CANDIDATE", mutateProof } = {}) {
  const proofRoot = path.join(scopeRoot, "artifacts", "coverage-publication", auditedSha, scope);
  const sources = scope === "web"
    ? ["apps/web/coverage/coverage-summary.json", "apps/web/coverage/lcov.info", "apps/web/coverage/coverage-evidence.json"]
    : scope === "mobile"
      ? ["apps/mobile/coverage/coverage-summary.json", "apps/mobile/coverage/lcov.info", "apps/mobile/coverage/coverage-evidence.json"]
      : scope === "python"
        ? ["maintenance/python/coverage.xml"]
        : ["scripts/coverage/coverage-summary.json", "scripts/coverage/lcov.info"];
  for (const source of sources) copyReport(scopeRoot, proofRoot, source);
  if (mutateProof) mutateProof(proofRoot);
  const reports = sources.map((source) => ({ source, path: source, sha256: sha256(path.join(proofRoot, ...source.split("/"))) }));
  const proof = {
    schemaVersion: 1,
    kind: "cleanmymap-coverage-publication-proof",
    candidateSha: candidate,
    candidateScope,
    scope,
    scopeFingerprint: scope === "web" ? COVERAGE_SCOPE_FINGERPRINT : scope === "mobile" ? MOBILE_COVERAGE_SCOPE_FINGERPRINT : null,
    policyFingerprint: COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
    reports,
  };
  fs.writeFileSync(path.join(proofRoot, "coverage-publication-proof.json"), JSON.stringify(proof), "utf8");
  return { proofRoot, proofPath: path.join(proofRoot, "coverage-publication-proof.json") };
}

function createFixture({ mobile = false, python = false, attestMobile = false, attestPython = false, ciPaths = false, candidateScope = "CI_CANDIDATE", candidate = auditedSha, mutateWebProof, mutateNodeProof } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-reference-"));
  const webRoot = path.join(root, "web");
  const nodeRoot = path.join(root, "node");
  const web = writeLcovScope(webRoot, "web", { ciPaths });
  const node = writeLcovScope(nodeRoot, "node");
  writeWebEvidence(webRoot, web, { candidate: auditedSha, ciPaths });
  const webProof = writePublicationProof(webRoot, "web", { candidate, candidateScope, mutateProof: mutateWebProof });
  const nodeProof = writePublicationProof(nodeRoot, "node", { candidate, candidateScope, mutateProof: mutateNodeProof });
  const mobileRoot = mobile ? path.join(root, "mobile") : null;
  const mobileReport = mobileRoot ? writeLcovScope(mobileRoot, "mobile") : null;
  if (mobileReport) writeMobileEvidence(mobileRoot, mobileReport);
  const pythonRoot = python ? path.join(root, "python") : null;
  if (pythonRoot) writePythonScope(pythonRoot);
  const mobileProof = mobileRoot && attestMobile ? writePublicationProof(mobileRoot, "mobile", { candidate, candidateScope }) : null;
  const pythonProof = pythonRoot && attestPython ? writePublicationProof(pythonRoot, "python", { candidate, candidateScope }) : null;
  return {
    root,
    webRoot,
    nodeRoot,
    mobileRoot,
    pythonRoot,
    webProof,
    nodeProof,
    args: {
      sha: auditedSha,
      "repository-root": repositoryRoot,
      "web-root": webRoot,
      "node-root": nodeRoot,
      ...(mobileRoot ? { "mobile-root": mobileRoot } : {}),
      ...(pythonRoot ? { "python-root": pythonRoot } : {}),
      ...(mobileProof ? { "mobile-proof": mobileProof.proofPath } : {}),
      ...(pythonProof ? { "python-proof": pythonProof.proofPath } : {}),
    },
  };
}

function buildFixture(options = {}) {
  const fixture = createFixture(options);
  return { fixture, reference: buildReference({ args: fixture.args, now: new Date("2026-10-26T12:00:00.000Z") }) };
}

test("calcule les unités supplémentaires sur les compteurs exacts", () => {
  assert.deepEqual(metricDeficit({ covered: 84, total: 100 }, 85), { target: 85, deltaPp: 1, additional: 1 });
  assert.deepEqual(metricDeficit({ covered: 85, total: 100 }, 85), { target: 85, deltaPp: 0, additional: 0 });
  assert.deepEqual(metricDeficit({ covered: 86, total: 100 }, 85), { target: 85, deltaPp: 0, additional: 0 });
});

test("ne fabrique pas de déficit pour une métrique sans cible", () => {
  const deficits = addDeficits({ metrics: metrics({ statements: 1, branches: 1, functions: 1, lines: 1 }) }, null);
  assert.deepEqual(deficits.lines, { target: null, deltaPp: null, additional: null });
  assert.deepEqual(deficits.branches, { target: null, deltaPp: null, additional: null });
});

test("ne fabrique pas de déficit quand le dénominateur est nul", () => {
  assert.deepEqual(metricDeficit({ covered: 0, total: 0 }, 80), { target: null, deltaPp: null, additional: null });
});

test("classe séparément les lignes et branches manquantes", () => {
  const files = [
    { path: "a.ts", scope: "web", family: "business", classification: { domain: "business" }, metrics: metrics({ statements: 8, branches: 8, functions: 8, lines: 1 }), deficits: { lines: { additional: 8 }, branches: { additional: 2 } } },
    { path: "b.ts", scope: "web", family: "business", classification: { domain: "business" }, metrics: metrics({ statements: 8, branches: 8, functions: 8, lines: 8 }), deficits: { lines: { additional: 2 }, branches: { additional: 8 } } },
  ];
  assert.deepEqual(topAbsoluteDeficit(files).map((file) => file.path), ["a.ts", "b.ts"]);
});

test("le classement des plus grands deltas est déterministe", () => {
  const files = [
    { path: "z.ts", scope: "web", family: "business", classification: { domain: "business" }, deficits: { statements: { deltaPp: 10, additional: 1 }, branches: { deltaPp: 0, additional: 0 }, functions: { deltaPp: 0, additional: 0 }, lines: { deltaPp: 0, additional: 0 } } },
    { path: "a.ts", scope: "web", family: "business", classification: { domain: "business" }, deficits: { statements: { deltaPp: 10, additional: 1 }, branches: { deltaPp: 0, additional: 0 }, functions: { deltaPp: 0, additional: 0 }, lines: { deltaPp: 0, additional: 0 } } },
  ];
  assert.deepEqual(topDelta(files).map((file) => file.path), ["a.ts", "z.ts"]);
});

test("atteste Web et Node seulement avec une preuve CI exacte et des rapports consommés cohérents", () => {
  const { reference } = buildFixture();
  const web = reference.scopes.find((scope) => scope.scope === "web");
  const node = reference.scopes.find((scope) => scope.scope === "node");
  assert.equal(web.state, "CI_EXACT_SHA");
  assert.equal(node.state, "CI_EXACT_SHA");
  assert.equal(reference.provenance.web.validation.state, "CI_EXACT_SHA");
  assert.equal(reference.provenance.node.validation.state, "CI_EXACT_SHA");
  assert.equal(web.metrics.lines.total, 2);
  assert.equal(node.metrics.functions.total, 1);
});

test("classe un candidat de preuve dont le SHA ne correspond pas comme stale, sans l'attester", () => {
  const { reference } = buildFixture({ candidate: "0000000000000000000000000000000000000000" });
  const web = reference.scopes.find((scope) => scope.scope === "web");
  const node = reference.scopes.find((scope) => scope.scope === "node");
  assert.equal(web.state, "STALE_EVIDENCE");
  assert.equal(node.state, "STALE_EVIDENCE");
});

test("refuse une preuve absente ou mal formée et conserve le fail-closed", () => {
  const missing = createFixture();
  fs.rmSync(missing.nodeProof.proofPath);
  const missingReference = buildReference({ args: missing.args });
  assert.equal(missingReference.scopes.find((scope) => scope.scope === "node").state, "EVIDENCE_UNVERIFIED");

  const malformed = createFixture();
  fs.writeFileSync(malformed.webProof.proofPath, "{not-json", "utf8");
  const malformedReference = buildReference({ args: malformed.args });
  assert.equal(malformedReference.scopes.find((scope) => scope.scope === "web").state, "EVIDENCE_UNVERIFIED");
});

test("refuse une empreinte d'evidence divergente même si le hash du fichier est republié dans la preuve", () => {
  const { reference } = buildFixture({
    mutateWebProof: (proofRoot) => {
      const evidencePath = path.join(proofRoot, "apps/web/coverage/coverage-evidence.json");
      const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      evidence.configurationFingerprint = "f".repeat(64);
      fs.writeFileSync(evidencePath, JSON.stringify(evidence), "utf8");
    },
  });
  assert.equal(reference.scopes.find((scope) => scope.scope === "web").state, "EVIDENCE_UNVERIFIED");
});

test("refuse un rapport remplacé après publication, sans réutiliser un rapport WORKTREE", () => {
  const fixture = createFixture();
  fs.appendFileSync(path.join(fixture.webRoot, "apps/web/coverage/lcov.info"), "\n");
  const reference = buildReference({ args: fixture.args });
  const web = reference.scopes.find((scope) => scope.scope === "web");
  assert.equal(web.state, "EVIDENCE_UNVERIFIED");
  assert.equal(web.provenance.state, "EVIDENCE_UNVERIFIED");
});

test("refuse une incohérence LCOV/résumé après une preuve de publication valide", () => {
  const fixture = createFixture();
  const summaryPath = path.join(fixture.nodeRoot, "scripts/coverage/coverage-summary.json");
  const proofSummaryPath = path.join(fixture.nodeProof.proofRoot, "scripts/coverage/coverage-summary.json");
  for (const file of [summaryPath, proofSummaryPath]) {
    const summary = JSON.parse(fs.readFileSync(file, "utf8"));
    summary.total.lines = metricRow(99, 99);
    summary[reportDefinition("node").source].lines = metricRow(99, 99);
    fs.writeFileSync(file, JSON.stringify(summary), "utf8");
  }
  const proofPath = fixture.nodeProof.proofPath;
  const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  proof.reports.find((report) => report.source === "scripts/coverage/coverage-summary.json").sha256 = sha256(proofSummaryPath);
  fs.writeFileSync(proofPath, JSON.stringify(proof), "utf8");
  const reference = buildReference({ args: fixture.args });
  const node = reference.scopes.find((scope) => scope.scope === "node");
  assert.equal(node.state, "EVIDENCE_UNVERIFIED");
  assert.equal(node.files.length, 0);
});

test("ne promeut ni DYNAMIC_CANDIDATE ni WORKTREE en CI_EXACT_SHA", () => {
  for (const candidateScope of ["DYNAMIC_CANDIDATE", "WORKTREE"]) {
    const { reference } = buildFixture({ candidateScope });
    const node = reference.scopes.find((scope) => scope.scope === "node");
    assert.equal(node.state, "EVIDENCE_UNVERIFIED");
    assert.notEqual(node.state, "CI_EXACT_SHA");
  }
});

test("atteste les chemins d'artefacts CI et le sentinel V8 BRDA -1 sans les réécrire", () => {
  const fixture = createFixture({ ciPaths: true });
  const reference = buildReference({ args: fixture.args });
  const web = reference.scopes.find((scope) => scope.scope === "web");
  assert.equal(web.state, "CI_EXACT_SHA");
  assert.equal(web.files[0].path, "apps/web/src/app/page.tsx");
  assert.equal(web.metrics.branches.total, 2);
  assert.equal(web.metrics.branches.covered, 1);
  assert.match(fs.readFileSync(path.join(fixture.webRoot, "apps/web/coverage/lcov.info"), "utf8"), /BRDA:2,0,1,-1/);
});

test("atteste les quatre scopes lorsque chaque producteur publie une preuve CI exacte", () => {
  const { reference } = buildFixture({ mobile: true, python: true, attestMobile: true, attestPython: true });
  for (const scope of ["web", "node", "mobile", "python"]) {
    assert.equal(reference.scopes.find((entry) => entry.scope === scope)?.state, "CI_EXACT_SHA", scope);
    assert.equal(reference.provenance[scope]?.validation?.state, "CI_EXACT_SHA", scope);
  }
});

test("ne transforme pas un compteur BRDA négatif invalide en preuve attested", () => {
  const fixture = createFixture();
  const lcovFiles = [
    path.join(fixture.webRoot, "apps/web/coverage/lcov.info"),
    path.join(fixture.webProof.proofRoot, "apps/web/coverage/lcov.info"),
  ];
  for (const file of lcovFiles) fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("BRDA:2,0,1,-1", "BRDA:2,0,1,-2"), "utf8");
  for (const [index, file] of [
    path.join(fixture.webRoot, "apps/web/coverage/coverage-evidence.json"),
    path.join(fixture.webProof.proofRoot, "apps/web/coverage/coverage-evidence.json"),
  ].entries()) {
    const evidence = JSON.parse(fs.readFileSync(file, "utf8"));
    evidence.lcovSha256 = sha256(lcovFiles[index]);
    fs.writeFileSync(file, JSON.stringify(evidence), "utf8");
  }
  const proof = JSON.parse(fs.readFileSync(fixture.webProof.proofPath, "utf8"));
  proof.reports.find((report) => report.source === "apps/web/coverage/lcov.info").sha256 = sha256(lcovFiles[1]);
  fs.writeFileSync(fixture.webProof.proofPath, JSON.stringify(proof), "utf8");
  const reference = buildReference({ args: fixture.args });
  assert.equal(reference.scopes.find((scope) => scope.scope === "web").state, "EVIDENCE_UNVERIFIED");
  assert.match(fs.readFileSync(lcovFiles[0], "utf8"), /BRDA:2,0,1,-2/);
});

test("refuse Mobile et Python sans preuve de publication et expose les limites Cobertura", () => {
  const { reference } = buildFixture({ mobile: true, python: true });
  const mobile = reference.scopes.find((scope) => scope.scope === "mobile");
  const python = reference.scopes.find((scope) => scope.scope === "python");
  assert.equal(mobile.state, "EVIDENCE_UNVERIFIED");
  assert.equal(python.state, "EVIDENCE_UNVERIFIED");
  assert.equal(python.files[0].metrics.statements.total, null);
  assert.equal(python.files[0].metrics.functions.total, null);
  assert.equal(python.files[0].metrics.lines.total, null);
});

test("produit une référence déterministe pour les mêmes rapports et le même SHA", () => {
  const fixture = createFixture();
  const now = new Date("2026-10-26T12:00:00.000Z");
  const first = buildReference({ args: fixture.args, now });
  const second = buildReference({ args: fixture.args, now });
  assert.deepEqual(second, first);
});

test("refuse un SHA CLI invalide et une racine de couverture redirigée", (t) => {
  const fixture = createFixture();
  try {
    assert.throws(() => buildReference({ args: { ...fixture.args, sha: "../HEAD" } }), /invalid|required argument/);
    const linkedWebRoot = path.join(fixture.root, "linked-web-root");
    try {
      fs.symlinkSync(fixture.webRoot, linkedWebRoot, "junction");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }
    assert.throws(() => buildReference({ args: { ...fixture.args, "web-root": linkedWebRoot } }), /symbolic-link|redirected/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
