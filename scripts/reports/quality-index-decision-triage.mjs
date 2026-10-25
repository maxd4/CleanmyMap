import crypto from "node:crypto";

const QUALITY_DECISION_TRIAGE_SCHEMA_VERSION = 1;

const RISK_ORDER = Object.freeze({ R1: 1, R2: 2, R3: 3, R4: 4, REVIEW_REQUIRED: 0 });
const PRIORITY_ORDER = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3, REVIEW_REQUIRED: 4 });
const BENEFIT_ORDER = Object.freeze({ HIGH: 0, MEDIUM: 1, LOW: 2, NOT_ESTIMABLE: 3 });

const FINDING_SOURCES = Object.freeze([
  ["topHeavy", "top-heavy"],
  ["complexity", "complexity"],
  ["functionLength", "functionLength"],
  ["cognitiveComplexity", "cognitive-complexity"],
  ["localMaintainability", "maintainability"],
  ["typeSafety", "type-safety"],
  ["asyncSafety", "type-safety"],
  ["deadCode", "dead-code"],
  ["hotspots", "hotspots"],
  ["testability", "testability"],
  ["coverage", "coverage"],
  ["documentation", "documentation"],
]);

const VALID_RECOMMENDATIONS = new Set(["CORRECT", "REVIEW_FIRST", "KEEP_JUSTIFIED", "NO_ACTION_NOISE", "INVESTIGATE"]);

function stableId(scope, value) {
  return crypto.createHash("sha256").update(`${scope}:${JSON.stringify(value)}`).digest("hex").slice(0, 24);
}

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function textOf(...values) {
  return values.filter((value) => value !== null && value !== undefined).map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" ");
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, stripUndefined(entry)]));
}

function lineInterval(occurrence) {
  const startLine = Number.isInteger(occurrence?.startLine) ? occurrence.startLine : null;
  const endLine = Number.isInteger(occurrence?.endLine) ? occurrence.endLine : null;
  if (startLine === null || endLine === null || startLine < 1 || endLine < startLine) return null;
  return { startLine, endLine };
}

function distinctLineCount(occurrences) {
  const byFile = new Map();
  for (const occurrence of occurrences) {
    const interval = lineInterval(occurrence);
    const file = normalizePath(occurrence?.path);
    if (!file || !interval) continue;
    const intervals = byFile.get(file) ?? [];
    intervals.push(interval);
    byFile.set(file, intervals);
  }

  let total = 0;
  for (const intervals of byFile.values()) {
    intervals.sort((left, right) => left.startLine - right.startLine || left.endLine - right.endLine);
    let current = null;
    for (const interval of intervals) {
      if (!current) {
        current = { ...interval };
      } else if (interval.startLine <= current.endLine + 1) {
        current.endLine = Math.max(current.endLine, interval.endLine);
      } else {
        total += current.endLine - current.startLine + 1;
        current = { ...interval };
      }
    }
    if (current) total += current.endLine - current.startLine + 1;
  }
  return total > 0 ? total : null;
}

function occurrenceEndpoints(occurrences) {
  return occurrences.flatMap((occurrence) => {
    const endpoints = [occurrence?.occurrenceA, occurrence?.occurrenceB].filter(Boolean);
    return endpoints.length > 0 ? endpoints : [occurrence];
  });
}

function distinctLinesAcrossFiles(occurrences) {
  return distinctLineCount(occurrenceEndpoints(occurrences));
}

