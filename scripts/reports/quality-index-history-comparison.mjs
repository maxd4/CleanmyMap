const HISTORY_COMPARISON_SCHEMA_VERSION = 1;

const IMMUTABLE_PROVENANCE = "COMMITTED_SNAPSHOT";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort((left, right) => left.localeCompare(right)).map((key) => [key, stableValue(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function identityKey(path, functionIdentity) {
  return `${normalizePath(path)}\u0000${functionIdentity}`;
}

function runMetadata(run, side) {
  const manifest = run?.manifests?.maintainability ?? null;
  const report = run?.reports?.maintainability ?? null;
  return {
    side,
    auditedHead: run?.auditedSha ?? null,
    runId: run?.runId ?? null,
    provenance: manifest?.readProvenance ?? report?.readProvenance ?? "NOT_MEASURED",
    status: manifest?.status ?? report?.status ?? "NOT_MEASURED",
  };
}

function unavailableComparison({ currentRun, previousRun, state, reason, detail = null, previousRunError = null }) {
  return {
    schemaVersion: HISTORY_COMPARISON_SCHEMA_VERSION,
    kind: "quality-history-comparison",
    state,
    comparability: "NOT_COMPARABLE",
    reason,
    detail,
    current: runMetadata(currentRun, "CURRENT"),
    previous: runMetadata(previousRun, "PREVIOUS"),
    summary: {
      filesCompared: 0,
      filesChanged: 0,
      filesUnchanged: 0,
      filesNotComparable: 0,
      functionsCompared: 0,
      functionsChanged: 0,
      functionsUnchanged: 0,
      functionsNotComparable: 0,
      metricChanges: { increased: 0, decreased: 0, unchanged: 0, notMeasured: 0 },
    },
    files: [],
    functions: [],
    unmatchedFunctions: [],
    diagnostics: previousRunError ? [previousRunError.message ?? String(previousRunError)] : [],
  };
}

function reportContract(run, side) {
  const report = run?.reports?.maintainability;
  if (!report || report.error) return { reason: `${side}_MAINTAINABILITY_REPORT_ABSENT` };
  const requiredArrays = ["metrics", "findings", "maintainabilityStatuses"];
  if (requiredArrays.some((field) => !Array.isArray(report[field]))) return { reason: `${side}_MAINTAINABILITY_SCHEMA_INCOMPLETE` };
  if (!Array.isArray(run?.reports?.complexity?.metrics)) return { reason: `${side}_COMPLEXITY_METRICS_ABSENT` };
  if (report.measurementStatus === "STALE_EVIDENCE") return { reason: `${side}_STALE_EVIDENCE`, detail: report.measurementStatus };
  if (report.measurementStatus !== "MEASURED_NOT_RATCHETED") return { reason: `${side}_MAINTAINABILITY_NOT_MEASURED`, detail: report.measurementStatus ?? "NOT_MEASURED" };
  return { report };
}

function comparableContract(currentRun, previousRun) {
  const current = reportContract(currentRun, "CURRENT");
  const previous = reportContract(previousRun, "PREVIOUS");
  if (current.reason) return current;
  if (previous.reason) return previous;

  const currentReport = current.report;
  const previousReport = previous.report;
  if (currentRun.auditedSha === previousRun.auditedSha) return { reason: "SAME_SHA" };
  if (currentReport.schemaVersion !== previousReport.schemaVersion) return { reason: "SCHEMA_NOT_COMPARABLE" };
  if (stableJson(currentReport.engine) !== stableJson(previousReport.engine)) return { reason: "ENGINE_VERSION_NOT_COMPARABLE" };
  if (stableJson(currentReport.rules) !== stableJson(previousReport.rules) || stableJson(currentReport.policy) !== stableJson(previousReport.policy)) {
    return { reason: "POLICY_DEFINITIONS_NOT_COMPARABLE" };
  }
  if (stableJson(currentReport.sourceRoots) !== stableJson(previousReport.sourceRoots)) return { reason: "COVERAGE_ROOTS_NOT_COMPARABLE" };

  const provenance = [runMetadata(currentRun, "CURRENT"), runMetadata(previousRun, "PREVIOUS")];
  if (provenance.some((entry) => entry.provenance !== IMMUTABLE_PROVENANCE)) return { reason: "WORKTREE_LIVE_NOT_IMMUTABLE_PROOF" };
  return { currentReport, previousReport };
}

function measuredStatuses(report) {
  return new Map(report.maintainabilityStatuses.map((entry) => [normalizePath(entry.path), entry]));
}

function indexMetrics(run) {
  const maintainability = run.reports.maintainability;
  const complexity = run.reports.complexity;
  const metrics = new Map();
  const add = (metric) => {
    if (!metric?.functionIdentity || !metric.path || !Number.isFinite(metric.value)) return;
    const key = identityKey(metric.path, metric.functionIdentity);
    const entry = metrics.get(key) ?? { path: normalizePath(metric.path), functionIdentity: metric.functionIdentity, function: metric.function ?? null, location: null, complexity: null, functionLength: null, cognitiveComplexity: null };
    entry.location ??= {
      startLine: metric.functionStartLine ?? metric.line ?? null,
      endLine: metric.functionEndLine ?? metric.endLine ?? null,
    };
    const metricName = metric.metric === "complexity" ? "complexity" : metric.metric === "functionLength" ? "functionLength" : metric.metric === "cognitiveComplexity" ? "cognitiveComplexity" : null;
    if (metricName) entry[metricName] = metric.value;
    metrics.set(key, entry);
  };
  for (const metric of complexity.metrics) add(metric);
  for (const metric of maintainability.metrics) add(metric);

  const localSignals = new Map();
  for (const finding of maintainability.findings) {
    const file = normalizePath(finding.file ?? finding.path);
    if (!file) continue;
    const key = finding.functionIdentity ? identityKey(file, finding.functionIdentity) : `file\u0000${file}`;
    const signals = localSignals.get(key) ?? new Set();
    if (finding.ruleId) signals.add(finding.ruleId);
    localSignals.set(key, signals);
  }

  const controlFlow = new Map();
  for (const profile of maintainability.controlFlowProfiles ?? []) {
    if (!profile?.functionIdentity || !profile.path || profile.status === "NOT_MEASURED") continue;
    controlFlow.set(identityKey(profile.path, profile.functionIdentity), {
      decisionPoints: profile.decisionPoints,
      maxDecisionNestingDepth: profile.maxDecisionNestingDepth,
      nestedDecisionCount: profile.nestedDecisionCount,
      busiestSubtreeDecisionPoints: profile.busiestSubtree?.decisionPoints ?? null,
      subtreeDistribution: (profile.decisionSubtrees ?? []).map((subtree) => ({ index: subtree.index, kind: subtree.kind, decisionPoints: subtree.decisionPoints })),
      location: { startLine: profile.functionStartLine ?? profile.line ?? null, endLine: profile.functionEndLine ?? profile.endLine ?? null },
    });
  }
  return { metrics, localSignals, controlFlow, statuses: measuredStatuses(maintainability) };
}

function metricComparison(previous, current, name) {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return { state: "NOT_MEASURED", reason: "METRIC_MISSING_IN_ONE_RUN" };
  const delta = current - previous;
  return { state: "PRESENT", previous, current, delta, direction: delta > 0 ? "INCREASE" : delta < 0 ? "DECREASE" : "UNCHANGED", metric: name };
}

function signalComparison(previous = [], current = []) {
  const previousSet = new Set(previous);
  const currentSet = new Set(current);
  const sortValues = (left, right) => left.localeCompare(right);
  const added = [...currentSet].filter((value) => !previousSet.has(value)).sort(sortValues);
  const removed = [...previousSet].filter((value) => !currentSet.has(value)).sort(sortValues);
  return { state: "PRESENT", previous: [...previousSet].sort(sortValues), current: [...currentSet].sort(sortValues), added, removed };
}

function controlFlowComparison(previous, current) {
  if (!previous || !current) return { state: "NOT_MEASURED", reason: "CONTROL_FLOW_PROFILE_MISSING_IN_ONE_RUN" };
  const metrics = Object.fromEntries([
    ["decisionPoints", metricComparison(previous.decisionPoints, current.decisionPoints, "decisionPoints")],
    ["maxDecisionNestingDepth", metricComparison(previous.maxDecisionNestingDepth, current.maxDecisionNestingDepth, "maxDecisionNestingDepth")],
    ["nestedDecisionCount", metricComparison(previous.nestedDecisionCount, current.nestedDecisionCount, "nestedDecisionCount")],
    ["busiestSubtreeDecisionPoints", metricComparison(previous.busiestSubtreeDecisionPoints, current.busiestSubtreeDecisionPoints, "busiestSubtreeDecisionPoints")],
  ]);
  const subtreeDistribution = stableJson(previous.subtreeDistribution) === stableJson(current.subtreeDistribution)
    ? { state: "PRESENT", direction: "UNCHANGED", previous: previous.subtreeDistribution, current: current.subtreeDistribution }
    : { state: "PRESENT", direction: "CHANGED", previous: previous.subtreeDistribution, current: current.subtreeDistribution };
  const changed = Object.values(metrics).some((metric) => metric.direction && metric.direction !== "UNCHANGED") || subtreeDistribution.direction === "CHANGED";
  return { state: "PRESENT", changed, metrics, subtreeDistribution, previousLocation: previous.location, currentLocation: current.location };
}

function functionComparison(previous, current, previousSignals, currentSignals, previousControlFlow, currentControlFlow) {
  const metrics = Object.fromEntries(["complexity", "cognitiveComplexity", "functionLength"].map((name) => [name, metricComparison(previous[name], current[name], name)]));
  const localMaintainability = signalComparison([...previousSignals ?? []], [...currentSignals ?? []]);
  const controlFlow = controlFlowComparison(previousControlFlow, currentControlFlow);
  const changes = [
    ...Object.values(metrics).filter((metric) => metric.direction && metric.direction !== "UNCHANGED").map((metric) => ({ metric: metric.metric, direction: metric.direction, delta: metric.delta })),
    ...(localMaintainability.added.length > 0 || localMaintainability.removed.length > 0 ? [{ metric: "localMaintainability", direction: "CHANGED", added: localMaintainability.added, removed: localMaintainability.removed }] : []),
    ...(controlFlow.changed ? [{ metric: "controlFlowStructure", direction: "CHANGED" }] : []),
  ];
  return {
    path: current.path,
    functionIdentity: current.functionIdentity,
    function: current.function ?? previous.function ?? null,
    previousLocation: previous.location,
    currentLocation: current.location,
    comparability: Object.values(metrics).every((metric) => metric.state === "PRESENT") && controlFlow.state === "PRESENT" ? "FULL" : "PARTIAL",
    state: changes.length > 0 ? "CHANGED" : "UNCHANGED",
    metrics,
    localMaintainability,
    controlFlow,
    changes,
  };
}

function fileSignals(index, path) {
  const values = new Set();
  for (const [key, signals] of index.localSignals) if (key === `file\u0000${path}` || key.startsWith(`${path}\u0000`)) for (const signal of signals) values.add(signal);
  return [...values].sort((left, right) => left.localeCompare(right));
}

function compareComparableRuns(currentRun, previousRun, currentReport, previousReport) {
  const currentIndex = indexMetrics(currentRun);
  const previousIndex = indexMetrics(previousRun);
  const keys = [...new Set([...currentIndex.metrics.keys(), ...previousIndex.metrics.keys()])].sort((left, right) => left.localeCompare(right));
  const functions = [];
  const unmatchedFunctions = [];
  for (const key of keys) {
    const current = currentIndex.metrics.get(key);
    const previous = previousIndex.metrics.get(key);
    if (!current || !previous) {
      const side = current ? "CURRENT_ONLY" : "PREVIOUS_ONLY";
      unmatchedFunctions.push({ path: (current ?? previous).path, functionIdentity: (current ?? previous).functionIdentity, side, state: "NOT_COMPARABLE", reason: "FUNCTION_IDENTITY_NOT_FOUND" });
      continue;
    }
    const currentStatus = currentIndex.statuses.get(current.path);
    const previousStatus = previousIndex.statuses.get(previous.path);
    if (currentStatus?.status !== "PRESENT" || previousStatus?.status !== "PRESENT") {
      unmatchedFunctions.push({ path: current.path, functionIdentity: current.functionIdentity, side: "BOTH", state: "NOT_MEASURED", reason: "FILE_MEASUREMENT_NOT_PRESENT" });
      continue;
    }
    functions.push(functionComparison(previous, current, previousIndex.localSignals.get(key), currentIndex.localSignals.get(key), previousIndex.controlFlow.get(key), currentIndex.controlFlow.get(key)));
  }

  const currentPaths = new Set([...currentIndex.metrics.values()].map((entry) => entry.path));
  const previousPaths = new Set([...previousIndex.metrics.values()].map((entry) => entry.path));
  const filePaths = [...new Set([...currentPaths, ...previousPaths])].sort((left, right) => left.localeCompare(right));
  const files = filePaths.map((filePath) => {
    const matched = functions.filter((entry) => entry.path === filePath);
    const currentFile = currentPaths.has(filePath);
    const previousFile = previousPaths.has(filePath);
    const localMaintainability = signalComparison(fileSignals(previousIndex, filePath), fileSignals(currentIndex, filePath));
    if (!currentFile || !previousFile) return { path: filePath, comparability: "NOT_COMPARABLE", state: "NOT_COMPARABLE", reason: "FILE_NOT_FOUND_IN_ONE_RUN", localMaintainability, functions: [], changes: [] };
    const changes = matched.flatMap((entry) => entry.changes.map((change) => ({ functionIdentity: entry.functionIdentity, ...change })));
    if (localMaintainability.added.length > 0 || localMaintainability.removed.length > 0) changes.push({ metric: "localMaintainability", direction: "CHANGED" });
    return { path: filePath, comparability: matched.length > 0 && matched.every((entry) => entry.comparability === "FULL") ? "FULL" : "PARTIAL", state: changes.length > 0 ? "CHANGED" : "UNCHANGED", localMaintainability, functions: matched.map((entry) => entry.functionIdentity), changes };
  });
  const metricChanges = { increased: 0, decreased: 0, unchanged: 0, notMeasured: 0 };
  for (const entry of functions) for (const metric of Object.values(entry.metrics)) {
    if (metric.direction === "INCREASE") metricChanges.increased += 1;
    else if (metric.direction === "DECREASE") metricChanges.decreased += 1;
    else if (metric.direction === "UNCHANGED") metricChanges.unchanged += 1;
    else metricChanges.notMeasured += 1;
  }
  const summary = {
    filesCompared: files.filter((file) => file.comparability !== "NOT_COMPARABLE").length,
    filesChanged: files.filter((file) => file.state === "CHANGED").length,
    filesUnchanged: files.filter((file) => file.state === "UNCHANGED").length,
    filesNotComparable: files.filter((file) => file.comparability === "NOT_COMPARABLE").length,
    functionsCompared: functions.length,
    functionsChanged: functions.filter((entry) => entry.state === "CHANGED").length,
    functionsUnchanged: functions.filter((entry) => entry.state === "UNCHANGED").length,
    functionsNotComparable: unmatchedFunctions.length,
    metricChanges,
  };
  const comparability = functions.length === 0 ? "NOT_COMPARABLE" : unmatchedFunctions.length > 0 || functions.some((entry) => entry.comparability !== "FULL") ? "PARTIAL" : "FULL";
  const state = functions.length === 0 ? "NOT_COMPARABLE" : "PRESENT";
  return {
    schemaVersion: HISTORY_COMPARISON_SCHEMA_VERSION,
    kind: "quality-history-comparison",
    state,
    comparability,
    reason: state === "PRESENT" ? null : "NO_EXACT_FUNCTION_IDENTITY_MATCH",
    detail: "Comparaison uniquement sur les identités path/functionIdentity présentes dans les deux rapports.",
    current: runMetadata(currentRun, "CURRENT"),
    previous: runMetadata(previousRun, "PREVIOUS"),
    summary,
    files,
    functions,
    unmatchedFunctions,
    diagnostics: [],
    contract: {
      schemaVersion: currentReport.schemaVersion,
      engine: stableValue(currentReport.engine),
      sourceRoots: stableValue(currentReport.sourceRoots),
      immutableProvenanceRequired: IMMUTABLE_PROVENANCE,
    },
  };
}

export function buildQualityAuditHistoryComparison({ currentRun, previousRun = null, previousRunError = null, requested = false } = {}) {
  if (!requested) return unavailableComparison({ currentRun, previousRun, state: "NOT_MEASURED", reason: "HISTORICAL_RUN_NOT_REQUESTED" });
  if (previousRunError) return unavailableComparison({ currentRun, previousRun, state: "NOT_MEASURED", reason: "PREVIOUS_RUN_UNAVAILABLE", previousRunError });
  if (!previousRun) return unavailableComparison({ currentRun, previousRun, state: "NOT_MEASURED", reason: "PREVIOUS_RUN_NOT_PROVIDED" });
  const contract = comparableContract(currentRun, previousRun);
  if (contract.reason) return unavailableComparison({ currentRun, previousRun, state: contract.reason === "WORKTREE_LIVE_NOT_IMMUTABLE_PROOF" ? "NOT_COMPARABLE" : "NOT_MEASURED", reason: contract.reason, detail: contract.detail });
  return compareComparableRuns(currentRun, previousRun, contract.currentReport, contract.previousReport);
}
