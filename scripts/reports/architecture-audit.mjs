#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { gitExecutable } from "../ci/git-executable.mjs";
import { createRepositoryView, parseRepositoryRef } from "../checks/repository-view.mjs";
import { collectArchitectureRows } from "../checks/top-heavy-measurement.mjs";
import { isAboveHard, isAboveReview } from "../checks/top-heavy-policy.mjs";
import { validateCoverageEvidence } from "../checks/coverage-evidence.mjs";
import { aggregateCoverage } from "../checks/coverage-policy.mjs";
import { readHumanDecisionsFromView } from "./generate-modularity-radar.mjs";

export const ARCHITECTURE_AUDIT_SCHEMA_VERSION = 3;
export const ARCHITECTURE_AUDIT_ROOT = "artifacts/architecture";
export const ARCHITECTURE_SCAN_ROOTS = Object.freeze(["apps/web/src", "apps/mobile", "scripts"]);
export const ARCHITECTURE_BASELINES = Object.freeze([
  "scripts/checks/complexity-baseline.json",
  "scripts/checks/duplication-metrics-baseline.json",
  "scripts/checks/cycles-baseline.json",
  "scripts/checks/coverage-baseline.json",
  "scripts/checks/coverage-mobile-baseline.json",
]);
const QUALITY_EVIDENCE = Object.freeze({
  complexity: "complexity",
  duplication: "duplication-runtime",
  cycles: "cycles",
});
const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IMPORT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const MODULARITY_PLAN = "documentation/architecture/monolith-split-plan.md";
const ACTION_CREATION_SHELL = "apps/web/src/components/actions/action-creation-shell.tsx";

function git(args, root) {
  return execFileSync(gitExecutable(), args, { cwd: root, encoding: "utf8" }).trim();
}

function isSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value ?? ""));
}

export function classifySourceRevision({ sourceSha, auditedSha, isAncestor = () => false }) {
  if (!isSha(sourceSha)) return "MISSING";
  if (sourceSha === auditedSha) return "CURRENT_SHA";
  return isAncestor(sourceSha, auditedSha) ? "ANCESTOR_BASELINE" : "STALE_SNAPSHOT";
}

export function classifySnapshotSource(sourceSha, auditedSha) {
  if (!isSha(sourceSha)) return "MISSING";
  return sourceSha === auditedSha ? "CURRENT_SHA" : "STALE_SNAPSHOT";
}

export function assertArchitectureAuditFresh(artifact, auditedSha) {
  if (!artifact || artifact.sourceSha !== auditedSha || artifact.freshness?.status !== "CURRENT_SHA") {
    throw new Error(`Architecture audit is not current for ${auditedSha}.`);
  }
  return artifact;
}

function readJsonFromView(view, relativePath) {
  if (!view.isFile(relativePath)) return null;
  try {
    return JSON.parse(view.readText(relativePath));
  } catch {
    return null;
  }
}

function readJsonFromFilesystem(root, relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8"));
  } catch {
    return null;
  }
}

function domainForFile(file) {
  const normalized = file.replaceAll("\\", "/");
  const prefixes = [
    ["apps/web/src/", "web"],
    ["apps/mobile/", "mobile"],
    ["scripts/", "scripts"],
  ];
  for (const [prefix, name] of prefixes) {
    if (normalized.startsWith(prefix)) return `${name}/${normalized.slice(prefix.length).split("/")[0] || "root"}`;
  }
  return normalized.split("/")[0] || "root";
}

function addDomainMeasure(target, row) {
  const domain = domainForFile(row.file);
  const kind = row.kind === "test" ? "tests" : row.kind === "runtime" ? "runtime" : row.kind;
  target[domain] ??= { files: { runtime: 0, tests: 0, "data/config": 0, generated: 0 }, loc: { runtime: 0, tests: 0, "data/config": 0, generated: 0 } };
  target[domain].files[kind] = (target[domain].files[kind] ?? 0) + 1;
  target[domain].loc[kind] = (target[domain].loc[kind] ?? 0) + row.lines;
}

function buildDomainMeasures(rows) {
  const domains = {};
  for (const row of rows) addDomainMeasure(domains, row);
  return Object.fromEntries(Object.entries(domains).sort(([left], [right]) => left.localeCompare(right)));
}

const FOLDER_KIND_KEYS = Object.freeze(["runtime", "tests", "other"]);

function folderKind(row) {
  return row.kind === "runtime" ? "runtime" : row.kind === "test" ? "tests" : "other";
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));
}

