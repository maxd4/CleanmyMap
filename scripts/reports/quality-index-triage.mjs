import { FILE_KIND_POLICY } from "../checks/top-heavy-policy.mjs";
import { buildQualityIndexDecisionTriage } from "./quality-index-decision-triage.mjs";

export function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function stateLabel(value) {
  return value?.state ?? "NOT_MEASURED";
}

const TRIAGE_STRUCTURAL_CATEGORIES = Object.freeze([
  "complexity",
  "functionLength",
  "cognitiveComplexity",
  "localMaintainability",
  "duplication",
  "cycles",
]);

const TRIAGE_LEVEL_ORDER = Object.freeze({
  HARD: 0,
  FAIL: 0,
  REVIEW: 1,
  REVIEW_REQUIRED: 1,
  ARCHITECTURE_REVIEW: 1,
  SURVEILLANCE: 2,
  PREVENTIVE: 2,
  PRESENT: 3,
  NONE: 4,
  NOT_MEASURED: 5,
  NOT_APPLICABLE: 6,
  OUT_OF_INSTRUMENTATION: 6,
});

function triageFileKind(file) {
  return file.metrics.topHeavy.items?.[0]?.kind ?? file.architecture?.sourceKind ?? null;
}

function triageTopHeavyLevel(file) {
  const measurement = file.metrics.topHeavy.items?.[0];
  if (!measurement) return file.metrics.topHeavy.state;
  if (measurement.aboveHard) return "HARD";
  if (measurement.aboveReview) return "REVIEW";
  const preventive = measurement.limits?.preventive ?? FILE_KIND_POLICY[measurement.kind]?.preventive;
  if (preventive && measurement.lines >= preventive.lines) return "PREVENTIVE";
  return "PRESENT";
}

function triageStructuralCategories(file) {
  return TRIAGE_STRUCTURAL_CATEGORIES.filter((category) => file.findings[category]?.state === "PRESENT");
}

function triageEvidenceState(file, categories) {
  const states = categories.map((category) => file.findings[category]?.state ?? file.metrics[category]?.state);
  const stale = categories.some((category) => (file.findings[category]?.items ?? []).some((finding) => finding.type === "stale" || String(finding.type ?? "").startsWith("stale")));
  if (stale) return "STALE_EVIDENCE";
  if (states.some((value) => value === "PRESENT")) return "PRESENT";
  if (states.some((value) => value === "NOT_MEASURED")) return "NOT_MEASURED";
  return "NOT_APPLICABLE";
}

function triageProvenance(file, categories) {
  for (const category of categories) {
    const provenance = file.provenance[category];
    if (provenance) return provenance;
  }
  return "NOT_MEASURED";
}

function triageDecision(file) {
  return file.architecture?.decision
    ?? file.architecture?.architectureDecision
    ?? "NOT_RECORDED_IN_QUALITY_INDEX";
}

function triageCandidate(file, { level, categories, quantitative = null, detail = null }) {
  const evidenceCategories = categories.length > 0 ? categories : ["topHeavy"];
  return {
    path: file.path,
    kind: triageFileKind(file),
    level,
    quantitative,
    structural: categories.filter((category) => category !== "topHeavy"),
    decision: triageDecision(file),
    evidence: triageEvidenceState(file, evidenceCategories),
    provenance: triageProvenance(file, evidenceCategories),
    detail,
  };
}

function sortTriageCandidates(left, right) {
  return (TRIAGE_LEVEL_ORDER[left.level] ?? 99) - (TRIAGE_LEVEL_ORDER[right.level] ?? 99)
    || left.path.localeCompare(right.path)
    || String(left.detail ?? "").localeCompare(String(right.detail ?? ""));
}

function buildCodeTriage(files) {
  return files.flatMap((file) => {
    const kind = triageFileKind(file);
    if (!(kind === "runtime" || kind === "data/config")) return [];
    const topHeavyLevel = triageTopHeavyLevel(file);
    const structural = triageStructuralCategories(file);
    const hasSizeSignal = ["HARD", "REVIEW", "PREVENTIVE"].includes(topHeavyLevel);
    if (!hasSizeSignal && structural.length === 0) return [];
    const categories = [...(hasSizeSignal ? ["topHeavy"] : []), ...structural];
    return [triageCandidate(file, {
      level: hasSizeSignal ? topHeavyLevel : "PRESENT",
      categories,
      quantitative: hasSizeSignal ? {
        level: topHeavyLevel,
        lines: file.metrics.topHeavy.items[0].lines,
        bytes: file.metrics.topHeavy.items[0].bytes,
      } : null,
      detail: structural.length > 0 ? structural.join(", ") : "taille",
    })];
  }).sort(sortTriageCandidates).slice(0, 10);
}

function buildTestTriage(files) {
  return files.flatMap((file) => {
    if (triageFileKind(file) !== "test") return [];
    const topHeavyLevel = triageTopHeavyLevel(file);
    const structural = triageStructuralCategories(file);
    const hasSizeSignal = ["HARD", "REVIEW", "PREVENTIVE"].includes(topHeavyLevel);
    if (!hasSizeSignal && structural.length === 0) return [];
    const categories = [...(hasSizeSignal ? ["topHeavy"] : []), ...structural];
    return [triageCandidate(file, {
      level: hasSizeSignal ? topHeavyLevel : "PRESENT",
      categories,
      quantitative: hasSizeSignal ? {
        level: topHeavyLevel,
        lines: file.metrics.topHeavy.items[0].lines,
        bytes: file.metrics.topHeavy.items[0].bytes,
      } : null,
      detail: structural.length > 0 ? structural.join(", ") : "taille",
    })];
  }).sort(sortTriageCandidates).slice(0, 10);
}

