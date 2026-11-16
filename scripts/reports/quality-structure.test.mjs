import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildFolderMeasures } from "./architecture-audit.mjs";
import { analyzeQualityStructure, qualityStructureOutputPath, QUALITY_STRUCTURE_THRESHOLDS, structureScanRoots } from "./quality-structure.mjs";

const ROOT = "apps/web/src";

function rows(files, { generated = [] } = {}) {
  const generatedSet = new Set(generated);
  return files.map((file) => ({ file, kind: "runtime", lines: 10, bytes: 100, generated: generatedSet.has(file) }));
}

function fixture(files, edges = [], options = {}) {
  const sourceRows = rows(files, options);
  const folderMeasures = buildFolderMeasures(sourceRows, { scanRoots: [ROOT] });
  return analyzeQualityStructure({
    folderMeasures,
    imports: { edges, unresolvedLocalImports: 0, excludedLocalImports: 0 },
  });
}

function directFiles(folder, prefix, count) {
  return Array.from({ length: count }, (_, index) => `${ROOT}/${folder}/${prefix}-${String(index + 1).padStart(2, "0")}.ts`);
}

function reviewedFolder(report, folder) {
  return report.folders.find((entry) => entry.path === `${ROOT}/${folder}`);
}

test("un dossier plat cohérent conserve un signal descriptif sans recommandation", () => {
  const files = [...directFiles("coherent", "action", 8), ...directFiles("coherent", "report", 8)];
  const folder = reviewedFolder(fixture(files), "coherent");

  assert.equal(folder.files.direct, 16);
  assert.equal(folder.signals.length, 3);
  assert.equal(folder.signals[0].id, "DIRECT_FILES_SURVEILLANCE");
  assert.deepEqual(folder.signalFamilies, ["functional-diversity", "shape"]);
  assert.deepEqual(folder.reviewFamilies, ["shape"]);
  assert.equal(folder.review.required, false);
  assert.equal(folder.review.recommendation, "DESCRIPTIVE_ONLY");
});

test("un dossier plat multiresponsabilité exige des indices concordants", () => {
  const files = [...directFiles("mixed", "action", 8), ...directFiles("mixed", "report", 8)];
  const actionService = `${ROOT}/services/action.ts`;
  const reportService = `${ROOT}/services/report.ts`;
  const edges = [
    ...files.slice(0, 8).map((file) => ({ from: file, to: actionService, fromDomain: "web/mixed", toDomain: "web/services/action" })),
    ...files.slice(8).map((file) => ({ from: file, to: reportService, fromDomain: "web/mixed", toDomain: "web/services/report" })),
  ];
  const folder = reviewedFolder(fixture([...files, actionService, reportService], edges), "mixed");

  assert.equal(folder.files.direct, 16);
  assert.equal(folder.functionalGroups.length, 2);
  assert.ok(folder.signalFamilies.includes("functional-diversity"));
  assert.ok(folder.reviewFamilies.includes("graph"));
  assert.equal(folder.review.required, true);
  assert.match(folder.review.reason, /plusieurs familles/);
  assert.ok(folder.review.evidence.directFiles.includes(`${ROOT}/mixed/action-01.ts`));
});

test("des sous-dossiers cohérents ne sont pas remontés comme un dossier plat", () => {
  const files = [
    ...directFiles("nested/actions", "action", 4),
    ...directFiles("nested/reports", "report", 4),
  ];
  const report = fixture(files);
  const parent = reviewedFolder(report, "nested");

  assert.equal(parent.files.direct, 0);
  assert.equal(parent.files.recursive, 8);
  assert.equal(parent.review.required, false);
  assert.equal(report.foldersRequiringReview.length, 0);
});

test("les imports croisés renforcent la preuve de faible cohésion", () => {
  const files = [...directFiles("crossed", "action", 4), ...directFiles("crossed", "report", 4)];
  const actionService = `${ROOT}/services/action-crossed.ts`;
  const reportService = `${ROOT}/services/report-crossed.ts`;
  const edges = [
    ...files.slice(0, 4).map((file) => ({ from: file, to: actionService, fromDomain: "web/crossed", toDomain: "web/services/action" })),
    ...files.slice(4).map((file) => ({ from: file, to: reportService, fromDomain: "web/crossed", toDomain: "web/services/report" })),
  ];
  const folder = reviewedFolder(fixture([...files, actionService, reportService], edges), "crossed");

  assert.equal(folder.imports.crossFolder, 8);
  assert.equal(folder.imports.internalShare, 0);
  assert.ok(folder.signals.some((signal) => signal.id === "CROSS_FOLDER_IMPORTS"));
  assert.ok(folder.signals.some((signal) => signal.id === "LOW_INTERNAL_COHESION"));
  assert.equal(folder.review.required, true);
});

