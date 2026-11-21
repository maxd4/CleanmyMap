#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildArchitectureAudit, ARCHITECTURE_SCAN_ROOTS } from "./architecture-audit.mjs";
import { createRepositoryView } from "../checks/repository-view.mjs";

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
const HUMAN_DECISIONS_PATH = "documentation/development/quality-structure-decisions.md";

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

function importTargetArea(file) {
  const parts = normalizePath(file).split("/");
  if (parts[0] === "apps" && parts[1] === "web" && parts[2] === "src") {
    const sourcePath = parts.slice(3);
    if (sourcePath[0] === "lib") return ["web", "lib", sourcePath[1] ?? "root"].join("/");
    if (sourcePath[0] === "components") {
      if (sourcePath[1] === "sections") {
        const sectionPath = sourcePath[2] === "rubriques" ? sourcePath.slice(1, 4) : sourcePath.slice(1, 3);
        return ["web", "components", ...sectionPath].join("/");
      }
      return ["web", "components", sourcePath[1] ?? "root"].join("/");
    }
    const nextArea = sourcePath[1] && !path.posix.extname(sourcePath[1]) ? sourcePath[1] : null;
    return ["web", sourcePath[0] ?? "root", nextArea].filter(Boolean).join("/");
  }
  if (parts[0] === "apps" && parts[1] === "mobile") {
    const modulePath = parts.slice(2);
    return ["mobile", modulePath[0] ?? "root", modulePath[1] ?? "root"].join("/");
  }
  if (parts[0] === "scripts") return ["scripts", parts[1] ?? "root"].join("/");
  return path.posix.dirname(normalizePath(file));
}

function dependencyClusters(recursiveFiles, internalEdges, externalOutgoingEdges) {
  const parent = new Map();
  const find = (value) => {
    if (!parent.has(value)) parent.set(value, value);
    if (parent.get(value) !== value) parent.set(value, find(parent.get(value)));
    return parent.get(value);
  };
  const join = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  const sourceFiles = new Set(recursiveFiles);
  for (const edge of internalEdges) join(`file:${edge.from}`, `file:${edge.to}`);
  for (const edge of externalOutgoingEdges) join(`file:${edge.from}`, `area:${importTargetArea(edge.to)}`);

  const clusters = new Map();
  for (const edge of externalOutgoingEdges) {
    const root = find(`file:${edge.from}`);
    const cluster = clusters.get(root) ?? { sourceFiles: new Set(), targetAreas: new Set(), internalRelations: 0, externalOutgoing: 0 };
    cluster.sourceFiles.add(edge.from);
    cluster.targetAreas.add(importTargetArea(edge.to));
    cluster.externalOutgoing += 1;
    clusters.set(root, cluster);
  }
  for (const edge of internalEdges) {
    const root = find(`file:${edge.from}`);
    const cluster = clusters.get(root);
    if (cluster) {
      cluster.sourceFiles.add(edge.from);
      cluster.sourceFiles.add(edge.to);
      cluster.internalRelations += 1;
    }
  }
  return [...clusters.values()]
    .filter((cluster) => [...cluster.sourceFiles].every((file) => sourceFiles.has(file)))
    .map((cluster) => ({
      sourceFiles: stableFiles([...cluster.sourceFiles]),
      targetAreas: stableFiles([...cluster.targetAreas]),
      internalRelations: cluster.internalRelations,
      externalOutgoing: cluster.externalOutgoing,
    }))
    .sort((left, right) => left.sourceFiles[0].localeCompare(right.sourceFiles[0], "en"));
}

