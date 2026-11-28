import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";
import { resolveCandidateShaFromRef, writeQualityEvidence } from "./quality-evidence.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE_ROOT = "artifacts/security-evidence";
const scanExtensions = new Set([".md", ".mdx", ".txt", ".yml", ".yaml", ".html", ".htm"]);
const internalOnlyReferences = [
  /\bAGENTS\.md\b/i,
  /\bproject_context\.md\b/i,
  /\bsessions?[\\/]/i,
  /\brapport_IA[\\/]/i,
  /\bplans?[\\/]/i,
  /\boperations[\\/]agent-memory-governance\.md\b/i,
  /\boperations[\\/]session-standard-runbook\.md\b/i,
  /backups[\\/]actions-backup-2026-04-24T07-54-44\.951Z\.json/i,
  /maintenance[\\/]python[\\/]data[\\/]cleanmymap\.db/i,
];
const dependencyAdvisoryGovernancePath = "documentation/security/dependency-advisory-governance.md";
const requiredDependencyAdvisoryGovernanceMarkers = [
  "GHSA-w3rx-r6r6-pgpr", "CVE-2025-71330", "GHSA-5p2g-fcmc-qvqq", "CVE-2025-71329",
  "GHSA-528h-pc64-c93x", "CVE-2026-71429", "image-size@2.0.3", "apps/mobile/vendor/image-size",
  "stream-json ^1.9.1", "apps/mobile/vendor/stream-json", "jayson@4.3.0", "StreamValues", "Verifier",
  "Les modules de filtres", "release upstream compatible", "n'est pas une release npm upstream",
  "metro@0.84.5", "metro@0.87.0", "version contenant les deux correctifs", "apps/web",
  "Aucun asset non fiable ne doit entrer dans un build Metro.",
];

function documentMetadata(content) {
  const header = content.split(/\r?\n/).slice(0, 40).join("\n");
  const status = header.match(/(?:statut documentaire|document status|type)\s*:?[^\n]{0,80}\b(CURRENT|PLAN|AUDIT|HISTORY|SNAPSHOT|ADR|GENERATED)\b/i)?.[1]?.toUpperCase() ?? "UNSPECIFIED";
  const audience = header.match(/(?:audience|destination|publication)\s*:?\s*([^\n]+)/i)?.[1]?.trim().toLowerCase() ?? "";
  return { status, audience };
}

function isPublicDestination(filePath, content) {
  const { audience } = documentMetadata(content);
  return /\b(public|site|website|web public|publication publique)\b/i.test(audience)
    || filePath.startsWith("documentation/legal/");
}

function lineSnippets(content, pattern) {
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(pattern);
    return match ? [{ line: index + 1, snippet: line.trim() }] : [];
  });
}

function validateDependencyAdvisoryGovernance(view) {
  if (!view.exists(dependencyAdvisoryGovernancePath)) return ["canonical security governance source is missing"];
  const content = view.readText(dependencyAdvisoryGovernancePath);
  const issues = requiredDependencyAdvisoryGovernanceMarkers.filter((marker) => !content.includes(marker)).map((marker) => `missing marker: ${marker}`);
  for (const marker of ["Date de décision", "Date de réévaluation au plus tard", "L'acceptation expire", "acceptation temporaire"]) {
    if (content.includes(marker)) issues.push(`obsolete temporary acceptance marker: ${marker}`);
  }
  return issues;
}

function hasHistoryStatus(content) {
  return documentMetadata(content).status === "HISTORY";
}

export function findConcurrentActiveRoadmaps(view) {
  const paths = view.listFiles("documentation/product").filter((filePath) => /(^|\/)roadmap[^/]*\.md$/i.test(filePath));
  const active = paths.filter((filePath) => !hasHistoryStatus(view.readText(filePath)));
  return active.length <= 1 ? [] : [{
    file: "documentation/product", line: 1, pattern: "concurrent-active-roadmaps", severity: "BLOCKING",
    snippet: `Multiple roadmap documents are active without a distinct HISTORY status: ${active.join(", ")}`,
  }];
}