test("les imports entrants de consommateurs et de helpers partagés ne simulent pas une faible cohésion", () => {
  const files = [...directFiles("incoming", "action", 8), ...directFiles("incoming", "report", 8)];
  const consumer = `${ROOT}/consumers/test-consumer.ts`;
  const edges = files.map((file) => ({ from: consumer, to: file, fromDomain: "web/consumers", toDomain: "web/incoming" }));
  const folder = reviewedFolder(fixture([...files, consumer], edges), "incoming");

  assert.equal(folder.imports.externalIncoming, 16);
  assert.equal(folder.imports.externalOutgoing, 0);
  assert.equal(folder.imports.internalShare, null);
  assert.equal(folder.signals.some((entry) => entry.id === "CROSS_FOLDER_IMPORTS"), false);
  assert.equal(folder.signals.some((entry) => entry.id === "LOW_INTERNAL_COHESION"), false);
  assert.equal(folder.review.required, false);

  const helperFiles = [...directFiles("__tests__/helpers", "fixture", 8), ...directFiles("__tests__/helpers", "mock", 8)];
  const helperConsumer = `${ROOT}/__tests__/consumer.ts`;
  const helperEdges = helperFiles.map((file) => ({ from: helperConsumer, to: file, fromDomain: "web/__tests__", toDomain: "web/__tests__/helpers" }));
  const helperFolder = reviewedFolder(fixture([...helperFiles, helperConsumer], helperEdges), "__tests__/helpers");
  assert.equal(helperFolder.imports.externalIncoming, 16);
  assert.equal(helperFolder.review.required, false);
  assert.equal(helperFolder.signals.some((entry) => entry.id === "LOW_INTERNAL_COHESION"), false);
});

test("les dépendances sortantes ordinaires vers une cible partagée ne suffisent pas", () => {
  const files = [...directFiles("shared-reuse", "action", 8), ...directFiles("shared-reuse", "report", 8)];
  const shared = `${ROOT}/shared/consumer-helper.ts`;
  const edges = files.map((file) => ({ from: file, to: shared, fromDomain: "web/shared-reuse", toDomain: "web/shared" }));
  const folder = reviewedFolder(fixture([...files, shared], edges), "shared-reuse");

  assert.equal(folder.imports.dispersedOutgoing, false);
  assert.equal(folder.signals.some((entry) => entry.id === "CROSS_FOLDER_IMPORTS"), false);
  assert.equal(folder.signals.some((entry) => entry.id === "LOW_INTERNAL_COHESION"), false);
  assert.equal(folder.review.required, false);
});

test("les relations récursives incluent les imports entre sous-dossiers", () => {
  const files = [
    ...directFiles("nested/actions", "action", 4),
    ...directFiles("nested/reports", "report", 4),
  ];
  const external = `${ROOT}/shared/shared.ts`;
  const edges = [
    { from: files[0], to: files[1], fromDomain: "web/nested", toDomain: "web/nested" },
    { from: files[4], to: files[5], fromDomain: "web/nested", toDomain: "web/nested" },
    { from: files[0], to: external, fromDomain: "web/nested", toDomain: "web/shared" },
  ];
  const folder = reviewedFolder(fixture([...files, external], edges), "nested");

  assert.equal(folder.files.direct, 0);
  assert.equal(folder.imports.internalDirect, 0);
  assert.equal(folder.imports.internalRecursive, 2);
  assert.equal(folder.imports.crossFolder, 1);
  assert.equal(folder.imports.total, 3);
  assert.equal(folder.imports.internalShare, 0.666667);
});