export function structureScanRoots(scope = "all") {
  const roots = QUALITY_STRUCTURE_SCOPE_ROOTS[scope];
  if (!roots) throw new Error(`Scope structurel inconnu: ${scope}`);
  return [...roots];
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
  const externalOutgoingEdges = edges.filter((edge) => recursiveFiles.has(edge.from) && !recursiveFiles.has(edge.to));
  const externalIncomingEdges = edges.filter((edge) => !recursiveFiles.has(edge.from) && recursiveFiles.has(edge.to));
  const outgoing = edges.filter((edge) => directFiles.has(edge.from) && !directFiles.has(edge.to));
  const incoming = edges.filter((edge) => directFiles.has(edge.to) && !directFiles.has(edge.from));
  const outgoingSourceGroups = stableFiles(externalOutgoingEdges.map((edge) => functionalPrefix(edge.from)));
  const outgoingTargetDomains = stableFiles(externalOutgoingEdges.map((edge) => normalizePath(edge.toDomain ?? path.posix.dirname(edge.to))));
  const outgoingTargetAreas = stableFiles(externalOutgoingEdges.map((edge) => importTargetArea(edge.to)));
  const clusters = graphMeasured ? dependencyClusters(recursiveFiles, internalRecursive, externalOutgoingEdges) : null;
  const architectureFiles = new Map((architecture?.files ?? []).map((entry) => [normalizePath(entry.path), entry]));
  const architectureMeasured = Array.isArray(architecture?.files);
  const coupling = [...directFiles].reduce((summary, file) => {
    const metrics = architectureFiles.get(file)?.metrics;
    if (!metrics) return summary;
    summary.fanIn += metrics.totalFanIn ?? 0;
    summary.fanOut += metrics.totalFanOut ?? 0;
    summary.measuredFiles += 1;
    return summary;
  }, { fanIn: 0, fanOut: 0, measuredFiles: 0 });
  const relationTotal = internalRecursive.length + crossFolder.length;
  const cohesionRelationTotal = internalRecursive.length + externalOutgoingEdges.length;
  return {
    measurementStatus: graphMeasured ? "MEASURED" : "NOT_MEASURED",
    total: graphMeasured ? relationTotal : null,
    internalDirect: graphMeasured ? internalDirect.length : null,
    internalRecursive: graphMeasured ? internalRecursive.length : null,
    crossFolder: graphMeasured ? crossFolder.length : null,
    outgoing: graphMeasured ? outgoing.length : null,
    incoming: graphMeasured ? incoming.length : null,
    externalOutgoing: graphMeasured ? externalOutgoingEdges.length : null,
    externalIncoming: graphMeasured ? externalIncomingEdges.length : null,
    outgoingSourceGroups: graphMeasured ? outgoingSourceGroups : null,
    outgoingTargetDomains: graphMeasured ? outgoingTargetDomains : null,
    outgoingTargetAreas: graphMeasured ? outgoingTargetAreas : null,
    dependencyClusters: clusters,
    dispersedOutgoing: graphMeasured ? clusters.length >= 2 : null,
    cohesionRelationTotal: graphMeasured ? cohesionRelationTotal : null,
    internalShare: graphMeasured && cohesionRelationTotal > 0 ? ratio(internalRecursive.length, cohesionRelationTotal) : null,
    coupling: architectureMeasured ? coupling : { fanIn: null, fanOut: null, measuredFiles: null },
    couplingMeasurementStatus: architectureMeasured ? "MEASURED" : "NOT_MEASURED",
  };
}

function folderPaths(folder) {
  return {
    direct: stableFiles(folder.paths?.eligibleDirect ?? folder.paths?.direct ?? []),
    recursive: stableFiles(folder.paths?.eligibleRecursive ?? folder.paths?.recursive ?? []),
  };
}

