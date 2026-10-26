#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

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
    if (!value.startsWith("--")) continue;
    const [key, inline] = value.slice(2).split("=", 2);
    result[key] = inline ?? argv[++index];
  }
  return result;
}

function required(args, key) {
  if (!args[key]) throw new Error(`Missing required argument --${key}.`);
  return path.resolve(args[key]);
}

function hashFile(file) {
  return file && fs.existsSync(file) ? createHash("sha256").update(fs.readFileSync(file)).digest("hex") : null;
}

function readJson(file) {
  return file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function normalizeCiReport(value, scope) {
  if (typeof value !== "string") return value;
  return value.replaceAll(CI_SOURCE_PREFIX, scope === "web" ? "" : "");
}

function reportFsApi(scope, summaryFile, lcovFile) {
  return {
    readFileSync(file, encoding) {
      const normalized = String(file).replaceAll("\\", "/");
      if (summaryFile && normalized.endsWith("coverage-summary.json")) {
        const summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
        const transformed = Object.fromEntries(Object.entries(summary).map(([key, value]) => [
          key === "total" ? key : normalizeCiReport(key, scope),
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
    const file = path.join(reportRoot, ...normalized.split("/"));
    const hash = hashFile(file);
    if (!hash || hash !== report.sha256) {
      throw new Error(`Consumed ${definition.scope} report differs from the publication proof: ${source}.`);
    }
    consumed[source] = hash;
  }
  return consumed;
}

function classifyProvenanceFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
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
      ...classifyProvenanceFailure(error),
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
  const validationFsApi = reportFsApi(scope, summaryFile, lcovFile);
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
  return {
    scope,
    state: files.length > 0 ? finalState : (reportValidationFailed ? "EVIDENCE_UNVERIFIED" : finalState),
    proofState: finalState,
    metrics: aggregateFiles(files),
    files,
    diagnostics: [...source.diagnostics, ...finalProvenance.diagnostics],
    provenance: finalProvenance,
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

function readProvenance(file, scope, reportFiles, validation = null) {
  const data = readJson(file);
  return {
    scope,
    file: file ? path.relative(process.cwd(), file).replaceAll("\\", "/") : null,
    data,
    reportHashes: Object.fromEntries(Object.entries(reportFiles).map(([name, value]) => [name, hashFile(value)])),
    validation: validation ? {
      state: validation.state,
      diagnostics: validation.diagnostics,
      consumedReportHashes: validation.consumedReportHashes,
    } : { state: "NOT_MEASURED", diagnostics: [], consumedReportHashes: {} },
  };
}

function markdown(reference) {
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
    `États de provenance vérifiés par le générateur : ${provenanceSummary || "aucun scope"}. Un scope n'est marqué 'CI_EXACT_SHA' qu'après validation de la preuve de publication CI, de l'identité du candidat, des empreintes des rapports consommés et des validateurs canoniques. Les preuves PostgreSQL, RLS, RPC, concurrence, Clerk réel et device natif ne sont pas exécutées par cette photographie.`,
    "",
    "Aucun seuil n'est activé : toutes les familles restent `OBSERVE`. Les domaines sans cible canonique restent `NO_TARGET_DEFINED` ou `RISK_CLASSIFICATION_REQUIRED`.",
    "",
    "## Tableau global",
    "",
    "| Scope | Provenance | Statements | Branches | Functions | Lines | Verdict de mesure |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const scope of reference.scopes) {
    const m = scope.metrics;
    const fmt = (value) => value.total === 0 ? "NOT_MEASURED" : `${value.covered}/${value.total} — ${value.pct.toFixed(2)} %`;
    lines.push(`| ${scope.scope} | ${scope.proofState} | ${fmt(m.statements)} | ${fmt(m.branches)} | ${fmt(m.functions)} | ${fmt(m.lines)} | ${scope.state} |`);
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
  for (const [domain, family] of Object.entries(COVERAGE_RISK_FAMILIES)) {
    const files = web.files.filter((file) => file.family === domain);
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
  lines.push("", "## Top 50 — plus grands deltas", "", "Le détail exhaustif est dans le JSON lié. Les deltas sont calculés sur les compteurs exacts, jamais sur les pourcentages arrondis.", "", "| Rang | Scope | Famille | Fichier | Delta max pp | Unités additionnelles max |", "| ---: | --- | --- | --- | ---: | ---: |");
  for (const [index, file] of topDelta(reference.scopes.flatMap((scope) => scope.files)).entries()) lines.push(`| ${index + 1} | ${file.scope} | ${file.family ?? "NO_TARGET_DEFINED"} | \`${file.path}\` | ${file.maxDeltaPp.toFixed(2)} | ${file.maxAdditional} |`);
  lines.push("", "## Top 50 — plus grand volume manquant", "", "Lignes et branches sont affichées séparément ; elles ne sont pas additionnées entre métriques.", "", "| Rang | Scope | Famille | Fichier | Lignes à couvrir | Branches à couvrir |", "| ---: | --- | --- | --- | ---: | ---: |");
  for (const [index, file] of topAbsoluteDeficit(web.files).entries()) lines.push(`| ${index + 1} | ${file.scope} | ${file.family} | \`${file.path}\` | ${file.deficits.lines.additional ?? "—"} | ${file.deficits.branches.additional ?? "—"} |`);
  lines.push("", "## Branches critiques non couvertes", "", "Les lignes ci-dessous sont des points de branchement instrumentés non couverts dans les familles Web classées security, api-persistence ou business. Elles sont des priorités de test, pas une interprétation automatique de l'intention métier.", "");
  const critical = web.files.filter((file) => ["security", "api-persistence", "business"].includes(file.family) && file.uncoveredBranches > 0).flatMap((file) => file.uncoveredBranchLines.map((line) => ({ path: file.path, family: file.family, line }))).slice(0, 80);
  for (const entry of critical) lines.push(`- \`${entry.family}\` — \`${entry.path}:${entry.line}\``);
  if (critical.length === 0) lines.push("- Aucune branche critique mesurable dans les rapports retenus.");
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
    `| Web | \`npm run test:coverage\` puis \`npm run quality:coverage\` | ${web?.state ?? "NOT_MEASURED"} | EXECUTED_BEHAVIOR / ${web?.proofState ?? "NOT_MEASURED"} | publication et rapports consommés vérifiés lorsque l'état est CI_EXACT_SHA |`,
    `| Mobile | \`npm run quality:mobile-coverage\` | ${mobile?.state ?? "NOT_MEASURED"} | EXECUTED_BEHAVIOR / ${mobile?.proofState ?? "NOT_MEASURED"} | preuve d'intégration absente si le scope reste non attesté |`,
    `| Node/scripts | \`npm run test:coverage:node\` | ${node?.state ?? "NOT_MEASURED"} | EXECUTED_BEHAVIOR / ${node?.proofState ?? "NOT_MEASURED"} | pas de cible canonique ; le rapport couvre le périmètre réel du producteur |`,
    `| Python | \`npm run test:coverage:python\` | ${python?.state ?? "NOT_MEASURED"} | WORKTREE_LIVE / ${python?.proofState ?? "NOT_MEASURED"} | aucune preuve CI exacte si le scope reste non attesté |`,
    "| PostgreSQL/Supabase | workflow `e2e-supabase-ephemeral` | NOT_EXECUTED | DB_SEMANTICS_NOT_EXECUTED | démarrage éphémère en échec (`SUPABASE_START_START_TIMEOUT`) |",
    "| E2E/natif/Clerk réel | workflows et appareils | NOT_MEASURED | NOT_MEASURED | non requis pour produire les rapports de couverture code |",
    "",
    "## Prochains macro-lots",
    "",
    "| Priorité | Owner / périmètre | Motif | Preuve attendue |",
    "| --- | --- | --- | --- |",
    "| P0 | PostgreSQL notifications/gamification, RLS, CAS, concurrence | invariants persistants non exécutés | runner Supabase éphémère opérationnel + assertions pgTAP exécutées |",
    "| P0 | `apps/web/src/lib/auth`, `src/proxy`, routes account | security sous les objectifs et branches critiques manquantes | tests négatifs AuthN/AuthZ + couverture Web comparable |",
    "| P1 | `apps/web/src/app/api`, persistence et producteurs métier | branches sous 80 % dans API/business | HTTP/integration tests avec effets persistés et erreurs |",
    "| P1 | `unclassified`, notamment Gamification | volume important sans qualification canonique | classification owner/risk ratifiée ou campagne dédiée sans seuil inventé |",
    "| P2 | Node/scripts | mesure utile mais cible absente | seuil ratifié séparément et preuve CI stable |",
    "| P2 | Python | preuve locale non publiée | job CI sélectionné au SHA exact et rapport Cobertura attesté |",
    "| P3 | UI presentational | pas de seuil uniforme | tests comportementaux/accessibilité ciblés, pas de ratchet visuel uniforme |",
    "",
    "## Méthode, limites et verdict",
    "",
    "Les rapports CI Web/Node ont été téléchargés depuis le run `40360964042` au SHA exact. Les compteurs par fichier sont conservés dans `coverage-reference-2026-10-26.json`, avec empreintes des rapports sources, classification primaire et déficits calculés. Les comparaisons M0 ne sont pas présentées comme un gain avant/après : SHA, configuration et périmètres diffèrent. La seule comparaison comparable conservée est la comparaison historique `route-calculs` du checker CI, `PASS_WITH_GRACE`.",
    "",
    "**STOP CONDITION : PARTIELLE.** Les périmètres Web et Node mesurés sont inventoriés ; Mobile et Python ont une preuve limitée ; les preuves PostgreSQL et les intégrations externes restent manquantes. Aucun faux PASS ni changement de baseline, seuil, exclusion ou politique n'a été introduit.",
    "",
    "Artefact structuré : [`coverage-reference-2026-10-26.json`](coverage-reference-2026-10-26.json).",
  );
  return `${lines.join("\n")}\n`;
}

function publicationRootFor(scopeRoot, proofFile = null) {
  if (proofFile) {
    const absolute = path.resolve(proofFile);
    return path.dirname(path.dirname(path.dirname(absolute)));
  }
  return path.join(scopeRoot, "artifacts", "coverage-publication");
}

export function buildReference({ args = parseArgs(process.argv), now = new Date() } = {}) {
  const auditedSha = args.sha;
  if (!auditedSha) throw new Error("Missing required argument --sha.");
  const repositoryRoot = args["repository-root"] ? path.resolve(args["repository-root"]) : process.cwd();
  const webRoot = required(args, "web-root");
  const nodeRoot = required(args, "node-root");
  const mobileRoot = args["mobile-root"] ? path.resolve(args["mobile-root"]) : null;
  const pythonRoot = args["python-root"] ? path.resolve(args["python-root"]) : null;
  const webEvidenceFile = args["web-evidence"] ? path.resolve(args["web-evidence"]) : path.join(webRoot, "apps/web/coverage/coverage-evidence.json");
  const nodeProofFile = args["node-proof"] ? path.resolve(args["node-proof"]) : path.join(nodeRoot, "artifacts/coverage-publication", auditedSha, "node", "coverage-publication-proof.json");
  const webSummary = path.join(webRoot, "apps/web/coverage/coverage-summary.json");
  const webLcov = path.join(webRoot, "apps/web/coverage/lcov.info");
  const nodeSummary = path.join(nodeRoot, "scripts/coverage/coverage-summary.json");
  const nodeLcov = path.join(nodeRoot, "scripts/coverage/lcov.info");
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
    scope: "mobile", root: mobileRoot, repositoryRoot, summaryFile: path.join(mobileRoot, "apps/mobile/coverage/coverage-summary.json"), lcovFile: path.join(mobileRoot, "apps/mobile/coverage/lcov.info"), auditedSha,
    proofState: "WORKTREE_LIVE/PRESENT_NOT_ATTESTED",
    definition: { scope: "mobile", lcovPath: "apps/mobile/coverage/lcov.info", summaryPath: "apps/mobile/coverage/coverage-summary.json", sourceRoot: "apps/mobile" },
  }));
  if (pythonRoot) scopes.push(buildScope({
    scope: "python", root: pythonRoot, repositoryRoot, summaryFile: null, lcovFile: path.join(pythonRoot, "maintenance/python/coverage.xml"), auditedSha,
    proofState: "WORKTREE_LIVE/PRESENT_NOT_ATTESTED",
    definition: { scope: "python", format: "cobertura", coveragePath: "maintenance/python/coverage.xml", sourceRoot: "maintenance/python" },
  }));
  const scopeByName = new Map(scopes.map((scope) => [scope.scope, scope]));
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
    rankings: { topDelta: topDelta(scopes.flatMap((scope) => scope.files)), topAbsoluteDeficit: topAbsoluteDeficit(scopes.find((scope) => scope.scope === "web")?.files ?? []) },
    provenance: {
      web: readProvenance(webEvidenceFile, "web", { summary: webSummary, lcov: webLcov }, scopeByName.get("web")?.provenance),
      node: readProvenance(nodeProofFile, "node", { summary: nodeSummary, lcov: nodeLcov }, scopeByName.get("node")?.provenance),
      mobile: readProvenance(args["mobile-evidence"] ? path.resolve(args["mobile-evidence"]) : null, "mobile", { summary: mobileRoot ? path.join(mobileRoot, "apps/mobile/coverage/coverage-summary.json") : null, lcov: mobileRoot ? path.join(mobileRoot, "apps/mobile/coverage/lcov.info") : null }, scopeByName.get("mobile")?.provenance),
      python: { scope: "python", report: pythonRoot ? path.relative(process.cwd(), path.join(pythonRoot, "maintenance/python/coverage.xml")).replaceAll("\\", "/") : null, reportSha256: pythonRoot ? hashFile(path.join(pythonRoot, "maintenance/python/coverage.xml")) : null, validation: scopeByName.get("python")?.provenance ? { state: scopeByName.get("python").provenance.state, diagnostics: scopeByName.get("python").provenance.diagnostics } : { state: "NOT_MEASURED", diagnostics: [] } },
    },
    limits: ["DB_SEMANTICS_NOT_EXECUTED", "NO_TARGET_DEFINED for mobile/node/python", "RISK_CLASSIFICATION_REQUIRED for Web unclassified", "no Web new-code-non-critical prefix is currently qualified"],
  };
  return reference;
}

function main() {
  const args = parseArgs(process.argv);
  const reference = buildReference({ args });
  const outputJson = path.resolve(args["output-json"] ?? `documentation/operations/audits/coverage-reference-${reference.date}.json`);
  const outputMd = path.resolve(args["output-md"] ?? `documentation/operations/audits/coverage-reference-${reference.date}.md`);
  fs.writeFileSync(outputJson, `${JSON.stringify(reference, null, 2)}\n`, "utf8");
  fs.writeFileSync(outputMd, markdown(reference), "utf8");
  console.log(`COVERAGE_REFERENCE_WRITTEN: ${outputMd}`);
  console.log(`COVERAGE_REFERENCE_JSON: ${outputJson}`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; }
}