test("un graphe absent ou partiel ne permet aucune conclusion de cohésion", () => {
  const files = [...directFiles("partial", "action", 8), ...directFiles("partial", "report", 8)];
  const sourceRows = rows(files);
  const folderMeasures = buildFolderMeasures(sourceRows, { scanRoots: [ROOT] });
  const report = analyzeQualityStructure({
    folderMeasures,
    imports: { available: false, edges: [], unresolvedLocalImports: 1, excludedLocalImports: 0 },
  });
  const folder = reviewedFolder(report, "partial");

  assert.equal(folder.imports.measurementStatus, "NOT_MEASURED");
  assert.equal(folder.imports.total, 0);
  assert.equal(folder.signals.some((entry) => entry.id === "LOW_INTERNAL_COHESION"), false);
  assert.equal(folder.review.required, false);
});

test("les scopes web et mobile ne contaminent pas leurs inventaires", () => {
  const web = "apps/web/src/components/web.ts";
  const mobile = "apps/mobile/features/mobile.ts";
  const sourceRows = rows([web, mobile]);
  const webMeasures = buildFolderMeasures(sourceRows, { scanRoots: structureScanRoots("web") });
  const mobileMeasures = buildFolderMeasures(sourceRows, { scanRoots: structureScanRoots("mobile") });

  assert.deepEqual(webMeasures.roots, ["apps/web/src"]);
  assert.deepEqual(mobileMeasures.roots, ["apps/mobile"]);
  assert.deepEqual([...new Set(webMeasures.folders.flatMap((folder) => folder.paths.recursive))], [web]);
  assert.deepEqual([...new Set(mobileMeasures.folders.flatMap((folder) => folder.paths.recursive))], [mobile]);
});

test("les exceptions de structure et les fichiers générés ne produisent pas de faux positif", () => {
  const generated = directFiles("generated-case", "action", 20);
  const assets = directFiles("assets", "icon", 20);
  const appRoutes = directFiles("app", "route", 20);
  const report = fixture([...generated, ...assets, ...appRoutes], [], { generated });

  assert.equal(reviewedFolder(report, "generated-case").files.direct, 0);
  assert.equal(reviewedFolder(report, "assets").files.direct, 0);
  assert.equal(reviewedFolder(report, "app").files.direct, 0);
  assert.equal(report.foldersRequiringReview.length, 0);
  assert.deepEqual(report.exclusions, ["GENERATED", "ASSET_OR_VENDOR", "MIGRATION", "NEXT_ROUTING_CONVENTION", "EXPO_ROUTING_CONVENTION"]);
});

test("la mesure reste déterministe malgré l'ordre des fichiers et des arêtes", () => {
  const files = [...directFiles("deterministic", "action", 8), ...directFiles("deterministic", "report", 8)];
  const edges = files.slice(0, 3).map((file) => ({ from: file, to: `${ROOT}/shared/common.ts`, fromDomain: "web/deterministic", toDomain: "web/shared" }));
  const first = fixture(files, edges);
  const second = fixture([...files].reverse(), [...edges].reverse());
  assert.deepEqual(second, first);
});

test("les écritures CLI successives des scopes restent séparées", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const script = fileURLToPath(new URL("./quality-structure.mjs", import.meta.url));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "quality-structure-scopes-"));
  try {
    const outputs = {};
    for (const scope of ["all", "web", "mobile"]) {
      const output = path.join(temp, `${scope}.json`);
      childProcess.execFileSync(process.execPath, [script, "--ref=HEAD", `--scope=${scope}`, `--output=${output}`], { cwd: root, encoding: "utf8" });
      outputs[scope] = JSON.parse(fs.readFileSync(output, "utf8"));
    }
    assert.equal(outputs.all.scope, "all");
    assert.equal(outputs.web.scope, "web");
    assert.equal(outputs.mobile.scope, "mobile");
    assert.notEqual(qualityStructureOutputPath({ root, auditedHead: "a".repeat(40), scope: "all" }), qualityStructureOutputPath({ root, auditedHead: "a".repeat(40), scope: "web" }));
    assert.notEqual(qualityStructureOutputPath({ root, auditedHead: "a".repeat(40), scope: "web" }), qualityStructureOutputPath({ root, auditedHead: "a".repeat(40), scope: "mobile" }));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("un petit dossier multiresponsabilité reste hors revue automatique", () => {
  const files = [...directFiles("small", "action", 4), ...directFiles("small", "report", 3)];
  const folder = reviewedFolder(fixture(files), "small");

  assert.equal(folder.files.direct, 7);
  assert.equal(folder.functionalGroups.length, 2);
  assert.equal(folder.signals.length, 0);
  assert.equal(folder.review.required, false);
  assert.equal(QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles, 8);
});