function reviewProof({ direct, recursive, concentration, signals, imports }) {
  const unproven = [];
  if (signals.some((entry) => entry.id === "FUNCTIONAL_GROUPS")) {
    unproven.push("Les préfixes de noms sont lexicaux et ne prouvent pas des responsabilités métier distinctes.");
  }
  if (imports.measurementStatus === "NOT_MEASURED") {
    unproven.push("Le graphe d'import est NOT_MEASURED; la cohésion relationnelle reste inconnue.");
  } else if (!imports.dispersedOutgoing) {
    unproven.push("Les imports transversaux mesurés ne forment pas plusieurs clusters de dépendances indépendants.");
  } else {
    unproven.push("Les clusters de dépendances ne prouvent pas à eux seuls des owners ou responsabilités métier distincts.");
  }
  return {
    measured: {
      directFiles: direct,
      recursiveFiles: recursive,
      directShare: concentration,
      signals: signals.map(({ id, family, evidence }) => ({ id, family, evidence })),
      imports: {
        measurementStatus: imports.measurementStatus,
        internalRecursive: imports.internalRecursive,
        externalOutgoing: imports.externalOutgoing,
        externalIncoming: imports.externalIncoming,
        targetAreas: imports.outgoingTargetAreas,
        dependencyClusters: imports.dependencyClusters,
        internalShare: imports.internalShare,
      },
    },
    unproven,
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
  if (recursive > direct
    && recursive >= QUALITY_STRUCTURE_THRESHOLDS.significantRecursiveFiles
    && concentration > QUALITY_STRUCTURE_THRESHOLDS.directConcentrationShare) {
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
      { groupCount: functionalGroups.length, groups: functionalGroups, interpretation: "LEXICAL_PREFIXES_ONLY" },
    ));
  }
  if (direct >= QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles
    && importsMeasured.externalOutgoing >= QUALITY_STRUCTURE_THRESHOLDS.minimumCrossFolderRelations
    && importsMeasured.outgoingTargetAreas.length >= 2) {
    signals.push(signal(
      "CROSS_FOLDER_IMPORTS",
      "coupling",
      "les dépendances sortantes mesurées traversent plusieurs zones de chemins ; cela ne prouve pas une dispersion fonctionnelle",
      {
        externalOutgoing: importsMeasured.externalOutgoing,
        externalIncoming: importsMeasured.externalIncoming,
        outgoingSourcePrefixes: importsMeasured.outgoingSourceGroups,
        sourceGrouping: "LEXICAL_PREFIXES_ONLY",
        outgoingTargetAreas: importsMeasured.outgoingTargetAreas,
        dependencyClusters: importsMeasured.dependencyClusters,
        threshold: QUALITY_STRUCTURE_THRESHOLDS.minimumCrossFolderRelations,
      },
    ));
  }
  if (direct >= QUALITY_STRUCTURE_THRESHOLDS.minimumFunctionalFiles
    && importsMeasured.dispersedOutgoing
    && importsMeasured.cohesionRelationTotal >= 4
    && importsMeasured.internalShare !== null
    && importsMeasured.internalShare <= 0.25) {
    signals.push(signal(
      "LOW_INTERNAL_COHESION",
      "cohesion",
      "les groupes fonctionnels sont peu reliés entre eux au regard de leurs dépendances sortantes",
      {
        internalRecursiveRelations: importsMeasured.internalRecursive,
        cohesionRelationTotal: importsMeasured.cohesionRelationTotal,
        externalIncomingExcluded: importsMeasured.externalIncoming,
        internalShare: importsMeasured.internalShare,
        maximumInternalShare: 0.25,
        dependencyClusters: importsMeasured.dependencyClusters,
      },
    ));
  }

  const families = [...new Set(signals.map((entry) => entry.family))].sort();
  const graphSignalPresent = signals.some((entry) => entry.family === "coupling" || entry.family === "cohesion");
  const independentGraphEvidence = importsMeasured.dispersedOutgoing === true;
  const reviewFamilies = [
    ...(families.includes("shape") ? ["shape"] : []),
    ...(graphSignalPresent && independentGraphEvidence ? ["graph"] : []),
  ];
  const reviewRequired = reviewFamilies.length >= QUALITY_STRUCTURE_THRESHOLDS.minimumConcordantFamilies;
  const proof = reviewProof({ direct, recursive, concentration, signals, imports: importsMeasured });
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
      reason: reviewRequired
        ? `les familles ${reviewFamilies.join(" + ")} concordent sur les mesures citées ; aucune réorganisation automatique`
        : graphSignalPresent && !independentGraphEvidence
          ? "les imports transversaux sont mesurés mais ne prouvent pas une dispersion entre clusters indépendants"
          : importsMeasured.measurementStatus === "NOT_MEASURED"
            ? "NOT_MEASURED : le graphe d'import ne permet pas d'établir la cohésion"
            : "les mesures ne forment pas deux familles indépendantes suffisantes pour recommander une réorganisation",
      evidence: reviewRequired ? { directFiles, recursiveFiles } : { directFiles: [], recursiveFiles: [] },
      proof,
    },
    reviewFamilies,
    exception: null,
    humanDecision: null,
  };
}

