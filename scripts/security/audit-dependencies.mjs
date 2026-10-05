#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCandidateSha, writeQualityEvidence } from "../checks/quality-evidence.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "../..");
const GOVERNANCE_DOCUMENT = "documentation/security/dependency-advisory-governance.md";
const SECURITY_EVIDENCE_ROOT = "artifacts/security-evidence";

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
  Object.freeze({
    advisory: "GHSA-86w9-cpqp-85rv",
    packageName: "node-forge",
    version: "1.4.0",
    path: "apps/mobile/vendor/node-forge",
    documentation: GOVERNANCE_DOCUMENT,
    verification: "apps/mobile/security/node-forge-security.test.mjs",
  }),
  Object.freeze({
    advisory: "GHSA-VFJ7-8CJW-P6XM",
    packageName: "braces",
    version: "3.0.4",
    path: "apps/mobile/vendor/braces",
    documentation: GOVERNANCE_DOCUMENT,
    verification: "apps/mobile/security/braces-security.test.mjs",
  }),
]);

// Diagnostic classification only: this entry covers the still-blocking
// upstream vulnerable `braces@3.0.3` path. The exact local `braces@3.0.4`
// backport is accepted only through EXPLICIT_MITIGATIONS and is not an upstream
// release or a broader exemption.
export const BLOCKED_UPSTREAM_ADVISORIES = Object.freeze({
  "GHSA-VFJ7-8CJW-P6XM": Object.freeze({
    packageName: "braces",
    vulnerableVersion: "3.0.3",
  }),
});

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

function dependencyNames(packageEntry) {
  return new Set([
    ...Object.keys(packageEntry?.dependencies ?? {}),
    ...Object.keys(packageEntry?.optionalDependencies ?? {}),
    ...Object.keys(packageEntry?.peerDependencies ?? {}),
  ]);
}

function rootAdvisoryPaths(packageKey, vulnerability, vulnerabilities, seen = new Set()) {
  if (seen.has(packageKey)) return [];
  const nextSeen = new Set(seen).add(packageKey);
  const paths = [];

  for (const detail of auditDetails(vulnerability)) {
    const advisory = advisoryIdFromDetail(detail);
    if (advisory) paths.push({ advisory, path: [packageKey] });
  }

  for (const dependencyName of (vulnerability?.via ?? []).filter((entry) => typeof entry === "string")) {
    const dependency = vulnerabilities[dependencyName];
    if (!dependency) continue;
    for (const childPath of rootAdvisoryPaths(dependencyName, dependency, vulnerabilities, nextSeen)) {
      paths.push({ advisory: childPath.advisory, path: [packageKey, ...childPath.path] });
    }
  }

  const unique = new Map();
  for (const advisoryPath of paths) {
    unique.set(`${advisoryPath.advisory}|${advisoryPath.path.join("|")}`, advisoryPath);
  }
  return [...unique.values()];
}

