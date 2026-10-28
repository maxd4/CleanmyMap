import { state } from "./quality-index-primitives.mjs";

const DEBT_CATEGORIES = Object.freeze(["topHeavy", "complexity", "maintainability", "typeSafety", "deadCode", "duplication", "cycles", "documentation"]);

export function complexityFindingCategory(finding) {
  return finding?.metric === "functionLength" ? "functionLength" : "complexity";
}

function categoryAvailability(reports) {
  return {
    topHeavy: reports["top-heavy"]?.error ? "NOT_MEASURED" : "PRESENT",
    complexity: reports.complexity?.error ? "NOT_MEASURED" : "PRESENT",
    maintainability: !reports.maintainability || reports.maintainability.error ? "NOT_MEASURED" : "PRESENT",
    typeSafety: !reports["type-safety"] || reports["type-safety"].error || reports["type-safety"].measurementStatus === "MEASUREMENT_FAILED" ? "NOT_MEASURED" : "PRESENT",
    hotspots: !reports.hotspots || reports.hotspots.error ? "NOT_MEASURED" : "PRESENT",
    testability: !reports.testability || reports.testability.error || reports.testability.measurementStatus === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
    coverage: !reports.coverage || reports.coverage.error || reports.coverage.measurementStatus === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
    deadCode: reports["dead-code"]?.error ? "NOT_MEASURED" : "PRESENT",
    duplication: reports.duplication?.error ? "NOT_MEASURED" : "PRESENT",
    cycles: reports.cycles?.status === "SKIPPED_BY_POLICY" ? "SKIPPED_BY_POLICY" : reports.cycles?.error ? "NOT_MEASURED" : "PRESENT",
    documentation: !reports.documentation || reports.documentation.status === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
  };
}

function typeSafetyContext(file) {
  const findings = [...file.typeSafety.findings.values()];
  const coverage = file.typeSafety.coverage;
  const measured = coverage?.state === "TYPED";
  return {
    measured,
    detail: coverage?.reason === "UNSUPPORTED_CONFIGURATION"
      ? "configuration TypeScript incompatible : UNSUPPORTED_CONFIGURATION"
      : coverage?.reason ?? "inventaire des fichiers mesurés absent du rapport type-safety",
    typeSafety: findings.filter((finding) => finding.family === "TYPE_SAFETY"),
    asyncSafety: findings.filter((finding) => finding.family === "ASYNC_SAFETY"),
  };
}

function buildHotspotMeasurement(file) {
  if (!file.hotspots.measurement) return null;
  return {
    ...file.hotspots.measurement,
    currentMetrics: {
      cyclomaticComplexity: file.complexity.metrics.filter((metric) => metric.metric === "complexity"),
      functionLength: file.complexity.metrics.filter((metric) => metric.metric === "functionLength"),
      cognitiveComplexity: file.maintainability.cognitiveMetrics,
      controlFlowStructure: file.maintainability.controlFlowProfiles,
    },
    debtAccumulation: {
      categories: DEBT_CATEGORIES.filter((category) => file[category]?.findings?.size > 0),
      note: "catégories avec findings attribués ; les mêmes causes restent reliées par leur relation canonique et ne sont pas fusionnées implicitement",
    },
  };
}

function findingState(availability, auditKey, findingItems, measured, detail) {
  if (findingItems.length > 0) return state("PRESENT", `${findingItems.length} finding(s)`, findingItems);
  if (availability[auditKey] === "SKIPPED_BY_POLICY") return state("SKIPPED_BY_POLICY", "contrôle suspendu par la politique du dépôt");
  if (availability[auditKey] === "NOT_MEASURED") return state("NOT_MEASURED", detail);
  if (measured) return state("NONE", "aucun finding attribué", []);
  return state("NOT_MEASURED", "le rapport ne fournit pas une couverture négative par fichier", []);
}

function typeSafetyState(family, findings, context) {
  if (!context.measured) return state("NOT_MEASURED", context.detail, findings);
  return state(findings.length > 0 ? "PRESENT" : "NONE", `${findings.length} finding(s) ${family}`, findings);
}