export function analyzeQualityStructure({ folderMeasures, imports, architecture = null } = {}) {
  if (!folderMeasures || !Array.isArray(folderMeasures.folders)) throw new Error("folderMeasures absent pour l'analyse structurelle.");
  const folders = folderMeasures.folders.map((folder) => analyzeFolder(folder, imports, architecture));
  const reviewed = folders.filter((folder) => folder.review.required);
  const signalCounts = Object.fromEntries([...new Set(folders.flatMap((folder) => folder.signals.map((entry) => entry.id)))].sort().map((id) => [id, folders.reduce((count, folder) => count + (folder.signals.some((entry) => entry.id === id) ? 1 : 0), 0)]));
  const importGraphMeasured = imports?.available !== false && Array.isArray(imports?.edges);
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
      concordantFamilyCount: reviewed.reduce((sum, folder) => sum + folder.reviewFamilies.length, 0),
      signalCounts,
      importEdgesMeasured: importGraphMeasured ? imports.edges.length : null,
      unresolvedLocalImports: importGraphMeasured ? imports.unresolvedLocalImports ?? null : null,
      excludedLocalImports: importGraphMeasured ? imports.excludedLocalImports ?? null : null,
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

function markdownBulletValue(section, label) {
  const lines = String(section ?? "").split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s*-\\s*\\*\\*${label}\\*\\*\\s*:`).test(line));
  if (start < 0) return null;
  const firstLine = lines[start].replace(new RegExp(`^\\s*-\\s*\\*\\*${label}\\*\\*\\s*:\\s*`), "");
  const continuation = [];
  for (let index = start + 1; index < lines.length && !/^\s*(?:-\s+\*\*|#{1,6}\s)/.test(lines[index]); index += 1) {
    continuation.push(lines[index].trim());
  }
  return [firstLine.trim(), ...continuation].filter(Boolean).join(" ").replace(/\s+/g, " ");
}

export function parseQualityStructureDecisions(content) {
  const text = String(content ?? "");
  const headings = [...text.matchAll(/^### `([^`]+)`\s*$/gm)];
  return headings.map((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? text.length;
    const section = text.slice(start, end);
    const classificationValue = markdownBulletValue(section, "Classification");
    const reviewValue = markdownBulletValue(section, "SHA de revue");
    const classification = classificationValue?.match(/^`?([A-Z][A-Z0-9_]*)`?/)?.[1] ?? null;
    const reviewedSha = reviewValue?.match(/\b[a-f0-9]{40}\b/i)?.[0] ?? null;
    if (!classification || !reviewedSha) return null;
    const description = classificationValue.replace(/^\s*`?[A-Z][A-Z0-9_]*`?\s*[—–-]?\s*/, "").trim();
    return {
      path: heading[1],
      classification,
      description,
      justification: markdownBulletValue(section, "Justification observable"),
      reviewedSha,
      reviewedScope: reviewValue?.match(/\(([^)]+)\)/)?.[1] ?? null,
      reexaminationCondition: markdownBulletValue(section, "Condition de réexamen"),
      source: HUMAN_DECISIONS_PATH,
      sourceLine: text.slice(0, heading.index).split(/\r?\n/).length,
    };
  }).filter(Boolean);
}

