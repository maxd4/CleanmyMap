import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { ActionWasteMeasurementMethod } from "@/lib/waste/measurement";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V2,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V3,
} from "@/lib/impact/impact-terrain-2026";
import type { ReportModel } from "@/lib/reports/report-model/types";

export type AiReportStatus = "OBSERVED" | "DERIVED" | "PROXY" | "UNKNOWN";

export type AiReportMetric = {
  id: string;
  value: number | null;
  unit: string;
  status: AiReportStatus;
  provenance: string[];
  coverage?: { known: number; total: number };
  versions?: string[];
  factors?: Record<string, number>;
  valueRange?: { min: number; max: number };
};

export type AiReportProjection = {
  context: {
    actionContexts: Array<{ value: "citizen" | "company" | "school"; count: number }>;
    plannedObjectives: Array<{
      value: "repérage" | "nettoyage" | "collecte_mégots" | "action_mixte" | "sensibilisation" | "autre";
      count: number;
    }>;
  };
  execution: {
    actionCount: number;
    completedActionCount: number;
    observedDateRange: { from: string; to: string } | null;
  };
  participation: AiReportMetric[];
  measurements: AiReportMetric[];
  analyses: AiReportMetric[];
  methodology: {
    proxyVersion: string;
    qualityRulesVersion: string;
    massConversionVersions: string[];
    wasteMeasurementMethods: Array<{ method: ActionWasteMeasurementMethod | "unknown"; count: number }>;
    proxyFactors: Record<string, number>;
    proxySources: Record<string, string>;
    formulaIds: string[];
  };
  sources: string[];
  limitations: string[];
};

const ACTION_CONTEXTS = ["citizen", "company", "school"] as const;
const PLANNED_OBJECTIVES = [
  "repérage",
  "nettoyage",
  "collecte_mégots",
  "action_mixte",
  "sensibilisation",
  "autre",
] as const;
const WASTE_MEASUREMENT_METHODS = [
  "balance_suspendue",
  "balance_au_sol",
  "estimation_visuelle",
  "autre",
  "inconnue",
] as const satisfies readonly ActionWasteMeasurementMethod[];
const MASS_CONVERSION_VERSIONS = [
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V2,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V3,
] as const;

function isFiniteValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function frequencySummary<T extends string>(values: unknown[], allowed: readonly T[]) {
  const counts = new Map<T, number>();
  for (const value of values) {
    if (typeof value === "string" && allowed.includes(value as T)) {
      const key = value as T;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

function coverage(known: number, total: number) {
  return { known: Math.max(0, known), total: Math.max(0, total) };
}

function measurementMethodCounts(contracts: ActionDataContract[]) {
  const counts = new Map<ActionWasteMeasurementMethod | "unknown", number>();
  for (const contract of contracts) {
    if (contract.metadata.wasteKg === null || contract.metadata.wasteKg === undefined) continue;
    const method = contract.metadata.wasteMeasurementMethod;
    const safeMethod = method && WASTE_MEASUREMENT_METHODS.includes(method)
      ? method
      : "unknown";
    counts.set(safeMethod, (counts.get(safeMethod) ?? 0) + 1);
  }
  return [...counts.entries()].map(([method, count]) => ({ method, count }));
}

function wasteStatus(
  methods: ReturnType<typeof measurementMethodCounts>,
  knownCount: number,
): AiReportStatus {
  if (knownCount === 0) return "UNKNOWN";
  const knownMethods = methods.filter(({ method }) => method !== "unknown" && method !== "inconnue" && method !== "autre");
  if (knownMethods.length !== methods.length || methods.length === 0) return "UNKNOWN";
  if (methods.every(({ method }) => method === "balance_suspendue" || method === "balance_au_sol")) {
    return "OBSERVED";
  }
  return "DERIVED";
}

function safeVersions(values: unknown[]): string[] {
  return [...new Set(values.filter(
    (value): value is (typeof MASS_CONVERSION_VERSIONS)[number] =>
      typeof value === "string" && MASS_CONVERSION_VERSIONS.includes(value as (typeof MASS_CONVERSION_VERSIONS)[number]),
  ))];
}

function version(value: string): string {
  return /^[\w.+:-]{1,120}$/.test(value) ? value : "unknown";
}

function buildParticipationMetrics(report: ReportModel, eventAvailability: "available" | "partial" | "unavailable", actionCount: number): AiReportMetric[] {
  const knownVolunteerActions = report.totals.volunteersKnownActions ?? 0;
  const knownAttendanceActions = report.totals.presentPeopleKnownActions ?? 0;
  const knownCollectorActions = report.totals.collectorsCountKnownActions ?? 0;
  return [
    {
      id: "participation.volunteers.count",
      value: knownVolunteerActions > 0 ? report.totals.volunteers : null,
      unit: "personne",
      status: knownVolunteerActions > 0 ? "OBSERVED" as const : "UNKNOWN" as const,
      provenance: knownVolunteerActions > 0 ? ["declared_action_volunteers"] : [],
      coverage: coverage(knownVolunteerActions, actionCount),
    },
    {
      id: "participation.attendance.count",
      value: knownAttendanceActions > 0 ? report.totals.presentPeopleCount ?? null : null,
      unit: "personne",
      status: knownAttendanceActions > 0 ? "OBSERVED" as const : "UNKNOWN" as const,
      provenance: knownAttendanceActions > 0 ? ["declared_participant_categories"] : [],
      coverage: coverage(knownAttendanceActions, actionCount),
    },
    {
      id: "participation.collectors.count",
      value: knownCollectorActions > 0 ? report.totals.collectorsCount ?? null : null,
      unit: "personne",
      status: knownCollectorActions > 0 ? "OBSERVED" as const : "UNKNOWN" as const,
      provenance: knownCollectorActions > 0 ? ["declared_collectors"] : [],
      coverage: coverage(knownCollectorActions, actionCount),
    },
    {
      id: "participation.events.count",
      value: eventAvailability === "unavailable" ? null : report.community.totalEvents,
      unit: "événement",
      status: eventAvailability === "unavailable" ? "UNKNOWN" as const : "OBSERVED" as const,
      provenance: eventAvailability === "unavailable" ? [] : ["canonical_community_events"],
    },
  ];
}

function buildMeasurementMetrics(params: {
  report: ReportModel;
  actionCount: number;
  knownWasteActions: number;
  knownButtsActions: number;
  wasteMethods: ReturnType<typeof measurementMethodCounts>;
  buttsVersions: string[];
}): AiReportMetric[] {
  const { report, actionCount, knownWasteActions, knownButtsActions, wasteMethods, buttsVersions } = params;
  const buttsMassProvenance = report.totals.buttsMassProvenance;
  return [
    {
      id: "waste.mass",
      value: knownWasteActions > 0 ? report.totals.kg : null,
      unit: "kg",
      status: wasteStatus(wasteMethods, knownWasteActions),
      provenance: wasteMethods.map(({ method }) => `waste_measurement_method:${method}`),
      coverage: coverage(knownWasteActions, actionCount),
    },
    {
      id: "cigarette_butts.count",
      value: knownButtsActions > 0 ? report.totals.butts : null,
      unit: "mégot",
      status: knownButtsActions === 0 ? "UNKNOWN" as const : (report.totals.buttsEstimated ?? 0) > 0 ? "DERIVED" as const : "OBSERVED" as const,
      provenance: knownButtsActions === 0
        ? []
        : [
            ...((report.totals.buttsCounted ?? 0) > 0 ? ["counted"] : []),
            ...((report.totals.buttsEstimated ?? 0) > 0 ? ["mass_or_volume_conversion"] : []),
          ],
      coverage: coverage(knownButtsActions, actionCount),
      versions: buttsVersions,
    },
    {
      id: "cigarette_butts.mass_kg",
      value: isFiniteValue(report.totals.buttsMassKg) ? report.totals.buttsMassKg : null,
      unit: "kg",
      status: buttsMassProvenance === "measured"
        ? "OBSERVED" as const
        : buttsMassProvenance === "estimated" || buttsMassProvenance === "mixed"
          ? "DERIVED" as const
          : "UNKNOWN" as const,
      provenance: buttsMassProvenance ? [`mass_provenance:${buttsMassProvenance}`] : [],
      coverage: coverage(report.totals.buttsMassKg === null ? 0 : knownButtsActions, actionCount),
      versions: buttsVersions,
    },
  ];
}

function buildAnalysisMetrics(report: ReportModel, knownWasteActions: number, knownButtsActions: number, actionCount: number): AiReportMetric[] {
  const streetCleaningSavings = report.climate.streetCleaningSavings;
  const co2Known = knownWasteActions > 0;
  const waterKnown = knownButtsActions > 0;
  return [
    {
      id: "impact.co2_avoided",
      value: co2Known ? report.climate.co2AvoidedKg : null,
      unit: "kgCO2e",
      status: co2Known ? "PROXY" : "UNKNOWN",
      provenance: co2Known ? ["impact_proxy_config"] : [],
      versions: co2Known ? [version(IMPACT_PROXY_CONFIG.effectiveVersion)] : [],
      factors: co2Known ? { kgCO2ePerWasteKg: IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg } : undefined,
    },
    {
      id: "impact.water_protected",
      value: waterKnown ? report.climate.waterProtectedLiters : null,
      unit: "L",
      status: waterKnown ? "PROXY" : "UNKNOWN",
      provenance: waterKnown ? ["impact_proxy_config"] : [],
      versions: waterKnown ? [version(IMPACT_PROXY_CONFIG.effectiveVersion)] : [],
      factors: waterKnown ? { litersPerCigaretteButt: IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt } : undefined,
    },
    {
      id: "impact.street_cleaning_savings",
      value: null,
      unit: "EUR",
      status: streetCleaningSavings && knownWasteActions > 0 ? "PROXY" : "UNKNOWN",
      provenance: streetCleaningSavings && knownWasteActions > 0 ? ["impact_proxy_config"] : [],
      versions: streetCleaningSavings && knownWasteActions > 0 ? [version(IMPACT_PROXY_CONFIG.effectiveVersion)] : [],
      factors: streetCleaningSavings && knownWasteActions > 0 ? { eurosPerWasteKg: IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg } : undefined,
      valueRange: streetCleaningSavings && knownWasteActions > 0
        ? { min: Math.max(0, streetCleaningSavings.lowerBoundEuros), max: Math.max(0, streetCleaningSavings.upperBoundEuros) }
        : undefined,
    },
    {
      id: "quality.readiness",
      value: actionCount > 0 ? report.executive.readinessScore : null,
      unit: "%",
      status: actionCount > 0 ? "DERIVED" : "UNKNOWN",
      provenance: actionCount > 0 ? ["canonical_report_quality_rules"] : [],
      versions: actionCount > 0 ? [version(report.impactMethodology.qualityRulesVersion)] : [],
    },
  ];
}

function buildMethodology(report: ReportModel, wasteMethods: ReturnType<typeof measurementMethodCounts>, buttsVersions: string[]): AiReportProjection["methodology"] {
  return {
    proxyVersion: version(IMPACT_PROXY_CONFIG.effectiveVersion),
    qualityRulesVersion: version(report.impactMethodology.qualityRulesVersion),
    massConversionVersions: buttsVersions,
    wasteMeasurementMethods: wasteMethods,
    proxyFactors: { ...IMPACT_PROXY_CONFIG.factors },
    proxySources: { ...IMPACT_PROXY_CONFIG.sources },
    formulaIds: report.impactMethodology.formulas
      .map(({ id }) => id)
      .filter((id) => ["water_saved", "co2_avoided", "surface_cleaned", "pollution_score_mean"].includes(id)),
  };
}

export function buildAiReportProjection(params: {
  report: ReportModel;
  contracts: ActionDataContract[];
  eventAvailability: "available" | "partial" | "unavailable";
}): AiReportProjection {
  const { report, contracts, eventAvailability } = params;
  const actionCount = report.totals.actions;
  const knownWasteActions = report.totals.knownWasteActions ?? 0;
  const knownButtsActions = report.totals.buttsKnownActions ?? 0;
  const wasteMethods = measurementMethodCounts(contracts);
  const buttsVersions = safeVersions(report.totals.buttsMassConversionVersions ?? []);
  const dates = contracts.flatMap((contract) => {
    const date = safeDate(contract.dates.observedAt);
    return date ? [date] : [];
  }).sort();

  return {
    context: {
      actionContexts: frequencySummary(contracts.map(({ metadata }) => metadata.actionContext), ACTION_CONTEXTS),
      plannedObjectives: frequencySummary(
        contracts.map(({ metadata }) => metadata.preparationData?.plannedObjective),
        PLANNED_OBJECTIVES,
      ),
    },
    execution: {
      actionCount,
      completedActionCount: contracts.filter(({ metadata }) => metadata.actionPhase === "post_action_complete").length,
      observedDateRange: dates.length > 0 ? { from: dates[0]!, to: dates.at(-1)! } : null,
    },
    participation: buildParticipationMetrics(report, eventAvailability, actionCount),
    measurements: buildMeasurementMetrics({ report, actionCount, knownWasteActions, knownButtsActions, wasteMethods, buttsVersions }),
    analyses: buildAnalysisMetrics(report, knownWasteActions, knownButtsActions, actionCount),
    methodology: buildMethodology(report, wasteMethods, buttsVersions),
    sources: [
      "public.actions",
      ...(eventAvailability === "unavailable" ? [] : ["community.events"]),
    ],
    limitations: [
      "Les champs libres, identifiants directs, coordonnées et médias sont exclus de cette projection.",
      "Une couverture partielle est indiquée séparément du total disponible.",
      "Les résultats PROXY sont des estimations et ne constituent pas des mesures observées.",
      "Les calendriers prévisionnels du rapport ne décrivent pas des événements observés.",
    ],
  };
}
