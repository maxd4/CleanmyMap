#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildArchitectureAudit, ARCHITECTURE_SCAN_ROOTS } from "./architecture-audit.mjs";

export const QUALITY_STRUCTURE_SCHEMA_VERSION = 1;
export const QUALITY_STRUCTURE_THRESHOLDS = Object.freeze({
  directFilesSurveillance: 15,
  directFilesReview: 25,
  significantRecursiveFiles: 8,
  directConcentrationShare: 0.75,
  minimumFunctionalFiles: 8,
  minimumCrossFolderRelations: 2,
  minimumConcordantFamilies: 2,
});
export const QUALITY_STRUCTURE_SCOPE_ROOTS = Object.freeze({
  web: Object.freeze(["apps/web/src"]),
  mobile: Object.freeze(["apps/mobile"]),
  all: ARCHITECTURE_SCAN_ROOTS,
});

const STRUCTURAL_EXCLUSION_RULES = Object.freeze([
  { code: "GENERATED", pattern: /(?:^|\/)(?:generated|__generated__)(?:\/|$)|(?:^|\/)next-env\.d\.ts$|\.generated\./i },
  { code: "ASSET_OR_VENDOR", pattern: /(?:^|\/)(?:assets?|vendor|third[-_]?party)(?:\/|$)/i },
  { code: "MIGRATION", pattern: /(?:^|\/)(?:migrations?|supabase\/migrations)(?:\/|$)/i },
  { code: "NEXT_ROUTING_CONVENTION", pattern: /(?:^|\/)apps\/web\/src\/(?:app|pages)(?:\/|$)/i },
  { code: "EXPO_ROUTING_CONVENTION", pattern: /(?:^|\/)apps\/mobile\/app(?:\/|$)/i },
]);

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));
}