function fileRiskSignals(file, category, finding = null) {
  const architecture = file?.architecture ?? {};
  const architectureValue = architecture.metrics ?? architecture.value ?? {};
  const observed = textOf(
    file?.path,
    architecture.domain,
    architecture.layer,
    architecture.effectiveLayer,
    architecture.sourceKind,
    architecture.decision,
    architecture.architectureDecision,
    category,
    finding,
  ).toLowerCase();
  const reasons = new Set();

  if (/(authn|authz|rls|service[_ -]?role|permission|ownership|personal|pii|security|secret|transaction|migration|publish)/i.test(observed)) {
    reasons.add("responsabilité sensible explicitement visible dans le chemin, la classification ou le finding");
    return { level: "R4", reasons: [...reasons], observed: architectureValue };
  }

  if (/(spogomi|action|geometry|gamif|report|pdf|persist|store|service|domain|api|route|repository|database|supabase)/i.test(observed)
    || ["cycles", "complexity", "functionLength", "dead-code", "maintainability"].includes(category)) {
    reasons.add("service, domaine, persistance, rapport ou dette structurelle observé(e)");
    return { level: "R3", reasons: [...reasons], observed: architectureValue };
  }

  if (/(component|view|present|form|hook|ui|tsx|jsx)/i.test(observed)) {
    reasons.add("état UI, interaction ou présentation observé(e)");
    return { level: "R2", reasons: [...reasons], observed: architectureValue };
  }

  if (/(format|serializer|escape|render|style|template)/i.test(observed)) {
    reasons.add("présentation ou formatage sans effet sensible observé(e)");
    return { level: "R1", reasons: [...reasons], observed: architectureValue };
  }

  return { level: "REVIEW_REQUIRED", reasons: ["responsabilité effective insuffisamment observable dans l’index"], observed: architectureValue };
}

function combinePrudence(files, category, finding) {
  const signals = files.map((file) => ({ file: file.path, ...fileRiskSignals(file, category, finding) }));
  if (signals.length === 0) return { level: "REVIEW_REQUIRED", reasons: ["aucun fichier participant disponible"], participants: [] };
  const unknown = signals.some((signal) => signal.level === "REVIEW_REQUIRED");
  const known = signals.filter((signal) => signal.level !== "REVIEW_REQUIRED");
  const highest = known.sort((left, right) => RISK_ORDER[right.level] - RISK_ORDER[left.level])[0];
  if (!highest || (unknown && RISK_ORDER[highest.level] < RISK_ORDER.R4)) {
    return {
      level: "REVIEW_REQUIRED",
      reasons: uniqueSorted(signals.flatMap((signal) => signal.reasons).concat("une partie indispensable du périmètre reste indéterminée")),
      participants: signals,
    };
  }
  return {
    level: highest.level,
    reasons: uniqueSorted(signals.filter((signal) => signal.level === highest.level).flatMap((signal) => signal.reasons)),
    participants: signals,
  };
}

function evidenceForFiles(files, category, findings = []) {
  const stale = findings.some((finding) => finding.type === "stale" || String(finding.type ?? "").startsWith("stale"));
  const key = fileCategoryKey(category);
  const states = files.map((file) => file.findings?.[key]?.state ?? file.metrics?.[key]?.state ?? "NOT_MEASURED");
  const notMeasured = states.some((value) => value === "NOT_MEASURED");
  const filesWithExactEvidence = files.filter((file) => {
    const source = file.findings?.[key] ?? file.metrics?.[key];
    return source?.state === "PRESENT" && (file.provenance?.[key] || file.provenance?.[category] || file.provenance?.complexity || file.provenance?.maintainability);
  }).length;
  const gaps = [];
  if (stale) gaps.push("preuve périmée");
  if (notMeasured) gaps.push("mesure absente ou non attribuable");
  if (files.length === 0) gaps.push("fichier participant absent");
  if (filesWithExactEvidence < files.length && files.length > 0) gaps.push("provenance détaillée incomplète");
  return {
    state: stale ? "STALE_EVIDENCE" : notMeasured ? "NOT_MEASURED" : "PRESENT",
    confidence: stale || notMeasured ? "LOW" : filesWithExactEvidence === files.length ? "HIGH" : "MEDIUM",
    gaps: uniqueSorted(gaps),
    filesWithExactEvidence,
  };
}

function hotspotEvidence(files) {
  const measured = files.map((file) => file.metrics?.hotspots?.items?.[0]).filter(Boolean);
  if (measured.length === 0) return { state: "NOT_MEASURED", highActivityFiles: 0, commits: null, proof: "aucune mesure hotspot attribuable" };
  const highActivityFiles = measured.filter((item) => item.activity?.highActivity === true).length;
  const commits = measured.reduce((sum, item) => sum + (Number.isInteger(item.activity?.commits) ? item.activity.commits : 0), 0);
  return { state: "PRESENT", highActivityFiles, commits, proof: "activité Git/hotspot conservée depuis le rapport auxiliaire" };
}