function buildDocumentationTriage(audits, source) {
  if (audits.documentation.state === "NOT_MEASURED") {
    return { state: "NOT_MEASURED", candidates: [], currentPlan: [], historyAudit: [], missingLifecycle: 0 };
  }
  const ranked = (audits.documentation.ranking ?? [])
    .filter((document) => document.level !== "NONE")
    .slice(0, 10)
    .map((document) => ({
      path: document.path,
      level: document.level,
      quantitative: { level: document.level, lines: document.lines, bytes: document.bytes },
      decision: "NOT_RECORDED_IN_QUALITY_INDEX",
      evidence: "PRESENT",
      provenance: source.documentation?.readProvenance ?? "NOT_MEASURED",
      lifecycle: document.lifecycle?.statuses ?? [],
      detail: document.internalLinks?.invalid?.length ? `${document.internalLinks.invalid.length} lien(s) invalide(s)` : "longueur",
    }));
  const currentPlan = ranked.filter((document) => document.lifecycle.some((status) => status === "CURRENT" || status === "PLAN"));
  const historyAudit = ranked.filter((document) => !currentPlan.includes(document) && document.lifecycle.some((status) => status === "HISTORY" || status === "AUDIT"));
  return {
    state: "PRESENT",
    candidates: ranked,
    currentPlan,
    historyAudit,
    missingLifecycle: ranked.filter((document) => document.lifecycle.length === 0).length,
  };
}

function functionSignalSummaries(file) {
  const complexity = new Set((file.metrics.complexity?.items ?? []).map((item) => `${item.functionIdentity}:${item.metric}`));
  const cognitive = new Set((file.metrics.cognitiveComplexity?.items ?? []).map((item) => item.functionIdentity));
  const local = new Set((file.findings.localMaintainability?.items ?? []).map((item) => item.functionIdentity).filter(Boolean));
  return (file.metrics.controlFlowStructure?.items ?? []).map((profile) => {
    const identity = profile.functionIdentity;
    const signals = [
      complexity.has(`${identity}:complexity`) ? "complexity" : null,
      complexity.has(`${identity}:functionLength`) ? "functionLength" : null,
      cognitive.has(identity) ? "cognitiveComplexity" : null,
      profile.decisionPoints > 0 ? "controlFlowStructure" : null,
      local.has(identity) ? "localMaintainability" : null,
    ].filter(Boolean);
    return {
      functionIdentity: identity,
      functionStartLine: profile.functionStartLine,
      functionEndLine: profile.functionEndLine,
      signals,
      decisionPoints: profile.decisionPoints,
      maxDecisionNestingDepth: profile.maxDecisionNestingDepth,
    };
  }).filter((summary) => summary.signals.length > 1);
}

function buildFunctionTriage(files, audits) {
  const byFile = new Map();
  for (const file of files) {
    for (const { finding, metric } of [
      ...(file.findings.functionLength?.items ?? []).map((item) => ({ finding: item, metric: "functionLength" })),
      ...(file.findings.complexity?.items ?? []).map((item) => ({ finding: item, metric: "complexity" })),
    ].filter(({ finding }) => finding.type === "failures" || finding.type === "reviews")) {
      const candidate = byFile.get(file.path) ?? {
        path: file.path,
        level: "REVIEW",
        quantitative: { level: "REVIEW", details: [] },
        decision: triageDecision(file),
        evidence: "PRESENT",
        provenance: file.provenance.complexity ?? "NOT_MEASURED",
        detail: new Set(),
      };
      if (finding.type === "failures") {
        candidate.level = "FAIL";
        candidate.quantitative.level = "FAIL";
      }
      candidate.quantitative.details.push(`${metric}=${finding.value ?? "NOT_MEASURED"}${finding.line ? ` (L${finding.line})` : ""}`);
      candidate.detail.add(finding.type);
      byFile.set(file.path, candidate);
    }
  }
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const candidates = [...byFile.values()].map((candidate) => ({
    ...candidate,
    detail: [...candidate.detail].sort().join(", "),
    functionSignals: functionSignalSummaries(fileByPath.get(candidate.path)),
  })).sort(sortTriageCandidates).slice(0, 10);
  const staleEvidenceCount = files.reduce((count, file) => count + [...(file.findings.complexity?.items ?? [])].filter((finding) => finding.type === "stale").length, 0);
  return {
    state: candidates.length > 0 ? "PRESENT" : staleEvidenceCount > 0 ? "STALE_EVIDENCE" : audits.complexity.state === "NOT_MEASURED" ? "NOT_MEASURED" : "NONE",
    candidates,
    staleEvidenceCount,
  };
}

export function buildQualityFileIndexTriage({ files = [], audits = {}, source = {}, candidateGroups = [] } = {}) {
  const code = buildCodeTriage(files);
  const tests = buildTestTriage(files);
  const decision = buildQualityIndexDecisionTriage({ files, audits, source, candidateGroups });
  return {
    code: { state: code.length > 0 ? "PRESENT" : files.length > 0 ? "NONE" : "NOT_MEASURED", candidates: code },
    tests: { state: tests.length > 0 ? "PRESENT" : files.length > 0 ? "NONE" : "NOT_MEASURED", candidates: tests },
    documentation: buildDocumentationTriage(audits, source),
    functions: buildFunctionTriage(files, audits),
    decision,
    provenance: source.provenance ?? "NOT_MEASURED",
    detail: "Projection dérivée exclusivement des mesures, findings et provenances déjà présents dans quality-file-index.",
  };
}