function stableFiles(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function exclusionCode(file) {
  const normalized = normalizePath(file);
  return STRUCTURAL_EXCLUSION_RULES.find((rule) => rule.pattern.test(normalized))?.code ?? null;
}

function functionalPrefix(file) {
  const base = path.posix.basename(normalizePath(file))
    .replace(/\.(?:[cm]?[jt]sx?|jsx?)$/i, "")
    .replace(/\.(?:test|spec)$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  const prefix = base.split(/[-_.]+/).find(Boolean);
  return prefix?.toLowerCase() || "unknown";
}

export function structureScanRoots(scope = "all") {
  const roots = QUALITY_STRUCTURE_SCOPE_ROOTS[scope];
  if (!roots) throw new Error(`Scope structurel inconnu: ${scope}`);
  return [...roots];
}

function pathBelongsToFolder(file, folderPath) {
  return file === folderPath || file.startsWith(`${folderPath}/`);
}

function signal(id, family, detail, evidence) {
  return { id, family, detail, evidence };
}

function buildFunctionalGroups(files) {
  const groups = new Map();
  for (const file of stableFiles(files)) {
    const prefix = functionalPrefix(file);
    const group = groups.get(prefix) ?? { prefix, files: [] };
    group.files.push(file);
    groups.set(prefix, group);
  }
  return [...groups.values()].sort((left, right) => left.prefix.localeCompare(right.prefix, "en"));
}

function relationMetrics(folder, imports, architecture) {
  const directFiles = new Set(folder.paths?.eligibleDirect ?? folder.paths?.direct ?? []);
  const recursiveFiles = new Set(folder.paths?.eligibleRecursive ?? folder.paths?.recursive ?? []);
  const graphMeasured = imports?.available !== false && Array.isArray(imports?.edges);
  const edges = graphMeasured
    ? imports.edges.filter((edge) => recursiveFiles.has(edge.from) || recursiveFiles.has(edge.to))
    : [];
  const internalDirect = edges.filter((edge) => directFiles.has(edge.from) && directFiles.has(edge.to));
  const internalRecursive = edges.filter((edge) => recursiveFiles.has(edge.from) && recursiveFiles.has(edge.to));
  const crossFolder = edges.filter((edge) => recursiveFiles.has(edge.from) !== recursiveFiles.has(edge.to));
  const outgoing = edges.filter((edge) => directFiles.has(edge.from) && !directFiles.has(edge.to));
  const incoming = edges.filter((edge) => directFiles.has(edge.to) && !directFiles.has(edge.from));
  const architectureFiles = new Map((architecture?.files ?? []).map((entry) => [normalizePath(entry.path), entry]));
  const coupling = [...directFiles].reduce((summary, file) => {
    const metrics = architectureFiles.get(file)?.metrics;
    if (!metrics) return summary;
    summary.fanIn += metrics.totalFanIn ?? 0;
    summary.fanOut += metrics.totalFanOut ?? 0;
    summary.measuredFiles += 1;
    return summary;
  }, { fanIn: 0, fanOut: 0, measuredFiles: 0 });
  const relationTotal = internalRecursive.length + crossFolder.length;
  return {
    measurementStatus: graphMeasured ? "MEASURED" : "NOT_MEASURED",
    total: relationTotal,
    internalDirect: internalDirect.length,
    internalRecursive: internalRecursive.length,
    crossFolder: crossFolder.length,
    outgoing: outgoing.length,
    incoming: incoming.length,
    internalShare: ratio(internalRecursive.length, relationTotal),
    coupling,
  };
}

function folderPaths(folder) {
  return {
    direct: stableFiles(folder.paths?.eligibleDirect ?? folder.paths?.direct ?? []),
    recursive: stableFiles(folder.paths?.eligibleRecursive ?? folder.paths?.recursive ?? []),
  };
}

function analyzeFolder(folder, imports, architecture) {
  const paths = folderPaths(folder);
  const directFiles = paths.direct.filter((file) => !exclusionCode(file));
  const recursiveFiles = paths.recursive.filter((file) => !exclusionCode(file));
  const functionalGroups = buildFunctionalGroups(directFiles);
  const importsMeasured = relationMetrics({ ...folder, paths: { direct: directFiles, recursive: recursiveFiles } }, imports, architecture);
  const direct = directFiles.length;
  const recursive = recursiveFiles.length;
  const concentration = ratio(direct, recursive);
  const signals = [];

  if (direct >= QUALITY_STRUCTURE_THRESHOLDS.directFilesSurveillance) {
    signals.push(signal(
      direct >= QUALITY_STRUCTURE_THRESHOLDS.directFilesReview ? "DIRECT_FILES_REVIEW" : "DIRECT_FILES_SURVEILLANCE",
      "shape",
      `le dossier contient ${direct} fichiers sources directs`,
      { directFiles: direct, recursiveFiles: recursive, threshold: direct >= QUALITY_STRUCTURE_THRESHOLDS.directFilesReview ? QUALITY_STRUCTURE_THRESHOLDS.directFilesReview : QUALITY_STRUCTURE_THRESHOLDS.directFilesSurveillance },
    ));
  }
  if (recursive >= QUALITY_STRUCTURE_THRESHOLDS.significantRecursiveFiles && concentration > QUALITY_STRUCTURE_THRESHOLDS.directConcentrationShare) {
    signals.push(signal(
      "DIRECT_CONCENTRATION",
      "shape",
      "la concentration directe dépasse le signal descriptif sur un ensemble significatif",
      { directFiles: direct, recursiveFiles: recursive, directShare: concentration, threshold: QUALITY_STRUCTURE_THRESHOLDS.directConcentrationShare, minimumRecursiveFiles: QUALITY_STRUCTURE_THRESHOLDS.significantRecursiveFiles },
    ));
  }
  if (direct >= QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles && functionalGroups.length > 1) {
    signals.push(signal(
      "FUNCTIONAL_GROUPS",
      "functional-diversity",
      `${functionalGroups.length} préfixes fonctionnels distincts sont observés dans les fichiers directs`,
      { groupCount: functionalGroups.length, groups: functionalGroups },
    ));
  }
  if (direct >= QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles && importsMeasured.crossFolder >= QUALITY_STRUCTURE_THRESHOLDS.minimumCrossFolderRelations) {
    signals.push(signal(
      "CROSS_FOLDER_IMPORTS",
      "coupling",
      "plusieurs relations d'import sortent de la zone récursive du dossier",
      { crossFolderRelations: importsMeasured.crossFolder, threshold: QUALITY_STRUCTURE_THRESHOLDS.minimumCrossFolderRelations, outgoing: importsMeasured.outgoing, incoming: importsMeasured.incoming },
    ));
  }
  if (direct >= QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles
    && functionalGroups.length > 1
    && importsMeasured.total >= 4
    && importsMeasured.internalShare <= 0.25) {
    signals.push(signal(
      "LOW_INTERNAL_COHESION",
      "cohesion",
      "les groupes fonctionnels sont peu reliés entre eux dans le graphe local observé",
      { internalRecursiveRelations: importsMeasured.internalRecursive, totalRelations: importsMeasured.total, internalShare: importsMeasured.internalShare, maximumInternalShare: 0.25 },
    ));
  }

  const families = [...new Set(signals.map((entry) => entry.family))].sort();
  const graphBackedFunctionalDiversity = functionalGroups.length > 1
    && importsMeasured.measurementStatus === "MEASURED"
    && (importsMeasured.crossFolder >= QUALITY_STRUCTURE_THRESHOLDS.minimumCrossFolderRelations
      || (importsMeasured.total >= 4 && importsMeasured.internalShare <= 0.25));
  const reviewFamilies = families.filter((family) => family !== "functional-diversity" || graphBackedFunctionalDiversity);
  const reviewRequired = reviewFamilies.length >= QUALITY_STRUCTURE_THRESHOLDS.minimumConcordantFamilies;
  return {
    path: folder.path,
    root: folder.root,
    files: { direct: direct, recursive: recursive, inventoryDirect: folder.files.direct, inventoryRecursive: folder.files.recursive },
    depth: folder.depth,
    concentration: { directFileShare: concentration, inventoryDirectFileShare: folder.concentration.directFileShare },
    functionalGroups,
    imports: importsMeasured,
    signals,
    signalFamilies: families,
    review: {
      required: reviewRequired,
      recommendation: reviewRequired ? "REVIEW_STRUCTURE" : "DESCRIPTIVE_ONLY",
      reason: reviewRequired ? "plusieurs familles de signaux indépendantes concordent ; aucune réorganisation automatique" : "indices insuffisants pour recommander une réorganisation",
      evidence: reviewRequired ? { directFiles, recursiveFiles } : { directFiles: [], recursiveFiles: [] },
    },
    reviewFamilies,
    exception: null,
  };
}

export function analyzeQualityStructure({ folderMeasures, imports, architecture = null } = {}) {
  if (!folderMeasures || !Array.isArray(folderMeasures.folders)) throw new Error("folderMeasures absent pour l'analyse structurelle.");
  const folders = folderMeasures.folders.map((folder) => analyzeFolder(folder, imports, architecture));
  const reviewed = folders.filter((folder) => folder.review.required);
  const signalCounts = Object.fromEntries([...new Set(folders.flatMap((folder) => folder.signals.map((entry) => entry.id)))].sort().map((id) => [id, folders.reduce((count, folder) => count + (folder.signals.some((entry) => entry.id === id) ? 1 : 0), 0)]));
  return {
    schemaVersion: QUALITY_STRUCTURE_SCHEMA_VERSION,
    kind: "quality-structure",
    status: "PASS",
    blocking: false,
    measurementStatus: "MEASURED",
    method: "architecture-audit-folderMeasures-and-local-import-graph",
    roots: [...(folderMeasures.roots ?? ARCHITECTURE_SCAN_ROOTS)],
    thresholds: QUALITY_STRUCTURE_THRESHOLDS,
    summary: {
      foldersMeasured: folders.length,
      foldersWithSignals: folders.filter((folder) => folder.signals.length > 0).length,
      foldersRequiringReview: reviewed.length,
      descriptiveSignals: folders.reduce((sum, folder) => sum + folder.signals.length, 0),
      concordantFamilyCount: reviewed.reduce((sum, folder) => sum + folder.signalFamilies.length, 0),
      signalCounts,
      importEdgesMeasured: imports?.edges?.length ?? 0,
      unresolvedLocalImports: imports?.unresolvedLocalImports ?? 0,
      excludedLocalImports: imports?.excludedLocalImports ?? 0,
    },
    folders,
    foldersRequiringReview: reviewed,
    exclusions: STRUCTURAL_EXCLUSION_RULES.map(({ code }) => code),
    diagnostics: [],
    qualityIndexProjection: architecture
      ? { state: architecture.state ?? "NOT_MEASURED", graphSummary: architecture.graphSummary ?? null }
      : { state: "NOT_MEASURED", graphSummary: null },
  };
}

export function buildQualityStructureFromRepository({ root, auditedSha = "HEAD", architecture = null, now = () => new Date().toISOString(), runId = null, scope = "all" } = {}) {
  const activeScope = scope ?? "all";
  const architectureAudit = buildArchitectureAudit({ root, ref: auditedSha, now, scanRoots: structureScanRoots(activeScope) });
  return {
    ...analyzeQualityStructure({ folderMeasures: architectureAudit.folderMeasures, imports: architectureAudit.imports, architecture }),
    auditedHead: architectureAudit.sourceSha,
    runId,
    scope: activeScope,
  };
}

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export function main(args = process.argv.slice(2)) {
  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const report = buildQualityStructureFromRepository({ root, auditedSha: option(args, "ref") ?? "HEAD", scope: option(args, "scope") ?? "all" });
    const dryRun = args.includes("--dry-run");
    const output = path.resolve(root, option(args, "output") ?? `artifacts/quality-structure/${report.auditedHead}/structure.json`);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    }
    console.log(`QUALITY_STRUCTURE_STATUS: ${report.status}`);
    console.log(`QUALITY_STRUCTURE_REVIEW_FOLDERS: ${report.summary.foldersRequiringReview}`);
    console.log(`QUALITY_STRUCTURE_SIGNALS: ${report.summary.descriptiveSignals}`);
    console.log(`QUALITY_STRUCTURE_MODE: ${dryRun ? "DRY_RUN" : "WRITE"}`);
    if (!dryRun) console.log(`QUALITY_STRUCTURE_OUTPUT: ${output}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
