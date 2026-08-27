import type { ActionDataContract } from "@/lib/actions/data-contract";
import { sumActionImpactKpis } from "@/lib/actions/impact-calculators";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { fetchCachedUnifiedActionContracts } from "@/lib/actions/unified-source/unified-source-cache";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";
import type { HomeCounters } from "./config";

export type HomeCommunityActivityItem = {
  id: string;
  actor: string;
  initials: string;
  action: string;
  location: string;
  timeLabel: string;
  tone: "cyan" | "emerald" | "blue" | "amber";
};

export type HomeCommunityActivitySummary = {
  visibleActions: number;
  distinctLocations: number;
  items: HomeCommunityActivityItem[];
};

export type LandingDataAvailability = {
  status: "available" | "partial";
  sourceHealth: UnifiedSourceHealth;
};

export type LandingSummary = {
  counters: HomeCounters;
  activity: HomeCommunityActivitySummary;
  dataAvailability: LandingDataAvailability;
};

export const LANDING_SUMMARY_SNAPSHOT_KEY = "cleanmymap-landing-summary";
export const LANDING_SUMMARY_SNAPSHOT_VERSION = "landing-summary-2026.08-v1";
export const LANDING_SUMMARY_SNAPSHOT_TTL_MINUTES = 60;

export const ACCUEIL_TEST_MARKERS = [
  "test",
  "demo",
  "seed",
  "dummy",
  "fake",
  "runtime_seed",
  "test_seed",
  "quartier demo",
  "zone test",
  "lieu test",
  "exemple",
] as const;

export function isLikelyTestContract(contract: ActionDataContract): boolean {
  const haystack = [
    contract.id,
    contract.source,
    contract.location.label,
    contract.metadata.actorName ?? "",
    contract.metadata.notes ?? "",
    contract.metadata.notesPlain ?? "",
  ]
    .join("")
    .toLowerCase();

  return ACCUEIL_TEST_MARKERS.some((marker) => haystack.includes(marker));
}

export function formatLandingOverviewErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `Supabase est momentanément indisponible. ${error.message}`;
  }

  return "Supabase est momentanément indisponible. Réessaie dans un instant.";
}

function getAccueilVisibleContracts(
  contracts: ActionDataContract[],
  floorDate: string,
) {
  return contracts.filter((contract) => {
    if (contract.type !== "action") {
      return false;
    }
    if (contract.status !== "approved") {
      return false;
    }
    if (isLikelyTestContract(contract)) {
      return false;
    }
    return contract.dates.observedAt >= floorDate;
  });
}

function buildLandingFloorDate(now = new Date()): string {
  const floor = new Date(now);
  floor.setUTCHours(0, 0, 0, 0);
  floor.setUTCDate(floor.getUTCDate() - 365);
  return floor.toISOString().slice(0, 10);
}

function getActorLabel(contract: ActionDataContract): string {
  return (
    contract.location.label.trim() ||
    contract.metadata.associationName?.trim() ||
    contract.metadata.actorName?.trim() ||
    "Action terrain"
  );
}

