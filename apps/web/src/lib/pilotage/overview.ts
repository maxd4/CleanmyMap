import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTerritorialBenchmark } from "../analytics/territorial-benchmark";
import type {
  ActionDataContract,
  ActionEntityType,
} from "../actions/data-contract";
import {
  computePilotageComparison,
  type PilotageComparisonResult,
} from "./metrics";
import {
  buildOperationalPriorities,
  type ZoneComparisonRow,
} from "./prioritization";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MethodDefinition = {
  id: string;
  kpi: string;
  formula: string;
  source: string;
  recalc: string;
  limits: string;
};

export type DecisionSummaryKpi = {
  id: "impact" | "mobilization" | "quality";
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute: string;
  deltaPercent: string;
  interpretation: "positive" | "negative" | "neutral";
};

export type DecisionSummary = {
  kpis: [DecisionSummaryKpi, DecisionSummaryKpi, DecisionSummaryKpi];
  alert: {
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    detail: string;
  };
  recommendedAction: {
    href: string;
    label: string;
    reason: string;
  };
};

export type PilotageOverview = {
  generatedAt: string;
  periodDays: number;
  comparison: PilotageComparisonResult;
  comparisonsByWindow: Record<"30" | "90" | "365", PilotageComparisonResult>;
  priorities: ReturnType<typeof buildOperationalPriorities>;
  methods: MethodDefinition[];
  zones: ZoneComparisonRow[];
  summary: DecisionSummary;
};

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${round1(value).toFixed(1)}`;
}

function parseDateMs(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function areaFromLabel(label: string): string {
  const matched = label
    .toLowerCase()
    .match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

function safePercentDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildZones(
  contracts: ActionDataContract[],
  periodDays: number,
  now: Date,
): ZoneComparisonRow[] {
  const nowMs = now.getTime();
  const currentFloorMs = nowMs - periodDays * DAY_MS;
  const previousFloorMs = currentFloorMs - periodDays * DAY_MS;

  const currentByArea = new Map<
    string,
    {
      actions: number;
      kg: number;
      geolocated: number;
      pendingAgesDays: number[];
    }
  >();
  const previousByArea = new Map<
    string,
    {
      actions: number;
      kg: number;
      geolocated: number;
      pendingAgesDays: number[];
    }
  >();

  for (const contract of contracts) {
    const observedMs = parseDateMs(contract.dates.observedAt);
    if (observedMs === null) {
      continue;
    }
    const area = areaFromLabel(contract.location.label);
    const isGeolocated =
      contract.location.latitude !== null &&
      contract.location.longitude !== null;
    const createdMs = parseDateMs(
      contract.dates.createdAt ?? contract.dates.importedAt,
    );
    const pendingAgeDays =
      contract.status === "pending" && createdMs !== null
        ? Math.max(0, (nowMs - createdMs) / DAY_MS)
        : null;

    if (observedMs >= currentFloorMs && observedMs <= nowMs) {
      const row = currentByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      if (contract.status === "approved") {
        row.actions += 1;
        row.kg += Number(contract.metadata.wasteKg || 0);
        row.geolocated += isGeolocated ? 1 : 0;
      }
      if (pendingAgeDays !== null) {
        row.pendingAgesDays.push(pendingAgeDays);
      }
      currentByArea.set(area, row);
      continue;
    }

    if (observedMs >= previousFloorMs && observedMs < currentFloorMs) {
      const row = previousByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      if (contract.status === "approved") {
        row.actions += 1;
        row.kg += Number(contract.metadata.wasteKg || 0);
        row.geolocated += isGeolocated ? 1 : 0;
      }
      if (pendingAgeDays !== null) {
        row.pendingAgesDays.push(pendingAgeDays);
      }
      previousByArea.set(area, row);
    }
  }

  const benchmark = buildTerritorialBenchmark(
    contracts
      .filter((contract) => contract.status === "approved")
      .map((contract) => ({
        locationLabel: contract.location.label,
        wasteKg: contract.metadata.wasteKg,
        volunteersCount: contract.metadata.volunteersCount,
      })),
  );
  const benchmarkByArea = new Map(benchmark.map((row) => [row.area, row]));

  const allAreas = new Set<string>([
    ...currentByArea.keys(),
    ...previousByArea.keys(),
  ]);

  return [...allAreas]
    .map((area) => {
      const current = currentByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      const previous = previousByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      const deltaActionsAbsolute = round1(current.actions - previous.actions);
      const deltaKgAbsolute = round1(current.kg - previous.kg);
      const deltaActionsPercent = round1(
        safePercentDelta(current.actions, previous.actions),
      );
      const deltaKgPercent = round1(safePercentDelta(current.kg, previous.kg));
      const currentCoverageRate =
        current.actions > 0
          ? round1((current.geolocated / current.actions) * 100)
          : 0;
      const previousCoverageRate =
        previous.actions > 0
          ? round1((previous.geolocated / previous.actions) * 100)
          : 0;
      const deltaCoverageRateAbsolute = round1(
        currentCoverageRate - previousCoverageRate,
      );
      const deltaCoverageRatePercent = round1(
        safePercentDelta(currentCoverageRate, previousCoverageRate),
      );
      const currentModerationDelayDays =
        current.pendingAgesDays.length > 0
          ? round1(
              current.pendingAgesDays.reduce((acc, value) => acc + value, 0) /
                current.pendingAgesDays.length,
            )
          : 0;
      const previousModerationDelayDays =
        previous.pendingAgesDays.length > 0
          ? round1(
              previous.pendingAgesDays.reduce((acc, value) => acc + value, 0) /
                previous.pendingAgesDays.length,
            )
          : 0;
      const deltaModerationDelayDaysAbsolute = round1(
        currentModerationDelayDays - previousModerationDelayDays,
      );
      const deltaModerationDelayDaysPercent = round1(
        safePercentDelta(
          currentModerationDelayDays,
          previousModerationDelayDays,
        ),
      );
      const benchmarkRow = benchmarkByArea.get(area);
      const normalizedScore = benchmarkRow?.normalizedScore ?? 0;

      const urgency: ZoneComparisonRow["urgency"] =
        normalizedScore >= 70 || deltaKgPercent >= 30
          ? "critique"
          : normalizedScore >= 50 || deltaKgPercent >= 15
            ? "elevee"
            : "moderee";

      const justification =
        urgency === "critique"
          ? "Pression territoriale forte avec progression d'impact sur la periode courante."
          : urgency === "elevee"
            ? "Zone a surveiller: hausse d'activite et score territorial au-dessus de la moyenne."
            : "Zone stable, suivi de fond recommande.";

      const recommendedAction =
        urgency === "critique"
          ? "Declencher une campagne ciblee sous 7 jours avec renfort moderation/geotrace."
          : urgency === "elevee"
            ? "Planifier une intervention ciblee et renforcer la preuve geolocalisee."
            : "Maintenir la surveillance mensuelle et corriger les signaux de qualite faibles.";

      return {
        area,
        currentActions: current.actions,
        previousActions: previous.actions,
        deltaActionsAbsolute,
        currentKg: round1(current.kg),
        previousKg: round1(previous.kg),
        deltaKgAbsolute,
        deltaActionsPercent,
        deltaKgPercent,
        currentCoverageRate,
        previousCoverageRate,
        deltaCoverageRateAbsolute,
        deltaCoverageRatePercent,
        currentModerationDelayDays,
        previousModerationDelayDays,
        deltaModerationDelayDaysAbsolute,
        deltaModerationDelayDaysPercent,
        normalizedScore,
        urgency,
        justification,
        recommendedAction,
      };
    })
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 12);
}

function buildMethods(): MethodDefinition[] {
  return [
    {
      id: "impact-volume",
      kpi: "Impact terrain (kg)",
      formula: "Somme des wasteKg sur actions approuvees de la fenetre.",
      source: "Unified actions (actions + spots normalises).",
      recalc: "A chaque chargement de page / API.",
      limits: "Depend de la qualite de saisie sur le poids collecte.",
    },
    {
      id: "mobilization",
      kpi: "Mobilisation",
      formula: "Somme des volunteersCount sur actions approuvees.",
      source: "Champs volunteersCount des declarations valides.",
      recalc: "A chaque chargement de page / API.",
      limits: "Mesure declarative, sensible aux oublis de saisie.",
    },
    {
      id: "quality-score",
      kpi: "Qualite data",
      formula:
        "Moyenne des scores /100 (completude, coherence, geoloc, trace, fraicheur).",
      source: "Moteur evaluateActionQuality centralise.",
      recalc: "A chaque chargement de page / API.",
      limits: "Score d'aide a la decision, pas un audit exhaustif.",
    },
    {
      id: "coverage",
      kpi: "Geo-couverture",
      formula: "(actions geolocalisees valides / actions approuvees) x 100.",
      source: "Latitude/longitude dans la source unifiee.",
      recalc: "A chaque chargement de page / API.",
      limits:
        "Coordonnees valides sans trace detaillee peuvent surestimer la couverture.",
    },
    {
      id: "moderation-delay",
      kpi: "Delai moderation",
      formula: "Mediane age (jours) des actions pending.",
      source: "createdAt/importedAt des enregistrements pending.",
      recalc: "A chaque chargement de page / API.",
      limits: "Sensibles aux reprises batch et imports historiques.",
    },
  ];
}

function pickDecisionRecommendation(comparison: PilotageComparisonResult): {
  href: string;
  label: string;
  reason: string;
} {
  const qualityRisk =
    comparison.metrics.qualityScore.interpretation === "negative"
      ? Math.abs(comparison.metrics.qualityScore.deltaPercent)
      : 0;
  const coverageRisk =
    comparison.metrics.coverageRate.interpretation === "negative"
      ? Math.abs(comparison.metrics.coverageRate.deltaPercent)
      : 0;
  const moderationRisk =
    comparison.metrics.moderationDelayDays.interpretation === "negative"
      ? Math.abs(comparison.metrics.moderationDelayDays.deltaPercent)
      : 0;

  const ranked = [
    {
      key: "moderation" as const,
      risk: moderationRisk,
      href: "/admin",
      label: "Traiter backlog moderation",
      reason: `Delai moderation en degradation (${comparison.metrics.moderationDelayDays.deltaAbsolute >= 0 ? "+" : ""}${comparison.metrics.moderationDelayDays.deltaAbsolute.toFixed(1)} j, ${comparison.current.moderationDelayDays.toFixed(1)} j actuels).`,
    },
    {
      key: "quality" as const,
      risk: qualityRisk,
      href: "/actions/history",
      label: "Renforcer geo-tracabilite",
      reason: `Qualite data en baisse (${comparison.metrics.qualityScore.deltaAbsolute.toFixed(1)} pt, score actuel ${comparison.current.qualityScore.toFixed(1)}/100).`,
    },
    {
      key: "coverage" as const,
      risk: coverageRisk,
      href: "/actions/new",
      label: "Renforcer geo-couverture",
      reason: `Couverture geoloc en degradation (${comparison.metrics.coverageRate.deltaAbsolute.toFixed(1)} pt, couverture actuelle ${comparison.current.coverageRate.toFixed(1)}%).`,
    },
  ].sort((a, b) => b.risk - a.risk);

  const top = ranked[0];
  if (!top || top.risk <= 0) {
    return {
      href: "/dashboard",
      label: "Maintenir le pilotage courant",
      reason:
        "Aucune degradation majeure detectee sur qualite, couverture ou moderation.",
    };
  }

  return {
    href: top.href,
    label: top.label,
    reason: top.reason,
  };
}

function buildSummary(
  comparison: PilotageComparisonResult,
  priorities: ReturnType<typeof buildOperationalPriorities>,
): DecisionSummary {
  const topPriority = priorities[0];
  const recommendedAction = pickDecisionRecommendation(comparison);

  return {
    kpis: [
      {
        id: "impact",
        label: "Impact terrain",
        value: `${comparison.current.impactVolumeKg.toFixed(1)} kg`,
        previousValue: `${comparison.previous.impactVolumeKg.toFixed(1)} kg`,
        deltaAbsolute: `${formatSigned(comparison.metrics.impactVolumeKg.deltaAbsolute)} kg`,
        deltaPercent: `${formatSigned(comparison.metrics.impactVolumeKg.deltaPercent)}%`,
        interpretation: comparison.metrics.impactVolumeKg.interpretation,
      },
      {
        id: "mobilization",
        label: "Mobilisation",
        value: `${comparison.current.mobilizationCount}`,
        previousValue: `${comparison.previous.mobilizationCount}`,
        deltaAbsolute: formatSigned(
          comparison.metrics.mobilizationCount.deltaAbsolute,
        ),
        deltaPercent: `${formatSigned(comparison.metrics.mobilizationCount.deltaPercent)}%`,
        interpretation: comparison.metrics.mobilizationCount.interpretation,
      },
      {
        id: "quality",
        label: "Qualite data",
        value: `${comparison.current.qualityScore.toFixed(1)}/100`,
        previousValue: `${comparison.previous.qualityScore.toFixed(1)}/100`,
        deltaAbsolute: formatSigned(
          comparison.metrics.qualityScore.deltaAbsolute,
        ),
        deltaPercent: `${formatSigned(comparison.metrics.qualityScore.deltaPercent)}%`,
        interpretation: comparison.metrics.qualityScore.interpretation,
      },
    ],
    alert: {
      severity: topPriority?.severity ?? "low",
      title: topPriority?.title ?? "Aucune alerte prioritaire",
      detail:
        topPriority?.reason ??
        "Le pilotage ne detecte pas d'urgence immediate sur la fenetre courante.",
    },
    recommendedAction,
  };
}

export function buildPilotageOverviewFromContracts(params: {
  contracts: ActionDataContract[];
  periodDays: number;
  now?: Date;
}): PilotageOverview {
  const now = params.now ?? new Date();
  const comparison = computePilotageComparison(
    params.contracts,
    params.periodDays,
    now,
  );
  const comparisonsByWindow = {
    "30": computePilotageComparison(params.contracts, 30, now),
    "90": computePilotageComparison(params.contracts, 90, now),
    "365": computePilotageComparison(params.contracts, 365, now),
  } as const;
  const zones = buildZones(params.contracts, params.periodDays, now);
  const priorities = buildOperationalPriorities({ comparison, zones });

  return {
    generatedAt: now.toISOString(),
    periodDays: params.periodDays,
    comparison,
    comparisonsByWindow,
    priorities,
    methods: buildMethods(),
    zones,
    summary: buildSummary(comparison, priorities),
  };
}

export async function loadPilotageOverview(params: {
  supabase: SupabaseClient;
  periodDays: number;
  limit?: number;
  types?: ActionEntityType[] | null;
}): Promise<PilotageOverview> {
  const { fetchUnifiedActionContracts } =
    await import("../actions/unified-source");
  const limit = params.limit ?? 1500;
  const floorDate = buildDateFloor(Math.max(params.periodDays * 2, 730));
  const { items: contracts } = await fetchUnifiedActionContracts(
    params.supabase,
    {
    limit,
    status: null,
    floorDate,
    requireCoordinates: false,
    types: params.types ?? null,
    },
  );

  return buildPilotageOverviewFromContracts({
    contracts,
    periodDays: params.periodDays,
  });
}
