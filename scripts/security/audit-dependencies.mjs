#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "../..");
const GOVERNANCE_DOCUMENT = "documentation/security/dependency-advisory-governance.md";

export const AUDIT_SEVERITIES = Object.freeze(["high", "critical"]);

// These are exact, repository-owned backports. No wildcard, package-wide, or
// severity-wide exception belongs in this registry.
export const EXPLICIT_MITIGATIONS = Object.freeze([
  Object.freeze({
    advisory: "GHSA-w3rx-r6r6-pgpr",
    packageName: "image-size",
    version: "2.0.3",
    path: "apps/mobile/vendor/image-size",
    documentation: GOVERNANCE_DOCUMENT,
    verification: "apps/mobile/security/image-size-security.test.mjs",
  }),
  Object.freeze({
    advisory: "GHSA-5p2g-fcmc-qvqq",
    packageName: "image-size",
    version: "2.0.3",
    path: "apps/mobile/vendor/image-size",
    documentation: GOVERNANCE_DOCUMENT,
    verification: "apps/mobile/security/image-size-security.test.mjs",
  }),
  Object.freeze({
    advisory: "GHSA-528h-pc64-c93x",
    packageName: "stream-json",
    version: "1.9.1",
    path: "apps/mobile/vendor/stream-json",
    documentation: GOVERNANCE_DOCUMENT,
    verification: "apps/mobile/security/stream-json-jayson-security.test.mjs",
  }),
]);

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function advisoryIdFromDetail(detail) {
  if (!detail || typeof detail !== "object") return null;
  const candidates = [detail.url, detail.advisory, detail.id, detail.source];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const match = candidate.match(/((?:GHSA|CVE)-[A-Za-z0-9-]+)/i);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function auditDetails(vulnerability) {
  const details = Array.isArray(vulnerability?.via)
    ? vulnerability.via.filter((entry) => entry && typeof entry === "object")
    : [];
  return details.length > 0 ? details : [null];
}

function resolveLockfilePackage(nodePath, packages) {
  let currentPath = normalizePath(nodePath);
  for (let depth = 0; depth < 4; depth += 1) {
    const entry = packages[currentPath];
    if (!entry || entry.link !== true || typeof entry.resolved !== "string") {
      return {
        path: currentPath,
        version: entry?.version ?? null,
      };
    }
    currentPath = normalizePath(entry.resolved);
  }
  return { path: currentPath, version: packages[currentPath]?.version ?? null };
}

function findingNodes(packageKey, vulnerability) {
  if (Array.isArray(vulnerability?.nodes) && vulnerability.nodes.length > 0) {
    return vulnerability.nodes;
  }
  return [`node_modules/${packageKey}`];
}

export function extractAuditFindings(auditReport, lockfile = {}) {
  const vulnerabilities = auditReport?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object") return [];
  const packages = lockfile?.packages && typeof lockfile.packages === "object"
    ? lockfile.packages
    : {};
  const findings = [];

  for (const [packageKey, vulnerability] of Object.entries(vulnerabilities)) {
    for (const node of findingNodes(packageKey, vulnerability)) {
      const resolved = resolveLockfilePackage(node, packages);
      for (const detail of auditDetails(vulnerability)) {
        findings.push({
          advisory: advisoryIdFromDetail(detail),
          packageName: vulnerability.name ?? packageKey,
          version: resolved.version,
          path: resolved.path,
          severity: String(detail?.severity ?? vulnerability.severity ?? "unknown").toLowerCase(),
          title: detail?.title ?? `npm audit finding for ${packageKey}`,
          url: detail?.url ?? null,
          source: detail?.source ?? null,
        });
      }
    }
  }

  const unique = new Map();
  for (const finding of findings) {
    const key = [
      finding.advisory ?? "UNKNOWN",
      finding.packageName,
      finding.version ?? "UNKNOWN",
      finding.path,
    ].join("|");
    unique.set(key, finding);
  }
  return [...unique.values()];
}

function mitigationMatches(finding, mitigation) {
  return finding.advisory?.toUpperCase() === mitigation.advisory.toUpperCase()
    && finding.packageName === mitigation.packageName
    && finding.version === mitigation.version
    && finding.path === mitigation.path;
}

export function validateMitigationRegistry(repositoryRoot = REPO_ROOT) {
  const seen = new Set();
  for (const mitigation of EXPLICIT_MITIGATIONS) {
    const fields = [mitigation.advisory, mitigation.packageName, mitigation.version, mitigation.path];
    if (fields.some((field) => typeof field !== "string" || field.length === 0 || field.includes("*"))) {
      throw new Error("Invalid dependency advisory mitigation registry entry");
    }
    const key = fields.join("|");
    if (seen.has(key)) throw new Error(`Duplicate dependency advisory mitigation: ${key}`);
    seen.add(key);

    for (const relativePath of [mitigation.documentation, mitigation.verification]) {
      const absolutePath = path.join(repositoryRoot, relativePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Missing mitigation evidence: ${relativePath}`);
      }
    }
    const documentation = fs.readFileSync(
      path.join(repositoryRoot, mitigation.documentation),
      "utf8",
    );
    for (const marker of [mitigation.advisory, mitigation.packageName, mitigation.version, mitigation.path]) {
      if (!documentation.includes(marker)) {
        throw new Error(`Mitigation documentation is missing ${marker}: ${key}`);
      }
    }
  }
}

export function evaluateAuditPolicy({ auditReport, lockfile, repositoryRoot = REPO_ROOT } = {}) {
  validateMitigationRegistry(repositoryRoot);
  const findings = extractAuditFindings(auditReport, lockfile);
  const gatedFindings = findings.filter((finding) => AUDIT_SEVERITIES.includes(finding.severity));
  const mitigated = gatedFindings.filter((finding) =>
    EXPLICIT_MITIGATIONS.some((mitigation) => mitigationMatches(finding, mitigation)));
  const unmitigated = gatedFindings.filter((finding) =>
    !EXPLICIT_MITIGATIONS.some((mitigation) => mitigationMatches(finding, mitigation)));
  return Object.freeze({
    findings: Object.freeze(findings),
    gatedFindings: Object.freeze(gatedFindings),
    mitigated: Object.freeze(mitigated),
    unmitigated: Object.freeze(unmitigated),
    passed: unmitigated.length === 0,
  });
}

export function parseAuditOutput(output) {
  const text = String(output ?? "").trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error("npm audit did not return a JSON object");
  }
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch (error) {
    throw new Error(`Unable to parse npm audit JSON: ${error.message}`);
  }
}

export function buildNpmAuditInvocation() {
  return {
    executable: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["audit", "--json"],
  };
}

function formatFinding(finding) {
  return [
    finding.severity.toUpperCase(),
    finding.advisory ?? "UNKNOWN_ADVISORY",
    `${finding.packageName}@${finding.version ?? "unknown"}`,
    finding.path,
  ].join(" | ");
}

export function formatAuditPolicyResult(result) {
  const lines = [
    `npm audit High/Critical findings: ${result.gatedFindings.length}`,
    `Mitigated exact exceptions: ${result.mitigated.length}`,
  ];
  if (result.unmitigated.length > 0) {
    lines.push("Unmitigated High/Critical findings:");
    lines.push(...result.unmitigated.map(formatFinding));
  }
  lines.push(result.passed
    ? "Dependency advisory policy: PASS"
    : "Dependency advisory policy: FAIL");
  return lines.join("\n");
}

export function runDependencyAudit({ repositoryRoot = REPO_ROOT, spawn = spawnSync } = {}) {
  const invocation = buildNpmAuditInvocation();
  const spawnExecutable = process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : invocation.executable;
  const spawnArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `${invocation.executable} ${invocation.args.join(" ")}`]
    : invocation.args;
  const result = spawn(spawnExecutable, spawnArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const auditReport = parseAuditOutput(output);
  const lockfile = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package-lock.json"), "utf8"));
  const policy = evaluateAuditPolicy({ auditReport, lockfile, repositoryRoot });
  return Object.freeze({
    ...policy,
    npmExitCode: result.status,
    invocation,
  });
}

function main() {
  try {
    const result = runDependencyAudit();
    console.log(formatAuditPolicyResult(result));
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    console.error(`Dependency advisory policy: ERROR\n${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main();
}