function fileCategoryKey(category) {
  return {
    "top-heavy": "topHeavy",
    "dead-code": "deadCode",
    "cognitive-complexity": "cognitiveComplexity",
    "type-safety": "typeSafety",
    "architecture-import-boundary": "architecture",
  }[category] ?? category;
}

function humanClassification(candidate) {
  return candidate.classification ?? candidate.finding?.classification ?? null;
}

function architectureDecision(files) {
  const decisions = uniqueSorted(files.flatMap((file) => [file.architecture?.decision, file.architecture?.architectureDecision]));
  return decisions.length > 0 ? decisions : [];
}

function exactValidation(category, prudence, recommendation) {
  const validations = [];
  if (category === "duplication") validations.push("relire les deux owners et leurs invariants ; mesurer jscpd sans assimiler le fingerprint à une cause racine");
  else if (category === "cycles") validations.push("obtenir une mesure cycles réelle selon la politique ; ne pas déduire l’absence de cycle d’un contrôle SKIPPED_BY_POLICY");
  else if (category === "architecture-import-boundary") validations.push("revue d’owner et test de frontière/import ; renforcer la preuve AuthN/AuthZ ou sécurité si le finding le justifie");
  else if (category === "dead-code") validations.push("rechercher consommateurs statiques et dynamiques, contrats publics, tests et compatibilité avant suppression");
  else if (category === "type-safety" || category === "coverage" || category === "testability") validations.push("vérifier la preuve attribuée au SHA et exécuter le contrat de validation concerné");
  else validations.push("tests du contrat et invariants de la responsabilité ; aucune extraction automatique fondée sur le seul niveau");
  if (prudence.level === "R4") validations.push("validation renforcée de sécurité, permissions, intégrité ou données sensibles selon la responsabilité observée");
  else if (prudence.level === "R3") validations.push("revue métier et tests de non-régression du service, de la persistance ou du rapport concerné");
  if (recommendation === "INVESTIGATE") validations.push("compléter la mesure manquante avant de recommander une correction");
  return uniqueSorted(validations);
}

function benefitLevel(category, { files, findingCount, exactLines, hotspot, evidenceState }) {
  if (evidenceState !== "PRESENT") return "NOT_ESTIMABLE";
  if (category === "duplication" && exactLines !== null) {
    if (findingCount > 1 || files.length > 2) return "HIGH";
    return "MEDIUM";
  }
  if (hotspot.highActivityFiles > 0 && findingCount > 0) return "HIGH";
  if (["architecture-import-boundary", "dead-code", "complexity", "functionLength", "cognitive-complexity"].includes(category)) return "MEDIUM";
  return "LOW";
}

function effortEstimate(category, { files, prudence, evidenceState, classification, architectureDecisions }) {
  if (evidenceState !== "PRESENT") return { level: "NOT_ESTIMABLE", basis: ["mesure ou preuve incomplète"] };
  if (classification === "KEEP_INTENTIONAL" || classification === "NO_ACTION_NOISE") return { level: "NOT_APPLICABLE", basis: ["décision humaine existante : aucune correction proposée"] };
  if (architectureDecisions.some((decision) => ["COHESIVE_SINGLE_FILE", "DEFERRED_SPLIT"].includes(decision))) {
    return { level: "NOT_ESTIMABLE", basis: ["décision de modularité existante : owner cohésif ou split différé"] };
  }
  if (prudence.level === "R4" || prudence.level === "R3") return { level: "SIGNIFICANT", basis: ["périmètre métier ou sensible nécessitant une revue renforcée"] };
  if (category === "duplication" && files.length <= 2) return { level: "APPARENTLY_LIMITED", basis: ["deux participants exactement mesurés"] };
  if (["top-heavy", "functionLength", "cognitive-complexity"].includes(category) && files.length === 1) return { level: "APPARENTLY_LIMITED", basis: ["un seul fichier participant, sans périmètre sensible observé"] };
  return { level: "NOT_ESTIMABLE", basis: ["le rapport ne mesure pas l’effort d’implémentation"] };
}