function buildMetrics(file, availability, architecture, typeSafety, hotspotMeasurement) {
  const cognitiveMetrics = file.maintainability.cognitiveMetrics;
  const controlFlowProfiles = file.maintainability.controlFlowProfiles;
  const coverage = file.coverage.measurement;
  return {
    topHeavy: file.topHeavy.measurements
      ? state("PRESENT", "mesure de taille disponible", [file.topHeavy.measurements])
      : availability.topHeavy === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport top-heavy en échec") : state("NOT_APPLICABLE", "fichier hors roots top-heavy"),
    complexity: file.complexity.metrics.length > 0
      ? state("PRESENT", `${file.complexity.metrics.length} fonction(s) mesurée(s)`, file.complexity.metrics)
      : availability.complexity === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport complexity en échec") : state("NOT_APPLICABLE", "aucune fonction mesurée dans ce rapport"),
    cognitiveComplexity: cognitiveMetrics.length > 0
      ? state("PRESENT", `${cognitiveMetrics.length} fonction(s) mesurée(s)`, cognitiveMetrics)
      : file.maintainability.measurementStatus?.status === "NOT_MEASURED"
        ? state("NOT_MEASURED", file.maintainability.measurementStatus.reason ?? "mesure maintainability non attribuable", [])
      : availability.maintainability === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport maintainability en échec") : state("NOT_APPLICABLE", "aucune fonction mesurée dans ce rapport"),
    controlFlowStructure: controlFlowProfiles.length > 0
      ? state("PRESENT", `${controlFlowProfiles.length} fonction(s) profilée(s)`, controlFlowProfiles)
      : file.maintainability.controlFlowStatus?.status === "NOT_MEASURED"
        ? state("NOT_MEASURED", file.maintainability.controlFlowStatus.reason ?? "profil AST de contrôle de flux non pris en charge", [])
      : availability.maintainability === "NOT_MEASURED" ? state("NOT_MEASURED", "profil AST de contrôle de flux indisponible avec le rapport maintainability") : state("NOT_APPLICABLE", "aucune fonction profilée dans ce rapport"),
    typeSafety: typeSafetyState("TYPE_SAFETY", typeSafety.typeSafety, typeSafety),
    asyncSafety: typeSafetyState("ASYNC_SAFETY", typeSafety.asyncSafety, typeSafety),
    hotspots: hotspotMeasurement
      ? state("PRESENT", "activité, dette structurelle et relations de maintenance mesurées", [hotspotMeasurement])
      : availability.hotspots === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport hotspots absent ou en échec") : state("NOT_APPLICABLE", "aucune observation hotspot pour ce fichier"),
    testability: availability.testability === "NOT_MEASURED"
      ? state("NOT_MEASURED", "preuve de testabilité absente, périmée ou non attribuable")
      : state("NOT_MEASURED", "aucune correspondance fichier inventée depuis une mesure par domaine"),
    coverage: coverage
      ? state(coverage.state === "MEASURED" ? (coverage.uncoveredBranches > 0 ? "PRESENT" : "NONE") : "NOT_MEASURED", coverage.state === "MEASURED" ? "mesure de couverture attribuée" : coverage.state, [coverage])
      : state(availability.coverage === "NOT_MEASURED" ? "NOT_MEASURED" : "OUT_OF_INSTRUMENTATION", availability.coverage === "NOT_MEASURED" ? "preuve de couverture absente ou non vérifiable" : "fichier absent des sources instrumentées", []),
    architecture: file.architecture
      ? { state: "PRESENT", detail: "graphe d'import architectural disponible", value: file.architecture.metrics }
      : state(architecture?.state === "NOT_MEASURED" ? "NOT_MEASURED" : "NOT_APPLICABLE", architecture?.detail ?? "fichier absent du graphe architectural"),
    documentation: file.documentation.measurements
      ? state("PRESENT", "mesures de maintenabilité documentaire disponibles", [file.documentation.measurements])
      : state(availability.documentation === "NOT_MEASURED" ? "NOT_MEASURED" : "NOT_APPLICABLE", availability.documentation === "NOT_MEASURED" ? "rapport documentaire absent du run" : "fichier hors projection documentaire"),
  };
}