function attachHumanDecisionAnnotations(report, decisions) {
  const byPath = new Map(decisions.map((decision) => [decision.path, decision]));
  const folders = report.folders.map((folder) => {
    const decision = byPath.get(folder.path);
    if (!decision) return folder;
    return {
      ...folder,
      humanDecision: {
        ...decision,
        reviewedSameSha: decision.reviewedSha === report.auditedHead,
        annotationOnly: true,
      },
    };
  });
  return {
    ...report,
    folders,
    foldersRequiringReview: folders.filter((folder) => folder.review.required),
    summary: {
      ...report.summary,
      humanDecisionAnnotations: folders.filter((folder) => folder.humanDecision).length,
    },
  };
}

export function buildQualityStructureFromRepository({ root, auditedSha = "HEAD", architecture = null, now = () => new Date().toISOString(), runId = null, scope = "all" } = {}) {
  const activeScope = scope ?? "all";
  const architectureAudit = buildArchitectureAudit({ root, ref: auditedSha, now, scanRoots: structureScanRoots(activeScope) });
  const report = analyzeQualityStructure({ folderMeasures: architectureAudit.folderMeasures, imports: architectureAudit.imports, architecture });
  report.auditedHead = architectureAudit.sourceSha;
  const sourceView = createRepositoryView({ root, ref: auditedSha });
  const decisions = sourceView.exists(HUMAN_DECISIONS_PATH)
    ? parseQualityStructureDecisions(sourceView.readText(HUMAN_DECISIONS_PATH))
    : [];
  return {
    ...attachHumanDecisionAnnotations(report, decisions),
    auditedHead: architectureAudit.sourceSha,
    runId,
    scope: activeScope,
  };
}

export function qualityStructureOutputPath({ root, auditedHead, scope = "all" } = {}) {
  const activeScope = scope ?? "all";
  structureScanRoots(activeScope);
  const scopeSuffix = activeScope === "all" ? "structure.json" : `${activeScope}/structure.json`;
  return path.resolve(root, "artifacts", "quality-structure", auditedHead, scopeSuffix);
}

function structureSignalNature(folders) {
  const counts = new Map();
  for (const folder of folders) {
    for (const family of new Set(folder.signals.map((entry) => entry.family))) counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([family, count]) => `${family} ${count}`).join(", ") || "aucun signal";
}

