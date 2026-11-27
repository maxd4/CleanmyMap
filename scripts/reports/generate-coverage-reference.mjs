#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { assertSafeDirectoryRoot, assertSafeExternalPath, resolvePathWithinRoot } from "../ci/safe-paths.mjs";

import { buildCoverageInsightsReport } from "../checks/check-coverage-insights.mjs";
import { validateCoverageEvidence } from "../checks/coverage-evidence.mjs";
import { validateSonarCoverageReports } from "../checks/prepare-sonarqube-coverage.mjs";
import { validateCoveragePublicationProof } from "../ci/coverage-publication.mjs";
import {
  COVERAGE_ENFORCEMENT_POLICY,
  COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
  COVERAGE_RISK_FAMILIES,
  COVERAGE_RISK_POLICY_FINGERPRINT,
  COVERAGE_SCOPE_FINGERPRINT,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
  classifyCoverageFile,
} from "../checks/coverage-policy.mjs";

const METRICS = ["statements", "branches", "functions", "lines"];
const CI_SOURCE_PREFIX = "/home/runner/work/CleanmyMap/CleanmyMap/";

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (typeof value !== "string" || !value.startsWith("--") || value === "--") {
      throw new Error(`Invalid command-line argument: ${value ?? "<missing>"}.`);
    }
    const separator = value.indexOf("=");
    const key = value.slice(2, separator < 0 ? undefined : separator);
    const inline = separator < 0 ? undefined : value.slice(separator + 1);
    if (!key || Object.hasOwn(result, key)) throw new Error(`Duplicate or empty command-line option: ${value}.`);
    if (inline !== undefined) {
      result[key] = inline;
      continue;
    }
    const next = argv[index + 1];
    if (typeof next !== "string" || next.startsWith("--")) throw new Error(`Missing value for --${key}.`);
    result[key] = next;
    index += 1;
  }
  return result;
}

function required(args, key) {
  if (!args[key]) throw new Error(`Missing required argument --${key}.`);
  return resolveCliRoot(args[key], key);
}