function isConfirmedCritical() {
  // Quality Audit findings currently expose no structured, attributable proof
  // that jointly confirms a defect and its criticality. Do not infer P0 from
  // free text, field names, risk levels, or engine statuses.
  return false;
}

function makeCandidate({ id, sourceKind, category, files, finding = null, classification = null, occurrences = [], distinctLinesAcrossFiles: measuredDistinctLines, groupEvidence = null, audits = {} }) {
  const normalizedFiles = files.sort((left, right) => left.path.localeCompare(right.path));
  const prudence = combinePrudence(normalizedFiles, category, finding);
  const evidence = evidenceForFiles(normalizedFiles, category, finding ? [finding] : []);
  const hotspot = hotspotEvidence(normalizedFiles);
  const exactLines = measuredDistinctLines === undefined ? distinctLineCount(occurrences) : measuredDistinctLines;
  const findingCount = sourceKind === "group" ? occurrences.length : finding ? 1 : 0;
  const architectureDecisions = architectureDecision(normalizedFiles);
  const humanDecision = classification ?? finding?.classification ?? null;
  let recommendation = "CORRECT";
  if (humanDecision === "KEEP_INTENTIONAL") recommendation = "KEEP_JUSTIFIED";
  else if (humanDecision === "NO_ACTION_NOISE") recommendation = "NO_ACTION_NOISE";
  else if (sourceKind === "measurement-gap" || evidence.state !== "PRESENT" || prudence.level === "REVIEW_REQUIRED") recommendation = "INVESTIGATE";
  else if (prudence.level === "R3" || prudence.level === "R4" || architectureDecisions.some((decision) => ["COHESIVE_SINGLE_FILE", "DEFERRED_SPLIT"].includes(decision))) recommendation = "REVIEW_FIRST";
  if (!VALID_RECOMMENDATIONS.has(recommendation)) recommendation = "INVESTIGATE";

  const benefit = {
    level: benefitLevel(category, { files: normalizedFiles, findingCount, exactLines, hotspot, evidenceState: evidence.state }),
    impactDemonstrated: sourceKind !== "measurement-gap" && evidence.state === "PRESENT",
    debtReductionPotential: null,
    architecturalImportance: prudence.level,
    proof: sourceKind === "group" ? "relations et occurrences exactes du rapport de duplication/cycles" : sourceKind === "measurement-gap" ? "statut du rapport sans finding inventé" : "finding présent dans la projection par fichier",
    measures: {
      files: normalizedFiles.length,
      linkedFindings: findingCount,
      occurrencePairs: sourceKind === "group" ? occurrences.length : null,
      distinctLinesAcrossFiles: exactLines,
      hotspot,
    },
  };
  benefit.debtReductionPotential = benefit.level;
  benefit.filesAffected = normalizedFiles.length;
  benefit.linkedFindings = findingCount;
  const effort = effortEstimate(category, { files: normalizedFiles, prudence, evidenceState: evidence.state, classification: humanDecision, architectureDecisions });
  let proposedPriority = "P3";
  if (sourceKind === "measurement-gap" || evidence.state !== "PRESENT" || prudence.level === "REVIEW_REQUIRED") proposedPriority = "REVIEW_REQUIRED";
  else if (isConfirmedCritical(finding, category, prudence)) proposedPriority = "P0";
  else if (humanDecision === "KEEP_INTENTIONAL" || humanDecision === "NO_ACTION_NOISE") proposedPriority = "P3";
  else if (benefit.level === "HIGH" && effort.level === "APPARENTLY_LIMITED" && ["R1", "R2"].includes(prudence.level)) proposedPriority = "P1";
  else if (["HIGH", "MEDIUM"].includes(benefit.level) || ["R3", "R4"].includes(prudence.level)) proposedPriority = "P2";

  const confidence = evidence.confidence === "HIGH" && prudence.level !== "REVIEW_REQUIRED" ? "HIGH" : evidence.confidence === "LOW" || prudence.level === "REVIEW_REQUIRED" ? "LOW" : "MEDIUM";
  const validationEffort = evidence.state !== "PRESENT" || prudence.level === "REVIEW_REQUIRED"
    ? "NOT_ESTIMABLE"
    : ["R3", "R4"].includes(prudence.level) ? "REINFORCED" : "TARGETED";
  const gaps = uniqueSorted([
    ...evidence.gaps,
    ...(prudence.level === "REVIEW_REQUIRED" ? ["prudence architecturale insuffisamment établie"] : []),
    ...(benefit.level === "NOT_ESTIMABLE" ? ["potentiel de gain non quantifiable avec les mesures disponibles"] : []),
    ...(effort.level === "NOT_ESTIMABLE" ? ["effort d’implémentation non mesuré"] : []),
  ]);
  const validations = exactValidation(category, prudence, recommendation);

  return {
    id,
    rank: null,
    sourceKind,
    auditCategory: category,
    findingId: id,
    files: normalizedFiles.map((file) => file.path),
    proposedPriority,
    benefitPotential: benefit,
    effort,
    validationEffort,
    prudence: { level: prudence.level, reasons: prudence.reasons, participants: prudence.participants },
    confidence,
    gaps,
    recommendation,
    humanDecision,
    architectureDecisions,
    validations,
    evidence: {
      state: evidence.state,
      provenance: uniqueSorted(normalizedFiles.flatMap((file) => [file.provenance?.[fileCategoryKey(category)], file.provenance?.[category], file.provenance?.complexity, file.provenance?.maintainability])),
      finding: stripUndefined(finding ?? null),
      occurrences: occurrences.map((occurrence) => ({
        occurrenceA: stripUndefined(occurrence.occurrenceA ?? occurrence),
        occurrenceB: stripUndefined(occurrence.occurrenceB ?? null),
      })),
      group: stripUndefined(groupEvidence),
      source: stripUndefined(audits),
    },
  };
}