function buildFindings(file, availability, typeSafety) {
  const complexityItems = [...file.complexity.findings.values()];
  const topHeavy = [...file.topHeavy.findings.values()];
  const maintainability = [...file.maintainability.findings.values()];
  const hotspot = [...file.hotspots.findings.values()];
  const complexityFindings = complexityItems.filter((item) => complexityFindingCategory(item) === "complexity");
  const functionLength = complexityItems.filter((item) => complexityFindingCategory(item) === "functionLength");
  return {
    topHeavy: findingState(availability, "topHeavy", topHeavy, Boolean(file.topHeavy.measurements), "rapport top-heavy en échec"),
    complexity: findingState(availability, "complexity", complexityFindings, file.complexity.metrics.some((metric) => metric.metric === "complexity"), "rapport complexity en échec"),
    functionLength: findingState(availability, "complexity", functionLength, file.complexity.metrics.some((metric) => metric.metric === "functionLength"), "rapport complexity en échec"),
    cognitiveComplexity: findingState(availability, "maintainability", maintainability.filter((finding) => finding.category === "cognitive-complexity"), file.maintainability.cognitiveMetrics.length > 0, "rapport maintainability en échec"),
    localMaintainability: findingState(availability, "maintainability", maintainability.filter((finding) => finding.category !== "cognitive-complexity"), file.maintainability.findings.size > 0, "rapport maintainability en échec"),
    typeSafety: typeSafetyState("TYPE_SAFETY", typeSafety.typeSafety, typeSafety),
    asyncSafety: typeSafetyState("ASYNC_SAFETY", typeSafety.asyncSafety, typeSafety),
    hotspots: findingState(availability, "hotspots", hotspot, Boolean(file.hotspots.measurement), "rapport hotspots absent ou sans fichier mesuré"),
    testability: findingState(availability, "testability", [...file.testability.findings.values()], Boolean(file.testability.measurement), "la source de testabilité ne fournit pas de correspondance fichier sans preuve"),
    coverage: findingState(availability, "coverage", [...file.coverage.findings.values()], Boolean(file.coverage.measurement), "rapport coverage absent ou sans preuve attribuable"),
    deadCode: findingState(availability, "deadCode", [...file.deadCode.findings.values()], false, "rapport dead-code en échec"),
    duplication: findingState(availability, "duplication", [...file.duplication.findings.values()], false, "rapport duplication en échec"),
    cycles: findingState(availability, "cycles", [...file.cycles.findings.values()], false, "rapport cycles en échec"),
    documentation: findingState(availability, "documentation", [...file.documentation.findings.values()], Boolean(file.documentation.measurements), "rapport documentaire absent du run"),
  };
}

function projectFile(file, reports, architecture, availability) {
  const typeSafety = typeSafetyContext(file);
  const hotspotMeasurement = buildHotspotMeasurement(file);
  return {
    path: file.path,
    auditCategories: [...file.auditCategories].sort((left, right) => left.localeCompare(right)),
    functionalDomains: [...file.functionalDomains].sort((left, right) => left.localeCompare(right)),
    metrics: buildMetrics(file, availability, architecture, typeSafety, hotspotMeasurement),
    findings: buildFindings(file, availability, typeSafety),
    architecture: file.architecture ?? {
      state: architecture?.state === "NOT_MEASURED" ? "NOT_MEASURED" : "NOT_APPLICABLE",
      detail: architecture?.detail ?? "fichier absent du graphe architectural",
    },
    exceptions: { topHeavy: file.topHeavy.exceptions, deadCode: file.deadCode.exceptions },
    provenance: {
      topHeavy: reports["top-heavy"]?.readProvenance ?? null,
      complexity: reports.complexity?.readProvenance ?? null,
      maintainability: reports.maintainability?.readProvenance ?? null,
      typeSafety: reports["type-safety"]?.readProvenance ?? null,
      deadCode: reports["dead-code"]?.readProvenance ?? null,
      duplication: reports.duplication?.readProvenance ?? null,
      cycles: reports.cycles?.readProvenance ?? null,
      hotspots: reports.hotspots?.readProvenance ?? null,
      testability: reports.testability?.readProvenance ?? null,
      coverage: reports.coverage?.readProvenance ?? null,
      documentation: reports.documentation?.provenance ?? null,
    },
  };
}

export function finalizeFiles(files, reports, architecture) {
  const availability = categoryAvailability(reports);
  return [...files.values()].map((file) => projectFile(file, reports, architecture, availability)).sort((left, right) => left.path.localeCompare(right.path));
}