export function formatQualityStructureSummary(report, { maxReviews = 6 } = {}) {
  const lines = [
    "Structure audit — synthèse humaine",
    `SHA: ${report?.auditedHead ?? "NOT_MEASURED"} | scope: ${report?.scope ?? "NOT_MEASURED"} | runId: ${report?.runId ?? "NOT_MEASURED"}`,
    `Statut: ${report?.status ?? "NOT_MEASURED"} | blocking: ${report?.blocking ?? "NOT_MEASURED"}`,
  ];
  if (!report || report.measurementStatus === "NOT_MEASURED" || report.status === "NOT_MEASURED") {
    lines.push(`Raison: ${report?.reason ?? "Aucune mesure structurelle disponible."}`);
    return lines.join("\n");
  }

  const folders = report.folders ?? [];
  const summary = report.summary ?? {};
  const notMeasured = folders.filter((folder) => folder.imports?.measurementStatus === "NOT_MEASURED").length;
  lines.push(
    `Dossiers: ${summary.foldersMeasured ?? folders.length} | avec signaux: ${summary.foldersWithSignals ?? "NOT_MEASURED"} | revue pertinente: ${summary.foldersRequiringReview ?? "NOT_MEASURED"} | signaux descriptifs: ${summary.descriptiveSignals ?? "NOT_MEASURED"}`,
    `Nature des signaux (dossiers): ${structureSignalNature(folders)}`,
    `Graphe imports: ${summary.importEdgesMeasured ?? "NOT_MEASURED"} arêtes mesurées | dossiers NOT_MEASURED: ${notMeasured} | décisions humaines annotées: ${summary.humanDecisionAnnotations ?? "NOT_MEASURED"}`,
  );

  const reviews = [...(report.foldersRequiringReview ?? [])].sort((left, right) =>
    right.files.direct - left.files.direct || left.path.localeCompare(right.path, "en"));
  if (reviews.length === 0 && (notMeasured > 0 || summary.importEdgesMeasured === null)) {
    lines.push(`Revue attendue: non déterminable pour ${notMeasured || "NOT_MEASURED"} dossier(s), car le graphe d'import n'est pas mesuré; aucune conclusion de cohésion.`);
  } else if (reviews.length === 0) lines.push("Revue attendue: aucune; les signaux descriptifs restent consultables dans le JSON.");
  else {
    lines.push(`Dossiers à examiner (${Math.min(reviews.length, maxReviews)} affichés sur ${reviews.length}) — décision attendue: confirmer ou réfuter une séparation structurelle à partir des clusters, sans réorganisation automatique.`);
    for (const folder of reviews.slice(0, maxReviews)) {
      const proof = folder.review?.proof ?? {};
      const measured = proof.measured ?? {};
      const imports = measured.imports ?? {};
      const signalIds = (folder.signals ?? []).map((entry) => entry.id).join(", ") || "NOT_MEASURED";
      const sourceFiles = (folder.review?.evidence?.directFiles ?? []).slice(0, 2).join(", ") || "NOT_MEASURED";
      const targetAreas = imports.targetAreas?.slice(0, 3).join(", ") ?? "NOT_MEASURED";
      const extraAreas = (imports.targetAreas?.length ?? 0) > 3 ? ` +${imports.targetAreas.length - 3}` : "";
      const evidence = `direct/récursif ${measured.directFiles ?? "NOT_MEASURED"}/${measured.recursiveFiles ?? "NOT_MEASURED"}; part directe ${measured.directShare ?? "NOT_MEASURED"}; imports internes/sortants ${imports.internalRecursive ?? "NOT_MEASURED"}/${imports.externalOutgoing ?? "NOT_MEASURED"}; clusters ${imports.dependencyClusters?.length ?? "NOT_MEASURED"}; cibles ${targetAreas}${extraAreas}; fichiers ${sourceFiles}`;
      lines.push(`- ${folder.path} — ${folder.review.reason}; nature: ${signalIds}; preuve: ${evidence}.`);
      for (const unknown of proof.unproven ?? []) lines.push(`  Non prouvé: ${unknown}`);
    }
    if (reviews.length > maxReviews) lines.push(`- … ${reviews.length - maxReviews} autres dossiers et leurs preuves dans le JSON.`);
  }

  const decisions = folders.filter((folder) => folder.humanDecision).sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (decisions.length) {
    lines.push("Décisions humaines (annotations seulement; aucune exclusion):");
    for (const folder of decisions) {
      const decision = folder.humanDecision;
      const shorten = (value, maxLength) => {
        const text = String(value ?? "NOT_MEASURED");
        return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
      };
      lines.push(`- ${folder.path}: ${decision.classification} | SHA ${decision.reviewedSha ?? "NOT_MEASURED"} (${decision.reviewedSameSha ? "même SHA" : "antérieur/différent"}; scope ${decision.reviewedScope ?? "NOT_MEASURED"}) | ${shorten(decision.justification, 170)} | réexamen: ${shorten(decision.reexaminationCondition, 100)} | ${decision.source ?? "source NOT_MEASURED"}:L${decision.sourceLine ?? "?"}`);
    }
  }
  lines.push("Preuves détaillées: signaux, chemins, relations et clusters dans le rapport JSON.");
  return lines.join("\n");
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
    const output = path.resolve(root, option(args, "output") ?? qualityStructureOutputPath({ root, auditedHead: report.auditedHead, scope: report.scope }));
    if (!dryRun) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    }
    console.log(`QUALITY_STRUCTURE_STATUS: ${report.status}`);
    console.log(`QUALITY_STRUCTURE_REVIEW_FOLDERS: ${report.summary.foldersRequiringReview}`);
    console.log(`QUALITY_STRUCTURE_SIGNALS: ${report.summary.descriptiveSignals}`);
    console.log(`QUALITY_STRUCTURE_MODE: ${dryRun ? "DRY_RUN" : "WRITE"}`);
    console.log(formatQualityStructureSummary(report));
    if (!dryRun) console.log(`QUALITY_STRUCTURE_OUTPUT: ${output}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