function fileFindingCandidates(files, audits) {
  const candidates = [];
  for (const file of files) {
    for (const [key, category] of FINDING_SOURCES) {
      for (const finding of file.findings?.[key]?.items ?? []) {
        if (key === "complexity" && finding.metric === "functionLength") continue;
        candidates.push(makeCandidate({
          id: finding.id ?? stableId(`quality-finding:${category}`, { file: file.path, finding }),
          sourceKind: "finding",
          category,
          files: [file],
          finding,
          audits: { status: audits[category]?.status ?? null },
        }));
      }
    }
    for (const finding of file.architecture?.findings?.boundaryViolations?.items ?? []) {
      candidates.push(makeCandidate({
        id: finding.id ?? stableId("quality-finding:architecture-import-boundary", { file: file.path, finding }),
        sourceKind: "finding",
        category: "architecture-import-boundary",
        files: [file],
        finding,
        audits: { status: audits.architecture?.status ?? null },
      }));
    }
  }
  return candidates;
}

function duplicationCandidates(audits, candidateGroups, fileByPath) {
  const candidates = [];
  for (const fingerprint of audits.duplication?.fingerprints ?? []) {
    const occurrences = (fingerprint.occurrences ?? []).map((pair) => ({
      occurrenceA: { ...pair.occurrenceA, path: normalizePath(pair.occurrenceA?.path) },
      occurrenceB: { ...pair.occurrenceB, path: normalizePath(pair.occurrenceB?.path) },
    }));
    const files = uniqueSorted(occurrences.flatMap((pair) => [pair.occurrenceA.path, pair.occurrenceB.path])).map((file) => fileByPath.get(file)).filter(Boolean);
    const group = candidateGroups.find((candidateGroup) => candidateGroup.id === fingerprint.relationId) ?? null;
    const id = fingerprint.relationId ?? stableId("duplication-group", { scope: fingerprint.scope, fingerprint: fingerprint.fingerprint });
    const measuredDistinctLines = distinctLinesAcrossFiles(occurrences);
    candidates.push(makeCandidate({
      id,
      sourceKind: "group",
      category: "duplication",
      files,
      classification: fingerprint.classification,
      occurrences,
      distinctLinesAcrossFiles: measuredDistinctLines,
      groupEvidence: {
        scope: fingerprint.scope,
        fingerprint: fingerprint.fingerprint,
        occurrencePairs: occurrences.length,
        uniqueFiles: uniqueSorted(occurrences.flatMap((pair) => [pair.occurrenceA.path, pair.occurrenceB.path])),
        distinctLinesAcrossFiles: measuredDistinctLines,
        relations: group?.relations ?? occurrences,
        classification: fingerprint.classification ?? null,
      },
      audits: { status: audits.duplication?.status ?? null },
    }));
  }
  return candidates;
}