function resolveInstalledDependencyPath(parentPath, dependencyName, packages) {
  let currentPath = normalizePath(parentPath);
  while (true) {
    const candidate = currentPath
      ? `${currentPath}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (packages[candidate]) return candidate;

    if (!currentPath) return null;

    const nestedMarker = currentPath.lastIndexOf("/node_modules/");
    if (nestedMarker >= 0) {
      currentPath = currentPath.slice(0, nestedMarker);
      continue;
    }
    if (currentPath.startsWith("node_modules/")) {
      currentPath = "";
      continue;
    }

    const parentMarker = currentPath.lastIndexOf("/");
    currentPath = parentMarker >= 0 ? currentPath.slice(0, parentMarker) : "";
  }
}

function packageNameFromLockfilePath(packagePath) {
  const normalized = normalizePath(packagePath);
  const marker = normalized.lastIndexOf("/node_modules/");
  if (marker >= 0) return normalized.slice(marker + "/node_modules/".length);
  if (normalized.startsWith("node_modules/")) return normalized.slice("node_modules/".length);
  return normalized.split("/").at(-1) ?? normalized;
}

function lockfilePackageLabel(packagePath, packages) {
  const resolved = resolveLockfilePackage(packagePath, packages);
  const entry = packages[resolved.path] ?? packages[packagePath] ?? {};
  const name = entry.name ?? packageNameFromLockfilePath(resolved.path);
  return resolved.version ? `${name}@${resolved.version}` : name;
}

function directParentPackages(nodePath, packages) {
  const resolvedTarget = resolveLockfilePackage(nodePath, packages).path;
  const parentPackages = new Set();
  for (const [parentPath, packageEntry] of Object.entries(packages)) {
    for (const dependencyName of dependencyNames(packageEntry)) {
      const installedPath = resolveInstalledDependencyPath(parentPath, dependencyName, packages);
      if (!installedPath) continue;
      const resolvedDependency = resolveLockfilePackage(installedPath, packages).path;
      if (resolvedDependency === resolvedTarget) {
        parentPackages.add(lockfilePackageLabel(parentPath, packages));
      }
    }
  }
  return [...parentPackages].sort();
}

function traversedDependencyNames(packageEntry) {
  return new Set([
    ...Object.keys(packageEntry?.dependencies ?? {}),
    ...Object.keys(packageEntry?.optionalDependencies ?? {}),
  ]);
}

function collectReachablePackages(packages, roots) {
  const reachable = new Set();
  const pending = [...roots];

  while (pending.length > 0) {
    const { parentPath, dependencyName } = pending.shift();
    const installedPath = resolveInstalledDependencyPath(parentPath, dependencyName, packages);
    if (!installedPath) continue;

    const resolvedPath = resolveLockfilePackage(installedPath, packages).path;
    if (reachable.has(resolvedPath)) continue;
    reachable.add(resolvedPath);

    const packageEntry = packages[resolvedPath];
    for (const childDependencyName of traversedDependencyNames(packageEntry)) {
      pending.push({ parentPath: resolvedPath, dependencyName: childDependencyName });
    }
  }

  return reachable;
}

function dependencyRoots(packages, packagePath, fieldName) {
  const packageEntry = packages[packagePath] ?? {};
  return Object.keys(packageEntry[fieldName] ?? {}).map((dependencyName) => ({
    parentPath: packagePath,
    dependencyName,
  }));
}

function buildReachability(packages) {
  const runtime = {
    web: collectReachablePackages(packages, [
      ...dependencyRoots(packages, "apps/web", "dependencies"),
      ...dependencyRoots(packages, "apps/web", "optionalDependencies"),
    ]),
    mobile: collectReachablePackages(packages, [
      ...dependencyRoots(packages, "apps/mobile", "dependencies"),
      ...dependencyRoots(packages, "apps/mobile", "optionalDependencies"),
    ]),
  };
  const developmentRoots = [
    ...dependencyRoots(packages, "", "devDependencies"),
    ...dependencyRoots(packages, "apps/web", "devDependencies"),
    ...dependencyRoots(packages, "apps/mobile", "devDependencies"),
  ];

  return {
    ...runtime,
    dev: collectReachablePackages(packages, developmentRoots),
  };
}

function runtimeScopeForFinding({ path: packagePath, packages, reachability: providedReachability }) {
  const reachability = providedReachability ?? buildReachability(packages);
  const scopes = [];
  if (reachability.web.has(packagePath)) scopes.push("WEB_RUNTIME");
  if (reachability.mobile.has(packagePath)) scopes.push("MOBILE_RUNTIME");
  if (scopes.length > 0) return scopes.join(" + ");
  if (reachability.dev.has(packagePath)) return "DEV_BUILD_ONLY";
  return "UNCLASSIFIED";
}

function mitigationStatusForFinding(finding) {
  if (EXPLICIT_MITIGATIONS.some((mitigation) => mitigationMatches(finding, mitigation))) {
    return "MITIGATED_EXACT";
  }
  if (finding.rootAdvisories.some((advisory) => Object.hasOwn(BLOCKED_UPSTREAM_ADVISORIES, advisory))) {
    return "BLOCKED_BY_UPSTREAM";
  }
  return "UNMITIGATED";
}

function exactMitigationCoversPackage(packageKey, vulnerability, vulnerabilities, packages, seen = new Set()) {
  if (seen.has(packageKey)) return false;
  const nextSeen = new Set(seen).add(packageKey);
  const details = auditDetails(vulnerability);
  if (details.some((detail) => detail && findingNodes(packageKey, vulnerability).some((node) => {
    const resolved = resolveLockfilePackage(node, packages);
    return EXPLICIT_MITIGATIONS.some((mitigation) => mitigationMatches({
      advisory: advisoryIdFromDetail(detail),
      packageName: vulnerability.name ?? packageKey,
      version: resolved.version,
      path: resolved.path,
    }, mitigation));
  }))) {
    return true;
  }

  const via = vulnerability?.via;
  if (!Array.isArray(via) || via.length === 0 || via.some((entry) => typeof entry !== "string")) {
    return false;
  }
  return via.every((dependencyName) => {
    const dependency = vulnerabilities[dependencyName];
    return dependency && exactMitigationCoversPackage(
      dependencyName,
      dependency,
      vulnerabilities,
      packages,
      nextSeen,
    );
  });
}

export function extractAuditFindings(auditReport, lockfile = {}) {
  const vulnerabilities = auditReport?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object") return [];
  const packages = lockfile?.packages && typeof lockfile.packages === "object"
    ? lockfile.packages
    : {};
  const reachability = buildReachability(packages);
  const findings = [];

  for (const [packageKey, vulnerability] of Object.entries(vulnerabilities)) {
    const details = auditDetails(vulnerability);
    if (details.length === 1 && details[0] === null
      && exactMitigationCoversPackage(packageKey, vulnerability, vulnerabilities, packages)) {
      continue;
    }
    const rootPaths = rootAdvisoryPaths(packageKey, vulnerability, vulnerabilities);
    const rootAdvisories = [...new Set(rootPaths.map((rootPath) => rootPath.advisory))];
    for (const node of findingNodes(packageKey, vulnerability)) {
      const resolved = resolveLockfilePackage(node, packages);
      const findingContext = {
        rootAdvisories,
        rootPaths,
        parentPackages: directParentPackages(node, packages),
        runtimeScope: runtimeScopeForFinding({
          path: resolved.path,
          packages,
          reachability,
        }),
      };
      for (const detail of auditDetails(vulnerability)) {
        const finding = {
          advisory: advisoryIdFromDetail(detail),
          packageName: vulnerability.name ?? packageKey,
          version: resolved.version,
          path: resolved.path,
          severity: String(detail?.severity ?? vulnerability.severity ?? "unknown").toLowerCase(),
          title: detail?.title ?? `npm audit finding for ${packageKey}`,
          url: detail?.url ?? null,
          source: detail?.source ?? null,
          ...findingContext,
        };
        finding.mitigationStatus = mitigationStatusForFinding(finding);
        findings.push(finding);
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

function formatFindingDiagnostics(finding) {
  const rootAdvisories = finding.rootAdvisories.length > 0
    ? finding.rootAdvisories.join(", ")
    : "UNKNOWN_ADVISORY";
  const transitivePaths = finding.rootPaths.length > 0
    ? finding.rootPaths
      .map((rootPath) => `${rootPath.path.join(" -> ")} -> ${rootPath.advisory}`)
      .join(" || ")
    : "UNKNOWN_ADVISORY";
  return [
    `ROOT_ADVISORY: ${rootAdvisories}`,
    `AFFECTED_PACKAGE: ${finding.packageName}@${finding.version ?? "unknown"}`,
    `TRANSITIVE_PATH: ${transitivePaths}`,
    `PARENT_PACKAGES: ${finding.parentPackages.length > 0 ? finding.parentPackages.join(", ") : "none"}`,
    `RUNTIME_SCOPE: ${finding.runtimeScope}`,
    `MITIGATION_STATUS: ${finding.mitigationStatus}`,
  ].join("\n");
}

export function formatAuditPolicyResult(result) {
  const lines = [
    `npm audit High/Critical findings: ${result.gatedFindings.length}`,
    `Mitigated exact exceptions: ${result.mitigated.length}`,
    "High/Critical advisory diagnostics:",
  ];
  for (const finding of result.gatedFindings) {
    lines.push(formatFindingDiagnostics(finding));
  }
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

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    const severity = finding.severity ?? "unknown";
    counts[severity] = (counts[severity] ?? 0) + 1;
    return counts;
  }, {});
}

function writeDependencyEvidence(result, status = result.passed ? "PASS" : "FAIL") {
  writeQualityEvidence({
    repositoryRoot: REPO_ROOT,
    evidenceRoot: SECURITY_EVIDENCE_ROOT,
    fileKey: "dependency-advisory",
    gate: "dependencies",
    candidateSha: resolveCandidateSha(REPO_ROOT),
    candidateRef: process.env.CANDIDATE_SHA ?? "HEAD",
    status,
    findings: result.gatedFindings.length,
    metrics: {
      allFindings: result.findings.length,
      highCriticalFindings: result.gatedFindings.length,
      mitigatedHighCritical: result.mitigated.length,
      unmitigatedHighCritical: result.unmitigated.length,
      npmExitCode: result.npmExitCode,
      severityCounts: severityCounts(result.findings),
    },
  });
}

function main() {
  try {
    const result = runDependencyAudit();
    writeDependencyEvidence(result);
    console.log(formatAuditPolicyResult(result));
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    try {
      writeQualityEvidence({
        repositoryRoot: REPO_ROOT,
        evidenceRoot: SECURITY_EVIDENCE_ROOT,
        fileKey: "dependency-advisory",
        gate: "dependencies",
        candidateSha: resolveCandidateSha(REPO_ROOT),
        candidateRef: process.env.CANDIDATE_SHA ?? "HEAD",
        status: "FAIL",
        findings: null,
        metrics: {},
        details: { executionError: error?.constructor?.name ?? "Error" },
      });
    } catch {
      // Preserve the blocking audit error if evidence cannot be written.
    }
    console.error(`Dependency advisory policy: ERROR\n${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main();
}