function scanRootForFile(file, scanRoots) {
  return scanRoots
    .filter((root) => file === root || file.startsWith(`${root}/`))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

function folderDepth(folder, root) {
  return folder === root ? 0 : folder.slice(root.length + 1).split("/").length;
}

function createFolderMeasure(pathName, root) {
  const kinds = () => Object.fromEntries(FOLDER_KIND_KEYS.map((key) => [key, 0]));
  return {
    path: pathName,
    root,
    directFiles: 0,
    recursiveFiles: 0,
    directKinds: kinds(),
    recursiveKinds: kinds(),
    maxFileDepth: folderDepth(pathName, root),
    reviewFiles: new Set(),
    deferredSplitFiles: new Set(),
  };
}

function ensureFolderMeasure(folders, pathName, root) {
  const key = pathName;
  if (!folders.has(key)) folders.set(key, createFolderMeasure(pathName, root));
  return folders.get(key);
}

function materializeFolderMeasure(folder) {
  const depth = folderDepth(folder.path, folder.root);
  const dominantKind = FOLDER_KIND_KEYS
    .slice()
    .sort((left, right) => folder.recursiveKinds[right] - folder.recursiveKinds[left] || FOLDER_KIND_KEYS.indexOf(left) - FOLDER_KIND_KEYS.indexOf(right))[0];
  const reasons = [
    folder.reviewFiles.size > 0 ? "REVIEW_FILE" : null,
    folder.deferredSplitFiles.size > 0 ? "DEFERRED_SPLIT" : null,
  ].filter(Boolean);
  return {
    path: folder.path,
    root: folder.root,
    depth: {
      relative: depth,
      maxFile: folder.maxFileDepth,
      span: Math.max(0, folder.maxFileDepth - depth),
    },
    files: {
      direct: folder.directFiles,
      recursive: folder.recursiveFiles,
    },
    kinds: {
      direct: folder.directKinds,
      recursive: folder.recursiveKinds,
    },
    concentration: {
      directFileShare: ratio(folder.directFiles, folder.recursiveFiles),
      dominantKind,
      dominantKindShare: ratio(folder.recursiveKinds[dominantKind], folder.recursiveFiles),
    },
    review: {
      required: reasons.length > 0,
      reasons,
      reviewFiles: [...folder.reviewFiles].sort((left, right) => left.localeCompare(right, "en")),
      deferredSplitFiles: [...folder.deferredSplitFiles].sort((left, right) => left.localeCompare(right, "en")),
    },
  };
}

export function buildFolderMeasures(rows, { scanRoots = ARCHITECTURE_SCAN_ROOTS, deferredSplit = [] } = {}) {
  const folders = new Map();
  const deferredSplitSet = new Set(deferredSplit);

  for (const row of rows) {
    const root = scanRootForFile(row.file, scanRoots);
    if (!root) continue;
    const directory = path.posix.dirname(row.file);
    const directoryParts = directory.split("/");
    const rootParts = root.split("/");
    const kind = folderKind(row);
    for (let index = rootParts.length; index <= directoryParts.length; index += 1) {
      const folderPath = directoryParts.slice(0, index).join("/");
      const folder = ensureFolderMeasure(folders, folderPath, root);
      folder.recursiveFiles += 1;
      folder.recursiveKinds[kind] += 1;
      folder.maxFileDepth = Math.max(folder.maxFileDepth, folderDepth(row.file, root));
      if (folderPath === directory) {
        folder.directFiles += 1;
        folder.directKinds[kind] += 1;
      }
      if (isAboveReview(row)) folder.reviewFiles.add(row.file);
      if (deferredSplitSet.has(row.file)) folder.deferredSplitFiles.add(row.file);
    }
  }

  const items = [...folders.values()]
    .map(materializeFolderMeasure)
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return {
    method: "architecture-source-inventory-and-existing-structural-signals",
    roots: [...scanRoots],
    filesConsidered: rows.length,
    folders: items,
    foldersRequiringReview: items
      .filter((folder) => folder.review.required)
      .map((folder) => ({
        path: folder.path,
        root: folder.root,
        depth: folder.depth,
        reasons: folder.review.reasons,
        reviewFiles: folder.review.reviewFiles,
        deferredSplitFiles: folder.review.deferredSplitFiles,
      })),
  };
}

function importSpecifiers(content) {
  const specs = [];
  for (const line of content.split(/\r?\n/)) {
    let cursor = 0;
    while (cursor < line.length) {
      const candidates = ["from", "import", "require"]
        .map((keyword) => ({ keyword, index: line.indexOf(keyword, cursor) }))
        .filter(({ index, keyword }) => index >= 0 && !/[A-Za-z0-9_$]/.test(line[index - 1] ?? "") && !/[A-Za-z0-9_$]/.test(line[index + keyword.length] ?? ""))
        .sort((left, right) => left.index - right.index);
      const marker = candidates[0];
      if (!marker) break;
      const doubleQuote = line.indexOf('"', marker.index + marker.keyword.length);
      const singleQuote = line.indexOf("'", marker.index + marker.keyword.length);
      const quoteStart = doubleQuote >= 0 && (singleQuote < 0 || doubleQuote < singleQuote) ? doubleQuote : singleQuote;
      if (quoteStart < 0) break;
      const quoteEnd = line.indexOf(line[quoteStart], quoteStart + 1);
      if (quoteEnd <= quoteStart + 1) {
        cursor = quoteStart + 1;
        continue;
      }
      specs.push(line.slice(quoteStart + 1, quoteEnd));
      cursor = quoteEnd + 1;
    }
  }
  return specs;
}

function resolveImport(view, importer, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const base = specifier.startsWith("@/")
    ? `apps/web/src/${specifier.slice(2)}`
    : path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  const candidates = [base, ...IMPORT_EXTENSIONS.map((extension) => `${base}${extension}`), ...IMPORT_EXTENSIONS.map((extension) => `${base}/index${extension}`)];
  return candidates.find((candidate) => view.isFile(candidate)) ?? null;
}

export function collectImportGraph(view, rows) {
  const sourceFiles = rows
    .map((row) => row.file)
    .filter((file) => CODE_EXTENSIONS.has(path.posix.extname(file)));
  const sourceFileSet = new Set(sourceFiles);
  const outgoing = new Map(sourceFiles.map((file) => [file, new Set()]));
  let unresolvedLocalImports = 0;
  let excludedLocalImports = 0;
  for (const file of sourceFiles) {
    for (const specifier of importSpecifiers(view.readText(file))) {
      const resolved = resolveImport(view, file, specifier);
      if (resolved && sourceFileSet.has(resolved)) outgoing.get(file).add(resolved);
      else if (resolved) excludedLocalImports += 1;
      else if (specifier.startsWith(".") || specifier.startsWith("@/")) unresolvedLocalImports += 1;
    }
  }
  const incoming = new Map(sourceFiles.map((file) => [file, 0]));
  for (const targets of outgoing.values()) for (const target of targets) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  const modules = sourceFiles.map((file) => ({
    file,
    domain: domainForFile(file),
    importsOut: outgoing.get(file).size,
    importsIn: incoming.get(file) ?? 0,
  }));
  const byDomain = {};
  for (const module of modules) {
    byDomain[module.domain] ??= { importsIn: 0, importsOut: 0, modules: 0 };
    byDomain[module.domain].importsIn += module.importsIn;
    byDomain[module.domain].importsOut += module.importsOut;
    byDomain[module.domain].modules += 1;
  }
  return {
    method: "static-relative-and-alias-imports",
    available: true,
    unresolvedLocalImports,
    excludedLocalImports,
    byDomain: Object.fromEntries(Object.entries(byDomain).sort(([left], [right]) => left.localeCompare(right))),
    modules,
  };
}

function classifyReportSource({ sourceSha, auditedSha, classify }) {
  return {
    sourceSha: sourceSha ?? null,
    status: classifySourceRevision({ sourceSha, auditedSha, isAncestor: classify }),
  };
}

function readBaselineInventory(view, auditedSha, classify) {
  return Object.fromEntries(ARCHITECTURE_BASELINES.map((file) => {
    const baseline = readJsonFromView(view, file);
    const sourceSha = baseline?.sourceCommit ?? baseline?.sourceSha ?? baseline?.sourceRef ?? null;
    return [file, {
      sourceCommit: baseline?.sourceCommit ?? null,
      ...classifyReportSource({ sourceSha, auditedSha, classify }),
      sourceRef: baseline?.sourceRef ?? null,
      schemaVersion: baseline?.schemaVersion ?? null,
    }];
  }));
}

export function readModularitySnapshot(view, auditedSha) {
  const markdown = view.isFile(MODULARITY_PLAN) ? view.readText(MODULARITY_PLAN) : "";
  const sourceRef = markdown.match(/`RADAR_REF=([0-9a-f]{40})`/m)?.[1] ?? null;
  const decisionSource = readHumanDecisionsFromView(view, { requireRegistry: markdown.includes("modularity-decisions.md") });
  const deferred = decisionSource.decisions
    .filter((entry) => entry.ARCHITECTURE_DECISION === "DEFERRED_SPLIT")
    .map((entry) => entry.file)
    .sort((left, right) => left.localeCompare(right, "en"));
  return {
    sourceSha: sourceRef,
    status: classifySnapshotSource(sourceRef, auditedSha),
    sourceRef,
    generatedAt: markdown.match(/`RADAR_GENERATED_AT=([^`]+)`/m)?.[1] ?? null,
    decisionSource: decisionSource.sourcePath,
    deferredSplit: deferred,
  };
}

function qualityEvidence(root, auditedSha, key, worktreeClean) {
  const relativePath = `artifacts/quality-evidence/${key}.json`;
  const evidence = readJsonFromFilesystem(root, relativePath);
  const sourceSha = evidence?.candidateSha ?? null;
  const status = classifySnapshotSource(sourceSha, auditedSha);
  return {
    sourceSha,
    status,
    available: status === "CURRENT_SHA" && evidence?.executed === true && worktreeClean,
    availabilityReason: !worktreeClean ? "WORKTREE_NOT_CLEAN" : evidence?.executed !== true ? "EVIDENCE_NOT_EXECUTED" : null,
    gateStatus: evidence?.status ?? null,
    metrics: evidence?.metrics ?? null,
    baseline: evidence?.baseline ?? null,
  };
}

export function coverageAvailability({
  root,
  view,
  auditedSha,
  auditedHead,
  classify,
  scope,
  baselineFile,
  worktreeClean,
  validateEvidence = validateCoverageEvidence,
}) {
  const baseline = readJsonFromView(view, baselineFile);
  const sourceSha = baseline?.sourceCommit ?? null;
  const evidencePath = scope === "web" ? "apps/web/coverage/coverage-evidence.json" : "apps/mobile/coverage/coverage-evidence.json";
  const summaryPath = scope === "web" ? "apps/web/coverage/coverage-summary.json" : "apps/mobile/coverage/coverage-summary.json";
  const evidence = readJsonFromFilesystem(root, evidencePath);
  const evidenceSourceSha = evidence?.gitHead ?? evidence?.candidateSha ?? null;
  const evidenceStatus = classifySnapshotSource(evidenceSourceSha, auditedSha);
  const result = {
    baseline: classifyReportSource({ sourceSha, auditedSha, classify }),
    available: false,
    availabilityReason: null,
    evidencePath,
    evidenceSourceSha,
    evidenceStatus,
    proofStatus: "MISSING",
    metrics: null,
  };

  if (scope !== "web") {
    result.availabilityReason = evidence
      ? "VALIDATION_NOT_PRODUCED_FOR_SCOPE"
      : auditedSha !== auditedHead
        ? "UNVERIFIABLE_HISTORICAL_REFERENCE"
        : "EVIDENCE_NOT_PRODUCED";
    result.proofStatus = evidence ? "UNVERIFIED" : "MISSING";
    return result;
  }

  if (auditedSha !== auditedHead) {
    result.availabilityReason = "UNVERIFIABLE_HISTORICAL_REFERENCE";
    result.proofStatus = evidenceStatus === "MISSING" ? "MISSING" : "UNVERIFIED";
    return result;
  }
  if (!worktreeClean) {
    result.availabilityReason = "WORKTREE_NOT_CLEAN";
    result.proofStatus = evidenceStatus === "MISSING" ? "MISSING" : "UNVERIFIED";
    return result;
  }
  if (!evidence || !readJsonFromFilesystem(root, summaryPath)) {
    result.availabilityReason = "EVIDENCE_MISSING";
    return result;
  }
  if (evidenceStatus !== "CURRENT_SHA") {
    result.availabilityReason = "EVIDENCE_STALE_OR_INCOHERENT";
    result.proofStatus = "STALE_OR_INCOHERENT";
    return result;
  }

  try {
    const validatedEvidence = validateEvidence({ repositoryRoot: root });
    const summary = readJsonFromFilesystem(root, summaryPath);
    result.metrics = aggregateCoverage(summary, { scope });
    result.evidenceSourceSha = validatedEvidence.gitHead ?? evidenceSourceSha;
    result.available = result.evidenceSourceSha === auditedSha;
    result.availabilityReason = result.available ? null : "EVIDENCE_SHA_MISMATCH";
    result.proofStatus = result.available ? "VALID" : "STALE_OR_INCOHERENT";
  } catch {
    result.availabilityReason = "EVIDENCE_INVALID_OR_INCOHERENT";
    result.proofStatus = "STALE_OR_INCOHERENT";
  }
  return result;
}

export function buildArchitectureAudit({ root = process.cwd(), ref = "HEAD", now = () => new Date().toISOString(), gitRunner = git } = {}) {
  const requested = ref || "HEAD";
  const sourceSha = gitRunner(["rev-parse", "--verify", `${requested}^{commit}`], root);
  const headSha = gitRunner(["rev-parse", "HEAD"], root);
  const worktree = gitRunner(["status", "--short"], root);
  const worktreeClean = worktree.length === 0;
  const classify = (source, audited) => {
    try {
      gitRunner(["merge-base", "--is-ancestor", source, audited], root);
      return true;
    } catch {
      return false;
    }
  };
  const view = createRepositoryView({ root, ref: sourceSha });
  const rows = collectArchitectureRows(view, ARCHITECTURE_SCAN_ROOTS);
  const largeModules = rows
    .filter((row) => isAboveReview(row))
    .sort((left, right) => right.lines - left.lines || right.bytes - left.bytes || left.file.localeCompare(right.file))
    .map((row) => ({ file: row.file, kind: row.kind, lines: row.lines, bytes: row.bytes, severity: isAboveHard(row) ? "HARD" : "REVIEW" }));
  const actionShell = rows.find((row) => row.file === ACTION_CREATION_SHELL) ?? null;
  const radarSource = readModularitySnapshot(view, sourceSha);
  const folderMeasures = buildFolderMeasures(rows, { deferredSplit: radarSource.deferredSplit });
  const quality = Object.fromEntries(Object.entries(QUALITY_EVIDENCE).map(([name, key]) => [name, qualityEvidence(root, sourceSha, key, worktreeClean)]));
  quality.duplication = {
    scopes: Object.fromEntries(["runtime", "tests", "fixtures-data"].map((scope) => [scope, qualityEvidence(root, sourceSha, `duplication-${scope}`, worktreeClean)])),
  };
  const artifact = {
    schemaVersion: ARCHITECTURE_AUDIT_SCHEMA_VERSION,
    sourceSha,
    date: now(),
    freshness: {
      auditedHead: headSha,
      worktreeClean,
      requestedRef: requested,
      status: sourceSha === headSha ? "CURRENT_SHA" : "HISTORICAL_SNAPSHOT",
    },
    sourceReports: {
      baselines: readBaselineInventory(view, sourceSha, classify),
      modularityPlan: radarSource,
    },
    domains: buildDomainMeasures(rows),
    folderMeasures,
    largeModules,
    complexity: quality.complexity,
    imports: collectImportGraph(view, rows),
    cycles: quality.cycles,
    duplication: quality.duplication,
    coverage: {
      web: coverageAvailability({ root, view, auditedSha: sourceSha, auditedHead: headSha, classify, scope: "web", baselineFile: "scripts/checks/coverage-baseline.json", worktreeClean }),
      mobile: coverageAvailability({ root, view, auditedSha: sourceSha, auditedHead: headSha, classify, scope: "mobile", baselineFile: "scripts/checks/coverage-mobile-baseline.json", worktreeClean }),
    },
    modularityReview: {
      historicalDeferredSplit: radarSource.deferredSplit,
      foldersRequiringReview: folderMeasures.foldersRequiringReview,
      actionCreationShell: actionShell
        ? { file: actionShell.file, lines: actionShell.lines, bytes: actionShell.bytes, kind: actionShell.kind, reviewRequired: isAboveReview(actionShell) }
        : { file: ACTION_CREATION_SHELL, present: false },
    },
  };
  return artifact;
}

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export function main(args = process.argv.slice(2)) {
  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const ref = parseRepositoryRef(args) ?? "HEAD";
    const artifact = buildArchitectureAudit({ root, ref });
    const output = path.resolve(root, option(args, "output") ?? `${ARCHITECTURE_AUDIT_ROOT}/${artifact.sourceSha}/architecture.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    if (args.includes("--require-current")) assertArchitectureAuditFresh(artifact, artifact.freshness.auditedHead);
    console.log(`ARCHITECTURE_AUDIT_STATUS: ${artifact.freshness.status}`);
    console.log(`ARCHITECTURE_AUDIT_SHA: ${artifact.sourceSha}`);
    console.log(`ARCHITECTURE_AUDIT_OUTPUT: ${output}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && currentFile === path.resolve(process.argv[1])) main();
