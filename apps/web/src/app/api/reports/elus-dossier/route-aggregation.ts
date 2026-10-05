import { computePeriodComparison } from "@/lib/analytics/period-comparison";
import {
  buildTerritorialBenchmark,
  type TerritorialBenchmarkRow,
} from "@/lib/analytics/territorial-benchmark";
import { toActionListItem } from "@/lib/actions/data-contract";
import { evaluateActionQuality } from "@/lib/actions/quality/quality";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import { buildPersonalImpactMethodology } from "@/lib/gamification/progression-impact";
import type { PersonalImpactMethodology } from "@/lib/gamification/progression-types";
import { buildPilotageOverviewFromContracts } from "@/lib/pilotage/overview";
import { buildDateFloor } from "@/lib/reports/csv";
import { filterActionContractsByScope } from "@/lib/reports/scope";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ScopeSelection } from "./route-scope";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

function toFiniteNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sumApprovedMetric<T>(contracts: Array<T>, selector: (contract: T) => unknown): number {
  return contracts.reduce((acc, contract) => acc + toFiniteNumber(selector(contract)), 0);
}

function countKnownMetric<T>(contracts: Array<T>, selector: (contract: T) => unknown): number {
  return contracts.reduce((count, contract) => {
    const value = selector(contract);
    const parsed = typeof value === "number" ? value : Number(value);
    return count + (Number.isFinite(parsed) && parsed >= 0 ? 1 : 0);
  }, 0);
}

function countGeolocatedContracts<T extends {
  location: { latitude: number | null; longitude: number | null };
}>(contracts: Array<T>): number {
  return contracts.reduce((count, contract) => {
    if (contract.location.latitude === null || contract.location.longitude === null) {
      return count;
    }
    return count + 1;
  }, 0);
}

function buildDecisionPriorities(rows: TerritorialBenchmarkRow[]) {
  return rows.slice(0, 5).map((row) => {
    const urgency =
      row.decisionLabel === "Priorite haute"
        ? "haute"
        : row.decisionLabel === "Priorite moyenne"
          ? "moyenne"
          : "fond";
    const reason =
      urgency === "haute"
        ? `Pression forte (${row.actionsPerKm2} act/km2, ${row.kgPerKm2} kg/km2).`
        : urgency === "moyenne"
          ? `Zone active a stabiliser (${row.actionsPerKm2} act/km2).`
          : "Surveillance reguliere suffisante sur la periode.";
    return {
      area: row.area,
      urgency,
      reason,
      normalizedScore: row.normalizedScore,
    };
  });
}

function buildMethodology(shared: PersonalImpactMethodology) {
  return {
    version: "elus-pack-v2.2",
    proxyVersion: shared.proxyVersion,
    qualityRulesVersion: shared.qualityRulesVersion,
    pollutionScoreAverage: shared.pollutionScoreAverage,
    formulas: [
      ...shared.formulas.map((item) => `${item.label}: ${item.formula}`),
      "Normalisation inter-zones = actions/km2, kg/km2, volunteers/10k hab.",
    ],
    sources: [
      `Perimetre qualite: ${shared.scope}`,
      "Actions unifiees (action, clean_place, spot) sur fenetre N et N-1.",
      "Geo metadata (latitude/longitude, zone label) issues des contrats normalises.",
      "Reference surface/densite par arrondissement pour normalisation.",
    ],
    limits: [
      ...shared.approximations,
      ...shared.hypotheses,
      "Les proxies climat restent des ordres de grandeur, pas des mesures instrumentales.",
      "Les comparaisons de zones sont sensibles a la qualite de geolocalisation.",
      "Le score normalise est un outil d'aide a la decision, non un verdict automatique.",
    ],
    errorMargins: shared.errorMargins,
  };
}

export async function buildElusDossierPayload(params: {
  supabase: SupabaseAdminClient;
  days: number;
  limit: number;
  floorDate: ReturnType<typeof buildDateFloor>;
  scope: ScopeSelection;
}) {
  const { items: contracts, isTruncated, sourceHealth: fetchedSourceHealth } =
    await fetchUnifiedActionContracts(params.supabase, {
      limit: Math.max(params.limit * 2, params.limit),
      status: null,
      floorDate: params.floorDate,
      requireCoordinates: false,
      types: null,
    });
  const sourceHealth: UnifiedSourceHealth = fetchedSourceHealth ?? {
    partial: false,
    failedSources: [],
    availableSources: ["actions"],
    warnings: [],
  };

  const scopeContracts = filterActionContractsByScope(contracts, {
    kind: params.scope.kind,
    value: params.scope.value,
  });
  const approved = scopeContracts.filter((contract) => contract.status === "approved");
  const totalKg = sumApprovedMetric(approved, (contract) => contract.metadata.wasteKg);
  const knownWasteActions = countKnownMetric(approved, (contract) => contract.metadata.wasteKg);
  const totalActions = approved.length;
  const totalVolunteers = sumApprovedMetric(
    approved,
    (contract) => contract.metadata.volunteersCount,
  );
  const geolocated = countGeolocatedContracts(approved);

  const comparison = computePeriodComparison(
    scopeContracts.map((contract) => ({
      status: contract.status,
      observedAt: contract.dates.observedAt,
      createdAt: contract.dates.createdAt ?? contract.dates.importedAt,
      latitude: contract.location.latitude,
      longitude: contract.location.longitude,
      wasteKg: contract.metadata.wasteKg,
    })),
    params.days,
  );
  const benchmark = buildTerritorialBenchmark(
    scopeContracts.map((contract) => ({
      type: contract.type,
      status: contract.status,
      locationLabel: contract.location.label,
      wasteKg: contract.metadata.wasteKg,
      volunteersCount: contract.metadata.volunteersCount,
    })),
  );
  const overview = buildPilotageOverviewFromContracts({
    contracts: scopeContracts,
    periodDays: params.days,
  });
  const qualityScores = approved.map((contract) =>
    evaluateActionQuality(toActionListItem(contract)).score,
  );
  const qualityAverage =
    qualityScores.length > 0
      ? qualityScores.reduce((acc, score) => acc + score, 0) / qualityScores.length
      : 0;
  const sharedMethodology = buildPersonalImpactMethodology(qualityAverage);
  const methodology = buildMethodology(sharedMethodology);

  return {
    generatedAt: overview.generatedAt,
    periodDays: params.days,
    packVersion: methodology.version,
    summary: {
      totalActions,
      totalKg: Number(totalKg.toFixed(1)),
      knownWasteActions,
      totalVolunteers,
      geocoverageRate: totalActions > 0 ? Math.round((geolocated / totalActions) * 100) : 0,
    },
    comparison,
    territorialPriorities: benchmark,
    decisionPriorities: buildDecisionPriorities(benchmark),
    zoneComparisons: overview.zones,
    isTruncated,
    sourceHealth,
    methodology,
    methodologyText: [
      "Sources: actions/clean_place/spot unifiees sur la fenetre courante.",
      "Comparatif: periode N vs N-1 sur actions, volume, couverture, delai moderation.",
      "Benchmark: normalisation par surface, densite, volume d'actions et participation.",
      "Lecture decisionnelle: priorisation haute/moyenne/fond selon score normalise.",
    ],
  };
}

export type ElusDossierPayload = Awaited<ReturnType<typeof buildElusDossierPayload>>;
