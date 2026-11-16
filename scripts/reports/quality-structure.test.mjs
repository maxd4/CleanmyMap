import assert from "node:assert/strict";
import test from "node:test";

import { buildFolderMeasures } from "./architecture-audit.mjs";
import { analyzeQualityStructure, QUALITY_STRUCTURE_THRESHOLDS } from "./quality-structure.mjs";

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
  const files = directFiles("coherent", "action", 16);
  const folder = reviewedFolder(fixture(files), "coherent");

  assert.equal(folder.files.direct, 16);
  assert.equal(folder.signals.length, 2);
  assert.equal(folder.signals[0].id, "DIRECT_FILES_SURVEILLANCE");
  assert.equal(folder.review.required, false);
  assert.equal(folder.review.recommendation, "DESCRIPTIVE_ONLY");
});

test("un dossier plat multiresponsabilité exige des indices concordants", () => {
  const files = [...directFiles("mixed", "action", 8), ...directFiles("mixed", "report", 8)];
  const folder = reviewedFolder(fixture(files), "mixed");

  assert.equal(folder.files.direct, 16);
  assert.equal(folder.functionalGroups.length, 2);
  assert.deepEqual(folder.signalFamilies, ["functional-diversity", "shape"]);
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
  const external = `${ROOT}/shared/shared.ts`;
  const edges = files.map((file) => ({ from: file, to: external, fromDomain: "web/crossed", toDomain: "web/shared" }));
  const folder = reviewedFolder(fixture([...files, external], edges), "crossed");

  assert.equal(folder.imports.crossFolder, 8);
  assert.equal(folder.imports.internalShare, 0);
  assert.ok(folder.signals.some((signal) => signal.id === "CROSS_FOLDER_IMPORTS"));
  assert.ok(folder.signals.some((signal) => signal.id === "LOW_INTERNAL_COHESION"));
  assert.equal(folder.review.required, true);
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

test("un petit dossier multiresponsabilité reste hors revue automatique", () => {
  const files = [...directFiles("small", "action", 4), ...directFiles("small", "report", 3)];
  const folder = reviewedFolder(fixture(files), "small");

  assert.equal(folder.files.direct, 7);
  assert.equal(folder.functionalGroups.length, 2);
  assert.equal(folder.signals.length, 0);
  assert.equal(folder.review.required, false);
  assert.equal(QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles, 8);
});