const discoveryIndexFiles = ["documentation/development/AI_DEVELOPER_GUIDE.md", "documentation/database/README.md"];
export function validateDiscoveryIndexLinks(view) {
  const issues = [];
  for (const indexFile of discoveryIndexFiles) {
    if (!view.exists(indexFile)) continue;
    const lines = view.readText(indexFile).split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      for (const match of lines[i].matchAll(/\[[^\]]+\]\(([^)#?\s]+)(?:#[^)\s]*)?\)/g)) {
        const rawTarget = match[1];
        if (/^(?:https?:|mailto:|data:)/i.test(rawTarget)) continue;
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(indexFile), rawTarget));
        if (resolved.startsWith("..")) continue;
        const prefix = resolved.replace(/\/$/, "");
        const exists = rawTarget.endsWith("/") ? view.listFiles(prefix).length > 0 : view.exists(resolved) || view.listFiles(prefix).length > 0;
        if (!exists) issues.push({ file: indexFile, line: i + 1, pattern: "broken-discovery-link", severity: "WARNING", snippet: `${rawTarget} -> ${resolved} (missing target)` });
      }
    }
  }
  return issues;
}

export function validateDocumentationGovernance(view) {
  const findings = [...findConcurrentActiveRoadmaps(view), ...validateDiscoveryIndexLinks(view)];
  for (const filePath of view.listFiles("documentation")) {
    if (!scanExtensions.has(path.posix.extname(filePath).toLowerCase())) continue;
    const content = view.readText(filePath);
    if (!isPublicDestination(filePath, content)) continue;
    const { status } = documentMetadata(content);
    const severity = ["PLAN", "AUDIT", "HISTORY", "SNAPSHOT"].includes(status) ? "WARNING" : "BLOCKING";
    for (const pattern of internalOnlyReferences) {
      for (const match of lineSnippets(content, pattern)) {
        findings.push({ file: filePath, line: match.line, pattern: "internal-reference-in-public-destination", severity, snippet: `${match.snippet} (document status: ${status}; audience: public)` });
      }
    }
  }
  for (const issue of validateDependencyAdvisoryGovernance(view)) findings.push({
    file: dependencyAdvisoryGovernancePath, line: 1, pattern: "canonical-security-governance", severity: "BLOCKING", snippet: issue,
  });
  return findings;
}

function main() {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: repoRoot, ref });
  const findings = validateDocumentationGovernance(view);
  const blocking = findings.filter(({ severity }) => severity === "BLOCKING");
  const warnings = findings.filter(({ severity }) => severity === "WARNING");
  const status = blocking.length ? "FAIL" : warnings.length ? "PASS_WITH_WARNINGS" : "PASS";
  writeQualityEvidence({
    repositoryRoot: repoRoot, evidenceRoot: EVIDENCE_ROOT, fileKey: "documentation-governance", gate: "documentation-governance",
    candidateSha: resolveCandidateShaFromRef(repoRoot, ref), candidateRef: ref ?? "HEAD", status,
    findings: blocking.length, metrics: { warningCount: warnings.length }, details: { warnings },
  });
  console.log(`DOCUMENTATION_GOVERNANCE: ${status}${ref ? ` ref=${ref}` : ""} blocking=${blocking.length} warnings=${warnings.length}`);
  for (const finding of findings) {
    const print = finding.severity === "WARNING" ? console.warn : console.error;
    print(` - ${finding.file}:${finding.line} [${finding.severity}] ${finding.pattern}: ${finding.snippet}`);
  }
  if (blocking.length) process.exitCode = 1;
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedFile) {
  try { main(); } catch (error) {
    console.error(`DOCUMENTATION_GOVERNANCE: BLOCKED ${error instanceof Error ? error.message : String(error)}`);
    try {
      const ref = parseRepositoryRef();
      writeQualityEvidence({
        repositoryRoot: repoRoot, evidenceRoot: EVIDENCE_ROOT, fileKey: "documentation-governance", gate: "documentation-governance",
        candidateSha: resolveCandidateShaFromRef(repoRoot, ref ?? "HEAD"), candidateRef: ref ?? "HEAD", status: "BLOCKED",
        findings: null, metrics: {}, details: { executionError: error?.constructor?.name ?? "Error" },
      });
    } catch { /* Preserve the blocked exit even when candidate evidence cannot be attached. */ }
    process.exitCode = 2;
  }
}