function cycleCandidates(audits, candidateGroups, fileByPath) {
  if (audits.cycles?.status === "SKIPPED_BY_POLICY") return [];
  return (audits.cycles?.cycles ?? []).map((cycle) => {
    const paths = uniqueSorted(cycle.files ?? cycle.cycle?.files ?? []);
    const files = paths.map((file) => fileByPath.get(file)).filter(Boolean);
    const id = cycle.id ?? stableId("cycle-group", paths);
    const group = candidateGroups.find((candidateGroup) => candidateGroup.id === id) ?? null;
    return makeCandidate({
      id,
      sourceKind: "group",
      category: "cycles",
      files,
      groupEvidence: { kind: "cycle", files: paths, cycle: cycle.cycle ?? cycle, relations: group?.relations ?? [] },
      audits: { status: audits.cycles?.status ?? null },
    });
  });
}

function measurementGapCandidates(audits) {
  return Object.entries(audits).flatMap(([audit, summary]) => {
    if (!summary || !["NOT_MEASURED", "SKIPPED_BY_POLICY"].includes(summary.state)) return [];
    const id = stableId("quality-measurement-gap", { audit, state: summary.state, reason: summary.reason ?? null });
    return [makeCandidate({
      id,
      sourceKind: "measurement-gap",
      category: audit,
      files: [],
      finding: { state: summary.state, reason: summary.reason ?? summary.detail ?? null },
      groupEvidence: { status: summary.status ?? null, state: summary.state, reason: summary.reason ?? summary.detail ?? null },
      audits: { status: summary.status ?? null },
    })];
  });
}

function sortCandidate(left, right) {
  const benefitLeft = BENEFIT_ORDER[left.benefitPotential.level] ?? 99;
  const benefitRight = BENEFIT_ORDER[right.benefitPotential.level] ?? 99;
  return (PRIORITY_ORDER[left.proposedPriority] ?? 99) - (PRIORITY_ORDER[right.proposedPriority] ?? 99)
    || (RISK_ORDER[right.prudence.level] ?? 0) - (RISK_ORDER[left.prudence.level] ?? 0)
    || benefitLeft - benefitRight
    || left.id.localeCompare(right.id);
}

function viewCandidate(candidate) {
  return candidate;
}

function historyComparisonTriage(comparison) {
  const candidates = (comparison?.functions ?? [])
    .filter((entry) => entry.state === "CHANGED")
    .map((entry) => ({
      path: entry.path,
      functionIdentity: entry.functionIdentity,
      state: entry.state,
      comparability: entry.comparability,
      changes: entry.changes,
      recommendation: "REVIEW_FIRST",
      priority: "REVIEW_REQUIRED",
    }))
    .sort((left, right) => left.path.localeCompare(right.path) || left.functionIdentity.localeCompare(right.functionIdentity));
  return {
    state: comparison?.state ?? "NOT_MEASURED",
    comparability: comparison?.comparability ?? "NOT_COMPARABLE",
    reason: comparison?.reason ?? "HISTORICAL_COMPARISON_NOT_AVAILABLE",
    summary: comparison?.summary ?? null,
    candidates,
    unmatchedFunctions: comparison?.unmatchedFunctions ?? [],
  };
}