function getInitials(label: string): string {
  const words = label
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "AT";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function formatActionLabel(contract: ActionDataContract): string {
  const volunteers = Number(contract.metadata.volunteersCount || 0);
  const wasteKg = Number(contract.metadata.wasteKg || 0);
  const butts = Number(contract.metadata.cigaretteButts || 0);

  if (volunteers > 0) {
    return `a mobilisé ${volunteers} bénévole${volunteers > 1 ? "s" : ""}`;
  }
  if (wasteKg > 0) {
    return `a déclaré ${wasteKg.toLocaleString("fr-FR", {
      maximumFractionDigits: 1,
    })} kg de déchets collectés`;
  }
  if (butts > 0) {
    return `a retiré ${butts.toLocaleString("fr-FR")} mégot${
      butts > 1 ? "s" : ""
    }`;
  }

  return "a enregistré une action terrain";
}

function formatRelativeDay(observedAt: string): string {
  const observed = new Date(`${observedAt}T00:00:00.000Z`);
  if (Number.isNaN(observed.getTime())) {
    return "Date terrain";
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const observedUtc = Date.UTC(
    observed.getUTCFullYear(),
    observed.getUTCMonth(),
    observed.getUTCDate(),
  );
  const diffDays = Math.max(
    0,
    Math.floor((todayUtc - observedUtc) / (24 * 60 * 60 * 1000)),
  );

  if (diffDays === 0) {
    return "Aujourd'hui";
  }
  if (diffDays === 1) {
    return "Hier";
  }

  return `Il y a ${diffDays} j`;
}

export function buildHomeCommunityActivity(
  contracts: ActionDataContract[],
  floorDate: string,
): HomeCommunityActivitySummary {
  const visibleContracts = getAccueilVisibleContracts(contracts, floorDate);
  const distinctLocations = new Set(
    visibleContracts
      .map((contract) => contract.location.label.trim())
      .filter(Boolean),
  ).size;
  const tones: HomeCommunityActivityItem["tone"][] = [
    "cyan",
    "emerald",
    "blue",
    "amber",
  ];

  const items = [...visibleContracts]
    .sort((a, b) => b.dates.observedAt.localeCompare(a.dates.observedAt))
    .slice(0, 3)
    .map((contract, index) => {
      const actor = getActorLabel(contract);

      return {
        id: contract.id,
        actor,
        initials: getInitials(actor),
        action: formatActionLabel(contract),
        location: contract.location.label.trim() || "Lieu non précisé",
        timeLabel: formatRelativeDay(contract.dates.observedAt),
        tone: tones[index % tones.length],
      };
    });

  return {
    visibleActions: visibleContracts.length,
    distinctLocations,
    items,
  };
}

export function buildHomeCommunityActivityFromRecentContracts(
  recentContracts: ActionDataContract[],
  floorDate: string,
  totals: Pick<HomeCommunityActivitySummary, "visibleActions" | "distinctLocations">,
): HomeCommunityActivitySummary {
  const recentActivity = buildHomeCommunityActivity(recentContracts, floorDate);
  return {
    ...recentActivity,
    visibleActions: totals.visibleActions,
    distinctLocations: totals.distinctLocations,
  };
}

export function computeLandingCounters(
  contracts: ActionDataContract[],
  floorDate: string,
) {
  const inWindow = getAccueilVisibleContracts(contracts, floorDate);
  const impact = sumActionImpactKpis(inWindow);

  return {
    ...impact,
  };
}

type LandingActionSummaryRow = {
  visible_actions: number | string | null;
  distinct_locations: number | string | null;
  waste_kg: number | string | null;
  cigarette_butts: number | string | null;
  volunteers: number | string | null;
};

function toFiniteNonNegativeNumber(value: number | string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function buildLandingCountersFromAggregate(
  row: LandingActionSummaryRow,
): HomeCounters {
  const wasteKg = toFiniteNonNegativeNumber(row.waste_kg);
  const butts = toFiniteNonNegativeNumber(row.cigarette_butts);
  const volunteers = toFiniteNonNegativeNumber(row.volunteers);

  return {
    wasteKg,
    butts,
    volunteers,
    co2AvoidedKg: wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
    waterSavedLiters: Math.round(
      butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
    ),
    euroSaved: Math.round(
      wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg,
    ),
  };
}

const DEFAULT_LANDING_SOURCE_HEALTH: UnifiedSourceHealth = {
  partial: false,
  failedSources: [],
  availableSources: ["actions"],
  warnings: [],
};

export function buildLandingSummaryFromContracts(
  contracts: ActionDataContract[],
  floorDate: string,
  sourceHealth: UnifiedSourceHealth = DEFAULT_LANDING_SOURCE_HEALTH,
): LandingSummary {
  return {
    counters: computeLandingCounters(contracts, floorDate),
    activity: buildHomeCommunityActivity(contracts, floorDate),
    dataAvailability: {
      status: sourceHealth.partial ? "partial" : "available",
      sourceHealth,
    },
  };
}

async function loadLandingActionSummary(
  floorDate: string,
): Promise<LandingActionSummaryRow> {
  const result = await getSupabaseServerClient().rpc(
    "load_public_landing_action_summary",
    { p_floor_date: floorDate },
  );
  if (result.error) {
    throw result.error;
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) {
    throw new Error("Landing action summary returned no row.");
  }
  return row as LandingActionSummaryRow;
}

async function buildLandingSummary(): Promise<LandingSummary> {
  const floorDate = buildLandingFloorDate();
  const [aggregate, recent] = await Promise.all([
    loadLandingActionSummary(floorDate),
    fetchCachedUnifiedActionContracts({
      limit: 3,
      status: "approved",
      floorDate,
      requireCoordinates: false,
      types: ["action"],
    }),
  ]);
  const counters = buildLandingCountersFromAggregate(aggregate);
  const activity = buildHomeCommunityActivityFromRecentContracts(
    recent.items,
    floorDate,
    {
      visibleActions: toFiniteNonNegativeNumber(aggregate.visible_actions),
      distinctLocations: toFiniteNonNegativeNumber(aggregate.distinct_locations),
    },
  );
  const sourceHealth = recent.sourceHealth;

  return {
    counters,
    activity,
    dataAvailability: {
      status: sourceHealth.partial ? "partial" : "available",
      sourceHealth,
    },
  };
}

export async function loadLandingSummary(): Promise<LandingSummary> {
  const snapshot = await loadOrRefreshPublicSurfaceSnapshot<LandingSummary>({
    snapshotKey: LANDING_SUMMARY_SNAPSHOT_KEY,
    title: "Résumé public de la page d'accueil",
    version: LANDING_SUMMARY_SNAPSHOT_VERSION,
    ttlMinutes: LANDING_SUMMARY_SNAPSHOT_TTL_MINUTES,
    buildPayload: buildLandingSummary,
    meta: {
      route: "home",
      periodDays: 365,
      recentActivityLimit: 3,
      sourceTypes: ["action"],
    },
  });

  return snapshot.payload;
}