function resolveCliPath(value, label) {
  const raw = String(value ?? "");
  const normalized = raw.replaceAll("\\", "/");
  if (!normalized || normalized.includes("\0") || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe path supplied for --${label}.`);
  }
  return assertSafeExternalPath(normalized, { label: `--${label}` });
}

function resolveCliRoot(value, label) {
  return assertSafeDirectoryRoot(resolveCliPath(value, label), { label: `--${label}` });
}

function hashFile(file) {
  return file && fs.existsSync(file) ? createHash("sha256").update(fs.readFileSync(file)).digest("hex") : null;
}

function readJson(file) {
  return file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function normalizeCiReport(value) {
  if (typeof value !== "string") return value;
  return value.replaceAll(CI_SOURCE_PREFIX, "");
}

function reportFsApi(summaryFile, lcovFile) {
  return {
    readFileSync(file, encoding) {
      const normalized = String(file).replaceAll("\\", "/");
      if (summaryFile && normalized.endsWith("coverage-summary.json")) {
        const summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
        const transformed = Object.fromEntries(Object.entries(summary).map(([key, value]) => [
          key === "total" ? key : normalizeCiReport(key),
          value,
        ]));
        return encoding === "utf8" ? JSON.stringify(transformed) : Buffer.from(JSON.stringify(transformed));
      }
      if (lcovFile && normalized.endsWith("lcov.info")) {
        let content = fs.readFileSync(lcovFile, "utf8");
        content = content.replaceAll(CI_SOURCE_PREFIX, "");
        return encoding === "utf8" ? content : Buffer.from(content);
      }
      return fs.readFileSync(file, encoding);
    },
  };
}

function reportPaths(definition) {
  return definition.format === "cobertura"
    ? [definition.coveragePath]
    : [definition.summaryPath, definition.lcovPath];
}

function safeRelativeReportPath(value) {
  const normalized = String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`Coverage proof contains an unsafe report path: ${value}`);
  }
  return normalized;
}

function assertConsumedReportsMatchProof(reportRoot, proof, definition) {
  const proofReports = new Map((proof?.reports ?? []).map((report) => [report.source, report]));
  const consumed = {};
  for (const source of reportPaths(definition)) {
    const report = proofReports.get(source);
    if (!report || report.path !== source || typeof report.sha256 !== "string") {
      throw new Error(`Coverage proof does not attest the consumed ${definition.scope} report: ${source}.`);
    }
    const normalized = safeRelativeReportPath(source);
    const file = resolvePathWithinRoot(reportRoot, normalized, { label: `${definition.scope} consumed report` });
    const hash = hashFile(file);
    if (!hash || hash !== report.sha256) {
      throw new Error(`Consumed ${definition.scope} report differs from the publication proof: ${source}.`);
    }
    consumed[source] = hash;
  }
  return consumed;
}

function sanitizeMessage(message, roots = []) {
  let result = String(message ?? "");
  for (const root of roots) {
    if (!root) continue;
    const resolved = path.resolve(root);
    for (const variant of [resolved, resolved.replaceAll("\\", "/"), resolved.replaceAll("/", "\\")]) {
      if (variant) result = result.replaceAll(variant, "<repo>");
    }
  }
  return result.replaceAll("<repo>\\", "<repo>/");
}

function sanitizeDiagnostics(diagnostics = [], roots = []) {
  return diagnostics.map((d) => ({ ...d, message: sanitizeMessage(d.message, roots) }));
}

function classifyProvenanceFailure(error, roots = []) {
  const message = sanitizeMessage(error instanceof Error ? error.message : String(error), roots);
  const stale = /candidate mismatch|audited SHA|attached to the analyzed|expected .*SHA|candidate SHA/i.test(message);
  return {
    state: stale ? "STALE_EVIDENCE" : "EVIDENCE_UNVERIFIED",
    diagnostics: [{ code: stale ? "STALE_COVERAGE_EVIDENCE" : "COVERAGE_EVIDENCE_UNVERIFIED", message }],
    error: message,
  };
}

function validateAttestedProvenance({ repositoryRoot, reportRoot, publicationRoot, auditedSha, scope, definition }) {
  try {
    const publication = validateCoveragePublicationProof({
      repositoryRoot,
      candidateSha: auditedSha,
      scope,
      publicationRoot,
    });
    if (publication.proof.candidateScope !== "CI_CANDIDATE") {
      throw new Error(`Coverage ${publication.proof.candidateScope} proof cannot be promoted to CI_EXACT_SHA.`);
    }
    const consumedReportHashes = assertConsumedReportsMatchProof(reportRoot, publication.proof, definition);
    let evidence = null;
    if (scope === "web") {
      evidence = validateCoverageEvidence({
        repositoryRoot,
        scope,
        expectedCandidateSha: auditedSha,
        reportRoot,
        candidateRef: auditedSha,
        validateCandidateFingerprint: false,
      });
    }
    return {
      state: "CI_EXACT_SHA",
      proof: publication.proof,
      proofRoot: publication.root,
      evidence,
      consumedReportHashes,
      diagnostics: [],
      error: null,
    };
  } catch (error) {
    return {
      ...classifyProvenanceFailure(error, [repositoryRoot, reportRoot, publicationRoot]),
      proof: null,
      proofRoot: null,
      evidence: null,
      consumedReportHashes: {},
    };
  }
}

export function metricDeficit(metric, threshold) {
  if (threshold === null || threshold === undefined || metric?.total === null || metric?.total === undefined || metric.total <= 0) {
    return { target: null, deltaPp: null, additional: null };
  }
  const exact = metric.covered / metric.total * 100;
  return {
    target: threshold,
    deltaPp: Number(Math.max(0, threshold - exact).toFixed(6)),
    additional: Math.max(0, Math.ceil(threshold * metric.total / 100) - metric.covered),
  };
}

export function addDeficits(file, target) {
  return Object.fromEntries(METRICS.map((metric) => [metric, metricDeficit(file.metrics?.[metric], target?.[metric] ?? null)]));
}

function aggregateFiles(files) {
  return Object.fromEntries(METRICS.map((metric) => {
    const rows = files.filter((file) => file.metrics?.[metric]?.total !== null);
    const total = rows.reduce((sum, file) => sum + file.metrics[metric].total, 0);
    const covered = rows.reduce((sum, file) => sum + file.metrics[metric].covered, 0);
    return [metric, {
      covered,
      total,
      uncovered: total - covered,
      pct: total === 0 ? null : Number((covered / total * 100).toFixed(2)),
    }];
  }));
}

function domainTarget(domain) {
  return COVERAGE_RISK_FAMILIES[domain]?.target ?? null;
}

function moduleFor(scope, filePath) {
  const parts = filePath.split("/");
  if (scope === "web") {
    if (parts[0] === "apps" && parts[1] === "web" && parts[2] === "src") return parts.slice(0, 5).join("/");
    return parts.slice(0, 3).join("/");
  }
  if (scope === "mobile") return parts.slice(0, 3).join("/");
  if (scope === "python") return parts.slice(0, 3).join("/");
  return parts.slice(0, 2).join("/");
}

function fileRow(file, scope) {
  const classification = scope === "web" ? classifyCoverageFile(file.path) : {
    domain: null,
    attribution: "scope-without-risk-families",
    pattern: null,
  };
  const target = scope === "web" ? domainTarget(classification.domain) : null;
  const deficits = addDeficits(file, target);
  return {
    scope,
    family: classification.domain,
    classification,
    path: file.path,
    module: moduleFor(scope, file.path),
    source: file.provenance?.source ?? null,
    metrics: file.metrics,
    deficits,
    uncoveredBranchLines: file.uncoveredBranchLines ?? [],
    uncoveredBranches: file.uncoveredBranches ?? 0,
    priority: file.priority,
    proofState: file.provenance?.state ?? "UNKNOWN",
  };
}

function buildScope({ scope, root, repositoryRoot, summaryFile, lcovFile, definition, auditedSha, proofState, publicationRoot = null, attest = false }) {
  assertSafeDirectoryRoot(root, { label: `${scope} coverage root` });
  if (!fs.existsSync(lcovFile) || (definition.format !== "cobertura" && !fs.existsSync(summaryFile))) {
    throw new Error(`${scope} coverage input is missing; refusing to emit a partial reference.`);
  }
  const provenance = attest
    ? validateAttestedProvenance({ repositoryRoot, reportRoot: root, publicationRoot, auditedSha, scope, definition })
    : {
      state: proofState,
      proof: null,
      proofRoot: null,
      evidence: null,
      consumedReportHashes: {},
      diagnostics: [{ code: "PRESENT_NOT_ATTESTED", message: `${scope} report is present but no exact candidate publication proof is claimed.` }],
      error: null,
    };
  const validationFsApi = reportFsApi(summaryFile, lcovFile);
  const report = buildCoverageInsightsReport({
    root,
    auditedSha,
    reports: [definition],
    fsApi: validationFsApi,
    validateEvidence: () => {
      if (scope !== "web" || provenance.state === "CI_EXACT_SHA") return provenance.evidence ?? {};
      throw new Error(provenance.error ?? "Web coverage evidence is not attested.");
    },
    validatePublicationProof: () => {
      if (provenance.state === "CI_EXACT_SHA") return provenance.proof ?? {};
      throw new Error(provenance.error ?? `${scope} coverage is not attested.`);
    },
    validateSonar: ({ root: validationRoot, reports }) => validateSonarCoverageReports({
      root: validationRoot,
      reports,
      write: false,
      mode: "SONAR_PARTIAL",
      fsApi: validationFsApi,
      sourceFsApi: fs,
      sourceRootDirectory: repositoryRoot,
    }),
  });
  const source = report.scopes[0];
  const reportValidationFailed = source.diagnostics.some((diagnostic) => [
    "COVERAGE_VALIDATION_FAILED",
    "COVERAGE_MEASUREMENT_FAILED",
    "COVERAGE_EVIDENCE_UNAVAILABLE",
  ].includes(diagnostic.code));
  const finalState = reportValidationFailed ? "EVIDENCE_UNVERIFIED" : provenance.state;
  const finalProvenance = finalState === provenance.state
    ? provenance
    : {
      ...provenance,
      state: finalState,
      diagnostics: [...provenance.diagnostics, { code: "COVERAGE_REPORT_UNVERIFIED", message: "Coverage report validation failed; metrics are not attested." }],
    };
  const files = source.files.map((file) => ({ ...fileRow(file, scope), proofState: finalState }));
  let observed;
  if (reportValidationFailed) {
    observed = { status: "MEASUREMENT_FAILED", metrics: aggregateFiles(files), files: [] };
  } else if (finalState === "CI_EXACT_SHA") {
    observed = { status: "CI_ATTESTED", metrics: aggregateFiles(files), files };
  } else {
    const observedReport = buildCoverageInsightsReport({
      root,
      auditedSha,
      reports: [definition],
      fsApi: validationFsApi,
      validateEvidence: () => ({ gitHead: auditedSha }),
      validatePublicationProof: () => ({ candidateSha: auditedSha }),
      validateSonar: () => [{ status: "VALID" }],
    });
    const observedFiles = (observedReport.scopes[0]?.files ?? []).map((file) => ({ ...fileRow(file, scope), proofState: finalState }));
    observed = { status: "OBSERVED_NOT_ATTESTED", metrics: aggregateFiles(observedFiles), files: observedFiles };
  }
  const cleanDiagnostics = sanitizeDiagnostics([...source.diagnostics, ...finalProvenance.diagnostics], [repositoryRoot, root, publicationRoot]);
  return {
    scope,
    state: files.length > 0 ? finalState : (reportValidationFailed ? "EVIDENCE_UNVERIFIED" : finalState),
    proofState: finalState,
    metrics: aggregateFiles(files),
    files,
    observed,
    diagnostics: cleanDiagnostics,
    provenance: { ...finalProvenance, diagnostics: sanitizeDiagnostics(finalProvenance.diagnostics, [repositoryRoot, root, publicationRoot]) },
  };
}

export function topDelta(files) {
  return files
    .filter((file) => Object.values(file.deficits).some((entry) => entry.deltaPp !== null && entry.deltaPp > 0))
    .map((file) => ({
      ...file,
      maxDeltaPp: Math.max(...Object.values(file.deficits).map((entry) => entry.deltaPp ?? 0)),
      maxAdditional: Math.max(...Object.values(file.deficits).map((entry) => entry.additional ?? 0)),
    }))
    .sort((left, right) => (right.classification.domain === "security" ? 1 : 0) - (left.classification.domain === "security" ? 1 : 0)
      || right.maxDeltaPp - left.maxDeltaPp
      || right.maxAdditional - left.maxAdditional
      || left.path.localeCompare(right.path))
    .slice(0, 50);
}

export function topAbsoluteDeficit(files) {
  return files
    .filter((file) => (file.deficits.lines.additional ?? 0) > 0 || (file.deficits.branches.additional ?? 0) > 0)
    .sort((left, right) => (right.deficits.lines.additional ?? 0) - (left.deficits.lines.additional ?? 0)
      || (right.deficits.branches.additional ?? 0) - (left.deficits.branches.additional ?? 0)
      || left.path.localeCompare(right.path))
    .slice(0, 50);
}

function aggregateGroups(files, key) {
  const groups = new Map();
  for (const file of files) {
    const name = file[key] ?? "UNCLASSIFIED";
    groups.set(name, [...(groups.get(name) ?? []), file]);
  }
  return Object.fromEntries([...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, group]) => [name, {
      files: group.length,
      metrics: aggregateFiles(group),
      topFiles: topAbsoluteDeficit(group).slice(0, 10).map((file) => file.path),
    }]));
}

function familyAggregates(files) {
  return Object.fromEntries(Object.keys(COVERAGE_RISK_FAMILIES).map((domain) => {
    const group = files.filter((file) => file.family === domain);
    const metrics = aggregateFiles(group);
    return [domain, { files: group.length, metrics, deficits: addDeficits({ metrics }, domainTarget(domain)) }];
  }));
}

function readProvenance(file, scope, reportFiles, validation = null, auditedSha = null, repositoryRoot = process.cwd()) {
  const data = readJson(file);
  const reportHashes = Object.fromEntries(Object.entries(reportFiles).map(([name, value]) => [name, hashFile(value)]));
  const evidenceSha = data?.gitHead ?? data?.candidateSha ?? null;
  const campaignOrigin = validation?.state === "CI_EXACT_SHA"
    ? "CI_EXACT_SHA"
    : evidenceSha && auditedSha && evidenceSha === auditedSha
      ? "CURRENT_SHA_RUN"
      : evidenceSha && auditedSha
        ? "REUSED_PRIOR_SHA"
        : "UNATTESTED_WORKTREE";

  const divergences = [];
  if (data?.summarySha256 && reportHashes.summary && data.summarySha256 !== reportHashes.summary) {
    divergences.push({ artifact: "summary", expected: data.summarySha256, actual: reportHashes.summary, status: "MISMATCH" });
  }
  if (data?.lcovSha256 && reportHashes.lcov && data.lcovSha256 !== reportHashes.lcov) {
    divergences.push({ artifact: "lcov", expected: data.lcovSha256, actual: reportHashes.lcov, status: "MISMATCH" });
  }
  if (Array.isArray(data?.reports)) {
    for (const r of data.reports) {
      const key = r.source?.endsWith("coverage-summary.json") ? "summary" : r.source?.endsWith("lcov.info") ? "lcov" : "report";
      if (reportHashes[key] && r.sha256 && r.sha256 !== reportHashes[key]) {
        divergences.push({ artifact: key, expected: r.sha256, actual: reportHashes[key], status: "MISMATCH" });
      }
    }
  }

  return {
    scope,
    file: file ? path.relative(repositoryRoot, file).replaceAll("\\", "/") : null,
    data,
    reportHashes,
    campaignOrigin,
    evidenceSha,
    hashDivergences: divergences,
    validation: validation ? {
      state: validation.state,
      diagnostics: sanitizeDiagnostics(validation.diagnostics, [repositoryRoot]),
      consumedReportHashes: validation.consumedReportHashes,
    } : { state: "NOT_MEASURED", diagnostics: [], consumedReportHashes: {} },
  };
}

export function markdown(reference) {
  const scopeByName = new Map(reference.scopes.map((scope) => [scope.scope, scope]));
  const web = scopeByName.get("web");
  const mobile = scopeByName.get("mobile");
  const node = scopeByName.get("node");
  const python = scopeByName.get("python");
  const provenanceSummary = [web, node, mobile, python]
    .filter(Boolean)
    .map((scope) => `${scope.scope}=${scope.proofState}`)
    .join(", ");
  const lines = [
    `# Audit global de couverture — référence ${reference.date}`,
    "",
    "**Nature :** `AUDIT / SNAPSHOT` — photographie descriptive, sans modification de politique.",
    `**SHA mesuré :** \`${reference.auditedSha}\``,
    "**SHA de publication :** le commit Git qui contient cette photographie est vérifié par le compte rendu final ; il est distinct du SHA mesuré lorsque le document est ajouté après la mesure.",
    "",
    "## Résumé exécutif",
    "",
    `États de provenance vérifiés par le générateur : ${provenanceSummary || "aucun scope"}. Un scope n'est marqué 'CI_EXACT_SHA' qu'après validation de la preuve de publication CI, de l'identité du candidat, des empreintes des rapports consommés et des validateurs canoniques. Les observations instrumentées locales non attestées restent conservées séparément sous \`observed\` (\`OBSERVED_NOT_ATTESTED\`) sans promouvoir le statut d'attestation. Les preuves PostgreSQL, RLS, RPC, concurrence, Clerk réel et device natif ne sont pas exécutées par cette photographie.`,
    "",
    "Aucun seuil n'est activé : toutes les familles restent `OBSERVE`. Les domaines sans cible canonique restent `NO_TARGET_DEFINED` ou `RISK_CLASSIFICATION_REQUIRED`.",
    "",
    "## Tableau global",
    "",
    "| Scope | Provenance | Statut observation | Origine campagne | Statements | Branches | Functions | Lines |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
  ];
  for (const scope of reference.scopes) {
    const obs = scope.observed ?? { status: scope.state, metrics: scope.metrics };
    const m = obs.metrics;
    const prov = reference.provenance?.[scope.scope];
    const origin = prov?.campaignOrigin ?? "UNKNOWN";
    const fmt = (value) => !value || value.total === 0 ? "NOT_MEASURED" : `${value.covered}/${value.total} — ${value.pct.toFixed(2)} %`;
    lines.push(`| ${scope.scope} | ${scope.proofState} | ${obs.status} | ${origin} | ${fmt(m.statements)} | ${fmt(m.branches)} | ${fmt(m.functions)} | ${fmt(m.lines)} |`);
  }
  lines.push(
    "",
    "## Seuils et politique",
    "",
    `- Empreinte politique : \`${COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT}\` ; empreinte risques : \`${COVERAGE_RISK_POLICY_FINGERPRINT}\`.`,
    `- Empreintes de scope : Web \`${COVERAGE_SCOPE_FINGERPRINT}\`, Mobile \`${MOBILE_COVERAGE_SCOPE_FINGERPRINT}\`.`,
    "- Web security : 90/85/90/90 ; business : 85/80/85/85 ; api-persistence : 85/80/85/85 (S/B/F/L).",
    "- Web ui-presentational : `NO_TARGET_DEFINED` ; Web unclassified : `RISK_CLASSIFICATION_REQUIRED` ; Web new-code-non-critical : non mesuré car aucun préfixe n'est qualifié.",
    "- Mobile, Node et Python : `NO_TARGET_DEFINED` dans la politique actuelle.",
    "- Toutes les entrées de `COVERAGE_ENFORCEMENT_POLICY` sont `OBSERVE`; aucune activation `ENFORCE` n'est proposée comme effective.",
    "",
    "## Familles Web",
    "",
    "| Famille | Fichiers | Statements | Branches | Functions | Lines | Écart S/B/F/L (pp) | Unités S/B/F/L | Objectif | Verdict |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |",
  );
  const webFiles = web?.observed?.files ?? web?.files ?? [];
  for (const [domain, family] of Object.entries(COVERAGE_RISK_FAMILIES)) {
    const files = webFiles.filter((file) => file.family === domain);
    const m = aggregateFiles(files);
    const fmt = (value) => value.total === 0 ? "NOT_MEASURED" : `${value.covered}/${value.total} — ${value.pct.toFixed(2)} %`;
    const hasTarget = Object.values(family.target).some((value) => value !== null);
    const target = hasTarget
      ? Object.entries(family.target).map(([key, value]) => `${key} ${value}% (min ${family.minimum[key] ?? "—"}%)`).join(", ")
      : "NO_TARGET_DEFINED";
    const verdict = domain === "unclassified" ? "RISK_CLASSIFICATION_REQUIRED" : !hasTarget ? "NO_TARGET_DEFINED" : files.length === 0 ? "NOT_MEASURED" : "OBSERVE";
    const deficits = addDeficits({ metrics: m }, family.target);
    const deltas = METRICS.map((metric) => deficits[metric].deltaPp === null ? "—" : deficits[metric].deltaPp.toFixed(2)).join(" / ");
    const additional = METRICS.map((metric) => deficits[metric].additional === null ? "—" : deficits[metric].additional).join(" / ");
    lines.push(`| ${domain} | ${files.length} | ${fmt(m.statements)} | ${fmt(m.branches)} | ${fmt(m.functions)} | ${fmt(m.lines)} | ${deltas} | ${additional} | ${target} | ${verdict} |`);
  }
  const allObservedFiles = reference.scopes.flatMap((scope) => scope.observed?.files ?? scope.files ?? []);
  lines.push("", "## Top 50 — plus grands deltas", "", "Le détail exhaustif est dans le JSON lié. Les deltas sont calculés sur les compteurs exacts, jamais sur les pourcentages arrondis.", "", "| Rang | Scope | Famille | Fichier | Delta max pp | Unités additionnelles max |", "| ---: | --- | --- | --- | ---: | ---: |");
  for (const [index, file] of topDelta(allObservedFiles).entries()) lines.push(`| ${index + 1} | ${file.scope} | ${file.family ?? "NO_TARGET_DEFINED"} | \`${file.path}\` | ${file.maxDeltaPp.toFixed(2)} | ${file.maxAdditional} |`);
  lines.push("", "## Top 50 — plus grand volume manquant", "", "Lignes et branches sont affichées séparément ; elles ne sont pas additionnées entre métriques.", "", "| Rang | Scope | Famille | Fichier | Lignes à couvrir | Branches à couvrir |", "| ---: | --- | --- | --- | ---: | ---: |");
  for (const [index, file] of topAbsoluteDeficit(webFiles).entries()) lines.push(`| ${index + 1} | ${file.scope} | ${file.family} | \`${file.path}\` | ${file.deficits.lines.additional ?? "—"} | ${file.deficits.branches.additional ?? "—"} |`);
  lines.push("", "## Branches critiques non couvertes", "", "Les lignes ci-dessous sont des points de branchement instrumentés non couverts dans les familles Web classées security, api-persistence ou business. Elles sont des priorités de test, pas une interprétation automatique de l'intention métier.", "");
  const critical = webFiles.filter((file) => ["security", "api-persistence", "business"].includes(file.family) && file.uncoveredBranches > 0).flatMap((file) => file.uncoveredBranchLines.map((line) => ({ path: file.path, family: file.family, line }))).slice(0, 80);
  for (const entry of critical) lines.push(`- \`${entry.family}\` — \`${entry.path}:${entry.line}\``);
  if (critical.length === 0) lines.push("- Aucune branche critique mesurable dans les rapports retenus.");
  lines.push(
    "",
    "## Provenance et divergences d'empreintes",
    "",
    "| Scope | Origine campagne | SHA preuve | Divergences d'empreintes |",
    "| --- | --- | --- | --- |",
  );
  for (const scopeName of ["web", "node", "mobile", "python"]) {
    const prov = reference.provenance?.[scopeName];
    if (!prov) continue;
    const div = prov.hashDivergences?.length
      ? prov.hashDivergences.map((d) => `${d.artifact}: MISMATCH`).join(", ")
      : "Aucune divergence";
    lines.push(`| ${scopeName} | ${prov.campaignOrigin ?? "UNKNOWN"} | \`${prov.evidenceSha ?? "N/A"}\` | ${div} |`);
  }
  lines.push(
    "",
    "## Instrumentation et artefacts",
    "",
    "- Web : Vitest `4.1.12` avec `@vitest/coverage-v8` `4.1.12` (V8), résumé JSON et LCOV.",
    "- Mobile : Vitest `4.1.12` avec `@vitest/coverage-v8` `4.1.12` (V8), résumé JSON et LCOV.",
    "- Node/scripts : `c8` `12.0.0`, résumé JSON et LCOV.",
    "- Python : `coverage.py` `7.16.2` et `pytest` `9.1.1`, rapport Cobertura ; statements/functions ne sont pas exposés par ce producteur.",
    "- Les empreintes des rapports source et des preuves sont conservées dans l'artefact JSON ; elles ne valent pas à elles seules une preuve d'intégration externe.",
    "",
    "## Producteurs et preuves",
    "",
    "| Producteur | Commande | Résultat | Niveau de preuve | Limite |",
    "| --- | --- | --- | --- | --- |",
    `| Web | \`npm run test:coverage\` puis \`npm run quality:coverage\` | ${web?.state ?? "NOT_MEASURED"} | ${web?.observed?.status ?? "NOT_MEASURED"} / ${web?.proofState ?? "NOT_MEASURED"} | publication et rapports consommés vérifiés lorsque l'état est CI_EXACT_SHA |`,
    `| Mobile | \`npm run quality:mobile-coverage\` | ${mobile?.state ?? "NOT_MEASURED"} | ${mobile?.observed?.status ?? "NOT_MEASURED"} / ${mobile?.proofState ?? "NOT_MEASURED"} | preuve d'intégration absente si le scope reste non attesté |`,
    `| Node/scripts | \`npm run test:coverage:node\` | ${node?.state ?? "NOT_MEASURED"} | ${node?.observed?.status ?? "NOT_MEASURED"} / ${node?.proofState ?? "NOT_MEASURED"} | pas de cible canonique ; le rapport couvre le périmètre réel du producteur |`,
    `| Python | \`npm run test:coverage:python\` | ${python?.state ?? "NOT_MEASURED"} | ${python?.observed?.status ?? "NOT_MEASURED"} / ${python?.proofState ?? "NOT_MEASURED"} | aucune preuve CI exacte si le scope reste non attesté |`,
    "| PostgreSQL/Supabase | workflow `e2e-supabase-ephemeral` | NOT_EXECUTED | DB_SEMANTICS_NOT_EXECUTED | exécution PostgreSQL non effectuée dans cette photographie |",
    "| E2E/natif/Clerk réel | workflows et appareils | NOT_MEASURED | NOT_MEASURED | non requis pour produire les rapports de couverture code |",
    "",
    "## Méthode, limites et verdict",
    "",
    `Les compteurs par fichier sont conservés dans \`coverage-reference-${reference.date}.json\`, avec empreintes des rapports sources, classification primaire, déficits calculés et séparation stricte entre mesures attestées (\`metrics\` / \`CI_EXACT_SHA\`) et observations locales non attestées (\`observed\` / \`OBSERVED_NOT_ATTESTED\`).`,
    "",
    `**STOP CONDITION : ${reference.scopes.every((s) => s.proofState === "CI_EXACT_SHA") ? "COMPLÈTE" : "PARTIELLE (attestation CI absente)"}.** Les données JSON et les tableaux Markdown sont générés à partir de la même structure \`reference\`. Aucun faux PASS ni changement de baseline, seuil, exclusion ou politique n'a été introduit.`,
    "",
    `Artefact structuré : [\`coverage-reference-${reference.date}.json\`](coverage-reference-${reference.date}.json).`,
  );
  return `${lines.join("\n")}\n`;
}