export function buildQualityIndexDecisionTriage({ files = [], audits = {}, source = {}, candidateGroups = [], comparison = null } = {}) {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const candidates = [
    ...fileFindingCandidates(files, audits),
    ...duplicationCandidates(audits, candidateGroups, fileByPath),
    ...cycleCandidates(audits, candidateGroups, fileByPath),
    ...measurementGapCandidates(audits),
  ].sort(sortCandidate);
  candidates.forEach((candidate, index) => { candidate.rank = index + 1; });

  const quickWins = candidates.filter((candidate) => candidate.proposedPriority === "P1"
    && ["R1", "R2"].includes(candidate.prudence.level)
    && candidate.effort.level === "APPARENTLY_LIMITED"
    && candidate.confidence === "HIGH"
    && candidate.recommendation === "CORRECT");
  const reinforcedReview = candidates.filter((candidate) => ["P0", "P2", "REVIEW_REQUIRED"].includes(candidate.proposedPriority)
    || ["R3", "R4", "REVIEW_REQUIRED"].includes(candidate.prudence.level)
    || ["REVIEW_FIRST", "INVESTIGATE"].includes(candidate.recommendation));

  return {
    schemaVersion: QUALITY_DECISION_TRIAGE_SCHEMA_VERSION,
    state: candidates.length > 0 ? "PRESENT" : "NOT_MEASURED",
    source: { auditedHead: source.auditedHead ?? null, runId: source.runId ?? null, provenance: source.provenance ?? "NOT_MEASURED" },
    axes: {
      opportunity: ["impactDemonstrated", "debtReductionPotential", "files", "linkedFindings", "architecturalImportance", "hotspots", "implementationEffort", "validationEffort", "confidence"],
      prudence: ["R1", "R2", "R3", "R4", "REVIEW_REQUIRED"],
    },
    candidates,
    views: {
      quickWins: quickWins.map(viewCandidate),
      reinforcedReview: reinforcedReview.map(viewCandidate),
    },
    historicalComparison: historyComparisonTriage(comparison),
    limitations: [
      "Les niveaux P0–P3 sont des priorités proposées et ne remplacent aucun statut de moteur, seuil, baseline ou verdict.",
      "Les groupes de duplication conservent le fingerprint natif, les paires et les fichiers ; ils ne prouvent pas qu’une mutualisation métier est possible.",
      "Les lignes distinctes sont dédupliquées par fichier et intervalle ; elles représentent un potentiel observé, jamais des lignes supprimables garanties.",
      "L’effort, le gain futur et la probabilité de régression ne sont pas mesurés ; ils restent NOT_ESTIMABLE lorsqu’aucune preuve déterministe n’existe.",
      "Un contrôle cycles SKIPPED_BY_POLICY produit uniquement un candidat de manque de mesure, jamais un cycle ou une absence de cycle.",
      "La prudence utilise les responsabilités observables dans les fichiers, l’architecture et les findings ; un périmètre indéterminé reste REVIEW_REQUIRED.",
      "La structure descriptive du contrôle de flux enrichit les profils de fonctions existants, mais ne crée jamais à elle seule un finding, une priorité ou une recommandation.",
      "La comparaison historique reste dérivée et informative : elle exige des couples SHA/runId exacts, des identités de fonction communes et une provenance immuable ; une dégradation n’est jamais une priorité critique par elle-même.",
    ],
    rules: {
      p0: "uniquement une preuve structurée, attribuable et explicitement confirmée conjointement pour le défaut et sa criticité ; aucun FAIL, seuil, R4 ou duplication ne suffit à lui seul",
      p1: "potentiel élevé, effort apparent limité, preuve complète et prudence R1/R2",
      p2: "bénéfice important, diffusion large, périmètre R3/R4 ou effort significatif",
      p3: "bénéfice faible, surveillance ou décision humaine de conservation déjà enregistrée",
      reviewRequired: "mesure, preuve ou responsabilité insuffisante pour décider",
      quickWins: "P1 + R1/R2 + APPARENTLY_LIMITED + confiance HIGH + CORRECT",
      reinforcedReview: "P0/P2/REVIEW_REQUIRED, R3/R4/REVIEW_REQUIRED ou REVIEW_FIRST/INVESTIGATE",
    },
  };
}
