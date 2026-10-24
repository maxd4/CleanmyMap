import fs from "node:fs";

import { createAuditPaths } from "../audits/quality-audit-storage.mjs";
import { validateDocumentationReport } from "../audits/documentation-maintainability.mjs";
import {
  QUALITY_GATE_INDEX_AUDITS,
  REPOSITORY_ROOT,
  RUN_ID_PATTERN,
  SHA_PATTERN,
} from "./quality-index-primitives.mjs";

function readJson(filePath, fsApi = fs) {
  try {
    return JSON.parse(fsApi.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Rapport quality illisible: ${filePath}: ${error.message}`);
  }
}

function assertOfflineIdentity(auditedSha, runId) {
  if (!SHA_PATTERN.test(auditedSha ?? "")) throw new Error(`SHA offline invalide: ${auditedSha}`);
  if (!RUN_ID_PATTERN.test(runId ?? "")) throw new Error(`runId offline invalide: ${runId}`);
}

function validateManifest(manifest, { audit, auditedSha, runId }) {
  if (!manifest || manifest.schemaVersion !== 1) throw new Error(`Manifest ${audit} absent ou schemaVersion invalide.`);
  for (const [field, expected] of [["audit", audit], ["auditedHead", auditedSha], ["runId", runId]]) {
    if (manifest[field] !== expected) throw new Error(`Manifest ${audit} incohérent: ${field}.`);
  }
  if (manifest.originMain !== null && manifest.originMain !== undefined && typeof manifest.originMain !== "string") {
    throw new Error(`Manifest ${audit} incohérent: originMain.`);
  }
  if (typeof manifest.readProvenance !== "string") throw new Error(`Manifest ${audit} sans readProvenance.`);
  if (!["PASS", "PASS_WITH_GRACE", "FAIL", "SKIPPED_BY_POLICY"].includes(manifest.status)) throw new Error(`Manifest ${audit} sans status valide.`);
  return manifest;
}

function reportStatus(audit, report) {
  if (report?.error) return "FAIL";
  if (typeof report?.status === "string") return report.status;
  if (audit === "cycles" && typeof report?.gateStatus === "string") return report.gateStatus === "PASS" ? "PASS" : "FAIL";
  return null;
}

function expectedOverallStatus(statuses) {
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("SKIPPED_BY_POLICY")) return "SKIPPED_BY_POLICY";
  if (statuses.includes("PASS_WITH_GRACE")) return "PASS_WITH_GRACE";
  return "PASS";
}

function validateReport(audit, report) {
  if (!report || typeof report !== "object") throw new Error(`Rapport ${audit} absent.`);
  if (report.error && typeof report.error === "object") return report;
  if (audit === "dead-code" && (!Array.isArray(report.currentFindings) || !report.comparison)) throw new Error("Rapport dead-code incomplet.");
  if (audit === "duplication" && !Array.isArray(report.results)) throw new Error("Rapport duplication incomplet.");
  if (audit === "top-heavy" && (!Array.isArray(report.rows) || !report.evaluation)) throw new Error("Rapport top-heavy incomplet.");
  if (audit === "complexity" && (!Array.isArray(report.metrics) || !report.result)) throw new Error("Rapport complexity incomplet.");
  if (audit === "cycles" && !report.error && (!Array.isArray(report.cycleObjects) || !report.comparison)) throw new Error("Rapport cycles incomplet.");
  if (audit === "maintainability" && (!Array.isArray(report.metrics) || !Array.isArray(report.findings) || !report.summary)) throw new Error("Rapport maintainability incomplet.");
  if (audit === "type-safety" && (!Array.isArray(report.findings) || !Array.isArray(report.diagnostics) || !Array.isArray(report.coverage) || !report.summary)) throw new Error("Rapport type-safety incomplet.");
  if (audit === "hotspots" && (!Array.isArray(report.files) || !report.methodology || !report.summary || !Array.isArray(report.diagnostics))) throw new Error("Rapport hotspots incomplet.");
  if (audit === "testability" && (!Array.isArray(report.domains) || !report.summary || !Array.isArray(report.diagnostics))) throw new Error("Rapport testability incomplet.");
  if (audit === "coverage" && (!Array.isArray(report.scopes) || !report.summary || !report.duplication || !Array.isArray(report.warnings) || !Array.isArray(report.diagnostics))) throw new Error("Rapport coverage incomplet.");
  return report;
}

function manifestPathExists(root, auditedSha, runId, audit, fsApi) {
  return fsApi.existsSync(createAuditPaths({ root, auditedHead: auditedSha, audit, runId }).manifest);
}

function readAudit({ root, auditedSha, runId, audit, fsApi }) {
  const paths = createAuditPaths({ root, auditedHead: auditedSha, audit, runId });
  const manifest = validateManifest(readJson(paths.manifest, fsApi), { audit, auditedSha, runId });
  const report = validateReport(audit, readJson(paths.report, fsApi));
  const measuredStatus = reportStatus(audit, report);
  if (measuredStatus && measuredStatus !== manifest.status) throw new Error(`Rapport ${audit} contradictoire avec son manifeste: status.`);
  try { fsApi.readFileSync(paths.summary, "utf8"); } catch { throw new Error(`Résumé ${audit} absent ou illisible.`); }
  return { audit, manifest, report, sourceFiles: [paths.manifest, paths.report, paths.summary] };
}

export function readOfflineQualityRun({ root = REPOSITORY_ROOT, auditedSha, runId, fsApi = fs } = {}) {
  assertOfflineIdentity(auditedSha, runId);
  const reports = {};
  const manifests = {};
  const sourceFiles = [];
  for (const audit of QUALITY_GATE_INDEX_AUDITS) {
    const entry = readAudit({ root, auditedSha, runId, audit, fsApi });
    manifests[audit] = entry.manifest;
    reports[audit] = entry.report;
    sourceFiles.push(...entry.sourceFiles);
  }
  const optionalAudits = ["maintainability", "type-safety", "hotspots", "testability", "coverage"].filter((audit) => manifestPathExists(root, auditedSha, runId, audit, fsApi));
  for (const audit of optionalAudits) {
    const entry = readAudit({ root, auditedSha, runId, audit, fsApi });
    manifests[audit] = entry.manifest;
    reports[audit] = entry.report;
    sourceFiles.push(...entry.sourceFiles);
  }

  const allEntry = readAudit({ root, auditedSha, runId, audit: "all", fsApi });
  const aggregateManifest = allEntry.manifest;
  const aggregateReport = allEntry.report;
  const expectedAudits = [...QUALITY_GATE_INDEX_AUDITS, ...optionalAudits];
  if (!Array.isArray(aggregateReport?.audits) || aggregateReport.audits.length !== expectedAudits.length) throw new Error("Rapport all incomplet: les cinq audits de gate et les auxiliaires présents sont attendus.");
  const aggregateAudits = new Map(aggregateReport.audits.map((entry) => [entry.audit, entry]));
  if (aggregateAudits.size !== expectedAudits.length || expectedAudits.some((audit) => !aggregateAudits.has(audit))) throw new Error("Rapport all incohérent: audit manquant ou dupliqué.");
  for (const audit of expectedAudits) {
    const entry = aggregateAudits.get(audit);
    if (!entry || typeof entry.status !== "string" || entry.status !== manifests[audit].status) throw new Error(`Rapport all incohérent: verdict ${audit}.`);
  }
  const individualStatuses = QUALITY_GATE_INDEX_AUDITS.map((audit) => manifests[audit].status);
  if (aggregateManifest.status !== expectedOverallStatus(individualStatuses)) throw new Error("Manifeste all incohérent: verdict global.");
  if (aggregateManifest.attentionRequired !== Object.values(manifests).some((manifest) => manifest.attentionRequired)) throw new Error("Manifeste all incohérent: attentionRequired.");
  sourceFiles.push(...allEntry.sourceFiles);
  const documentation = validateDocumentationReport(aggregateReport.documentation ?? null, { auditedSha, runId });
  const readProvenance = new Set(Object.values(manifests).map((manifest) => manifest.readProvenance));
  readProvenance.add(aggregateManifest.readProvenance);
  return { root, auditedSha, runId, reports, manifests, aggregateManifest, aggregateReport, documentation, sourceFiles, shaRoot: createAuditPaths({ root, auditedHead: auditedSha, audit: "all", runId }).shaRoot, provenance: readProvenance.size === 1 ? [...readProvenance][0] : "MIXED" };
}