function publicationRootFor(scopeRoot, proofFile = null) {
  if (proofFile) {
    const absolute = assertSafeExternalPath(proofFile, { label: "coverage proof" });
    return path.dirname(path.dirname(path.dirname(absolute)));
  }
  return resolvePathWithinRoot(scopeRoot, "artifacts/coverage-publication", { label: "coverage publication" });
}

function optionalProofFile(args, key, scopeRoot, auditedSha, scope) {
  if (!scopeRoot) return null;
  if (args[key]) return resolveCliPath(args[key], key);
  const candidate = resolvePathWithinRoot(scopeRoot, `artifacts/coverage-publication/${auditedSha}/${scope}/coverage-publication-proof.json`, { label: `${scope} proof` });
  return fs.existsSync(candidate) ? candidate : null;
}

export function buildReference({ args = parseArgs(process.argv), now = new Date() } = {}) {
  const auditedSha = args.sha;
  if (!/^[0-9a-f]{40}$/i.test(String(auditedSha ?? ""))) throw new Error("Missing or invalid required argument --sha.");
  const repositoryRoot = args["repository-root"] ? resolveCliRoot(args["repository-root"], "repository-root") : assertSafeDirectoryRoot(process.cwd(), { label: "current repository root" });
  const webRoot = required(args, "web-root");
  const nodeRoot = required(args, "node-root");
  const mobileRoot = args["mobile-root"] ? resolveCliRoot(args["mobile-root"], "mobile-root") : null;
  const pythonRoot = args["python-root"] ? resolveCliRoot(args["python-root"], "python-root") : null;
  const webEvidenceFile = args["web-evidence"] ? resolveCliPath(args["web-evidence"], "web-evidence") : resolvePathWithinRoot(webRoot, "apps/web/coverage/coverage-evidence.json", { label: "web evidence" });
  const nodeProofFile = args["node-proof"] ? resolveCliPath(args["node-proof"], "node-proof") : resolvePathWithinRoot(nodeRoot, `artifacts/coverage-publication/${auditedSha}/node/coverage-publication-proof.json`, { label: "node proof" });
  const mobileProofFile = optionalProofFile(args, "mobile-proof", mobileRoot, auditedSha, "mobile");
  const pythonProofFile = optionalProofFile(args, "python-proof", pythonRoot, auditedSha, "python");
  const webSummary = resolvePathWithinRoot(webRoot, "apps/web/coverage/coverage-summary.json", { label: "web coverage summary" });
  const webLcov = resolvePathWithinRoot(webRoot, "apps/web/coverage/lcov.info", { label: "web LCOV" });
  const nodeSummary = resolvePathWithinRoot(nodeRoot, "scripts/coverage/coverage-summary.json", { label: "Node coverage summary" });
  const nodeLcov = resolvePathWithinRoot(nodeRoot, "scripts/coverage/lcov.info", { label: "Node LCOV" });
  const scopes = [buildScope({
    scope: "web", root: webRoot, repositoryRoot, summaryFile: webSummary, lcovFile: webLcov, auditedSha,
    proofState: "CI_EXACT_SHA",
    publicationRoot: publicationRootFor(webRoot),
    attest: true,
    definition: { scope: "web", lcovPath: "apps/web/coverage/lcov.info", summaryPath: "apps/web/coverage/coverage-summary.json", sourceRoot: "apps/web" },
  }), buildScope({
    scope: "node", root: nodeRoot, repositoryRoot, summaryFile: nodeSummary, lcovFile: nodeLcov, auditedSha,
    proofState: "CI_EXACT_SHA",
    publicationRoot: publicationRootFor(nodeRoot, args["node-proof"] ? nodeProofFile : null),
    attest: true,
    definition: { scope: "node", lcovPath: "scripts/coverage/lcov.info", summaryPath: "scripts/coverage/coverage-summary.json", sourceRoot: "." },
  })];
  if (mobileRoot) scopes.push(buildScope({
    scope: "mobile", root: mobileRoot, repositoryRoot, summaryFile: resolvePathWithinRoot(mobileRoot, "apps/mobile/coverage/coverage-summary.json", { label: "mobile coverage summary" }), lcovFile: resolvePathWithinRoot(mobileRoot, "apps/mobile/coverage/lcov.info", { label: "mobile LCOV" }), auditedSha,
    proofState: "EVIDENCE_UNVERIFIED",
    publicationRoot: publicationRootFor(mobileRoot, mobileProofFile),
    attest: Boolean(mobileProofFile),
    definition: { scope: "mobile", lcovPath: "apps/mobile/coverage/lcov.info", summaryPath: "apps/mobile/coverage/coverage-summary.json", sourceRoot: "apps/mobile" },
  }));
  if (pythonRoot) scopes.push(buildScope({
    scope: "python", root: pythonRoot, repositoryRoot, summaryFile: null, lcovFile: resolvePathWithinRoot(pythonRoot, "maintenance/python/coverage.xml", { label: "Python coverage" }), auditedSha,
    proofState: "EVIDENCE_UNVERIFIED",
    publicationRoot: publicationRootFor(pythonRoot, pythonProofFile),
    attest: Boolean(pythonProofFile),
    definition: { scope: "python", format: "cobertura", coveragePath: "maintenance/python/coverage.xml", sourceRoot: "maintenance/python" },
  }));
  const scopeByName = new Map(scopes.map((scope) => [scope.scope, scope]));
  const webObservedFiles = scopeByName.get("web")?.observed?.files ?? [];
  const allObservedFiles = scopes.flatMap((scope) => scope.observed?.files ?? []);
  const reference = {
    schemaVersion: 1,
    kind: "cleanmymap-coverage-reference",
    date: now.toISOString().slice(0, 10),
    auditedSha,
    policy: { enforcement: COVERAGE_ENFORCEMENT_POLICY, enforcementFingerprint: COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT, riskFingerprint: COVERAGE_RISK_POLICY_FINGERPRINT },
    scopes,
    aggregates: {
      webFamilies: familyAggregates(scopes.find((scope) => scope.scope === "web")?.files ?? []),
      byModule: Object.fromEntries(scopes.map((scope) => [scope.scope, aggregateGroups(scope.files, "module")])),
    },
    observedAggregates: {
      webFamilies: familyAggregates(webObservedFiles),
      byModule: Object.fromEntries(scopes.map((scope) => [scope.scope, aggregateGroups(scope.observed?.files ?? [], "module")])),
    },
    rankings: { topDelta: topDelta(scopes.flatMap((scope) => scope.files)), topAbsoluteDeficit: topAbsoluteDeficit(scopes.find((scope) => scope.scope === "web")?.files ?? []) },
    observedRankings: { topDelta: topDelta(allObservedFiles), topAbsoluteDeficit: topAbsoluteDeficit(webObservedFiles) },
    provenance: {
      web: readProvenance(webEvidenceFile, "web", { summary: webSummary, lcov: webLcov }, scopeByName.get("web")?.provenance, auditedSha, repositoryRoot),
      node: readProvenance(nodeProofFile, "node", { summary: nodeSummary, lcov: nodeLcov }, scopeByName.get("node")?.provenance, auditedSha, repositoryRoot),
      mobile: readProvenance(args["mobile-evidence"] ? resolveCliPath(args["mobile-evidence"], "mobile-evidence") : null, "mobile", { summary: mobileRoot ? resolvePathWithinRoot(mobileRoot, "apps/mobile/coverage/coverage-summary.json", { label: "mobile coverage summary" }) : null, lcov: mobileRoot ? resolvePathWithinRoot(mobileRoot, "apps/mobile/coverage/lcov.info", { label: "mobile LCOV" }) : null }, scopeByName.get("mobile")?.provenance, auditedSha, repositoryRoot),
      python: readProvenance(pythonProofFile, "python", { report: pythonRoot ? resolvePathWithinRoot(pythonRoot, "maintenance/python/coverage.xml", { label: "Python coverage" }) : null }, scopeByName.get("python")?.provenance, auditedSha, repositoryRoot),
    },
    limits: ["DB_SEMANTICS_NOT_EXECUTED", "NO_TARGET_DEFINED for mobile/node/python", "RISK_CLASSIFICATION_REQUIRED for Web unclassified", "no Web new-code-non-critical prefix is currently qualified"],
  };
  return reference;
}

function main() {
  const args = parseArgs(process.argv);
  const reference = buildReference({ args });
  const outputJson = resolveCliPath(args["output-json"] ?? `documentation/operations/audits/coverage-reference-${reference.date}.json`, "output-json");
  const outputMd = resolveCliPath(args["output-md"] ?? `documentation/operations/audits/coverage-reference-${reference.date}.md`, "output-md");
  fs.writeFileSync(outputJson, `${JSON.stringify(reference, null, 2)}\n`, "utf8");
  fs.writeFileSync(outputMd, markdown(reference), "utf8");
  console.log(`COVERAGE_REFERENCE_WRITTEN: ${outputMd}`);
  console.log(`COVERAGE_REFERENCE_JSON: ${outputJson}`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; }
}
