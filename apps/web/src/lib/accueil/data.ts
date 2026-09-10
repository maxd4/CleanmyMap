import type { ActionDataContract } from "@/lib/actions/data-contract";
import { sumActionImpactKpis } from "@/lib/actions/impact-calculators";
import { fetchCachedUnifiedActionContracts } from "@/lib/actions/unified-source/unified-source-cache";
import type { UnifiedActionContractsCacheOptions } from "@/lib/actions/unified-source/unified-source-cache";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadLatestPublicImpactSnapshot,
  type PublicImpactSnapshotRecord,
  type PublicImpactSnapshotPayload,
} from "@/lib/impact/public-impact-snapshot";
import type { HomeCounters } from "./config";
import {
  getUserProvidedActionImageUrl,
  selectActionFallback,
} from "./action-fallbacks";
import {
  aggregatePublicActionMetrics,
  type PublicLandingActionAggregation,
} from "./action-participant-aggregation";

export type HomeCommunityActivityImage =
  | {
      source: "userProvidedImage";
      url: string;
      alt: string;
      isFallback: false;
    }
  | {
      source: "fallbackImage";
      url: string;
      alt: string;
      isFallback: true;
      syntheticImage: true;
      mustNeverBePresentedAsFieldEvidence: true;
    }
  | {
      source: "none";
      url: null;
      alt: "";
      isFallback: false;
    };

export type HomeCommunityActivityItem = {
  id: string;
  actor: string;
  initials: string;
  action: string;
  title: string;
  summary: string;
  location: string;
  timeLabel: string;
  dateLabel: string;
  statusLabel: string;
  volunteersCount: number | null;
  cigaretteButts: number | null;
  wasteKg: number | null;
  image: HomeCommunityActivityImage;
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
} & PublicLandingActionAggregation;

export const EMPTY_HOME_COMMUNITY_ACTIVITY: HomeCommunityActivitySummary = {
  visibleActions: 0,
  distinctLocations: 0,
  items: [],
};

const HOMEPAGE_COMMUNITY_ACTION_LIMIT = 3;
const LANDING_FALLBACK_CONTRACT_LIMIT = 500;

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

export function formatLandingOverviewErrorMessage(_error: unknown): string {
  void _error;
  return "Les actions vérifiées sont momentanément indisponibles.";
}

function buildLandingFloorDate(now = new Date()): string {
  const floor = new Date(now);
  floor.setUTCHours(0, 0, 0, 0);
  floor.setUTCDate(floor.getUTCDate() - 365);
  return floor.toISOString().slice(0, 10);
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

function getActorLabel(contract: ActionDataContract): string {
  const associationName = contract.metadata.associationName?.trim();
  const actorName = contract.metadata.actorName?.trim();

  if (associationName) {
    return associationName;
  }
  if (actorName && !/^google sheet$/iu.test(actorName)) {
    return actorName;
  }

  return (
    contract.location.label.trim() ||
    "Action terrain"
  );
}

function toFiniteNonNegativeMetric(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
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

function getActionTitle(contract: ActionDataContract): string {
  return (
    contract.metadata.preparationData?.actionTitle?.trim() ||
    "Action de dépollution"
  );
}

function getActionLocation(contract: ActionDataContract): string {
  const location = contract.location.label.trim();
  if (!location) {
    return "Lieu non précisé";
  }

  return location.split(/\s*(?:→|->|—)\s*/u)[0]?.trim() || location;
}

function getActionSummary(contract: ActionDataContract): string {
  return (
    contract.metadata.preparationData?.shortDescription?.trim() ||
    formatActionLabel(contract)
  );
}

function formatObservedDate(observedAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(observedAt);
  if (!match) {
    return observedAt;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatCommunityActionTitle(
  actor: string,
  contract: ActionDataContract,
): string {
  const volunteers = toFiniteNonNegativeMetric(
    contract.metadata.volunteersCount,
  );
  const volunteerLabel =
    volunteers === null
      ? "des bénévoles"
      : `${volunteers.toLocaleString("fr-FR")} bénévole${
          volunteers > 1 ? "s" : ""
        }`;

  return `${actor} a réuni ${volunteerLabel} le ${formatObservedDate(
    contract.dates.observedAt,
  )}`;
}

function getActivityImage(
  contract: ActionDataContract,
): HomeCommunityActivityImage {
  const userProvidedImageUrl = getUserProvidedActionImageUrl(contract);
  if (userProvidedImageUrl) {
    return {
      source: "userProvidedImage",
      url: userProvidedImageUrl,
      alt: `Photo fournie par l'utilisateur pour ${getActionTitle(contract)}`,
      isFallback: false,
    };
  }

  const fallback = selectActionFallback(contract);
  if (!fallback) {
    return {
      source: "none",
      url: null,
      alt: "",
      isFallback: false,
    };
  }

  return {
    source: "fallbackImage",
    url: fallback.publicPath,
    alt: fallback.alt,
    isFallback: true,
    syntheticImage: true,
    mustNeverBePresentedAsFieldEvidence: true,
  };
}

async function resolveActionPreviewImageUrl(
  actionId: string,
): Promise<string | null> {
  try {
    const storage = getSupabaseServerClient().storage.from("action-photos");
    const result = await storage.list(actionId, {
      limit: 1,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (result.error) {
      return null;
    }

    const file = (result.data ?? []).find((entry) =>
      /\.(?:jpe?g|png|webp)$/i.test(entry.name),
    );
    if (!file) {
      return null;
    }

    const { data } = storage.getPublicUrl(`${actionId}/${file.name}`);
    return data.publicUrl || null;
  } catch {
    return null;
  }
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
    .slice(0, HOMEPAGE_COMMUNITY_ACTION_LIMIT)
    .map((contract, index) => {
      const actor = getActorLabel(contract);

      return {
        id: contract.id,
        actor,
        initials: getInitials(actor),
        action: formatActionLabel(contract),
        title: formatCommunityActionTitle(actor, contract),
        summary: getActionSummary(contract),
        location: getActionLocation(contract),
        timeLabel: formatRelativeDay(contract.dates.observedAt),
        dateLabel: contract.dates.observedAt,
        statusLabel: contract.status === "approved" ? "Vérifiée" : "À vérifier",
        volunteersCount: toFiniteNonNegativeMetric(
          contract.metadata.volunteersCount,
        ),
        cigaretteButts: toFiniteNonNegativeMetric(
          contract.metadata.cigaretteButts,
        ),
        wasteKg: toFiniteNonNegativeMetric(contract.metadata.wasteKg),
        image: getActivityImage(contract),
        tone: tones[index % tones.length],
      };
    });

  return {
    visibleActions: visibleContracts.length,
    distinctLocations,
    items,
  };
}

async function attachActionPreviewImages(
  activity: HomeCommunityActivitySummary,
): Promise<HomeCommunityActivitySummary> {
  const imageUrls = await Promise.all(
    activity.items.map((item) => resolveActionPreviewImageUrl(item.id)),
  );

  return {
    ...activity,
    items: activity.items.map((item, index) => ({
      ...item,
      image: imageUrls[index]
        ? {
            source: "userProvidedImage" as const,
            url: imageUrls[index] as string,
            alt: `Photo fournie par l'utilisateur pour ${item.title}`,
            isFallback: false as const,
          }
        : item.image,
    })),
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
  const actionAggregation = aggregatePublicActionMetrics(
    getAccueilVisibleContracts(contracts, floorDate),
  );

  return {
    counters: computeLandingCounters(contracts, floorDate),
    activity: buildHomeCommunityActivity(contracts, floorDate),
    dataAvailability: {
      status: sourceHealth.partial ? "partial" : "available",
      sourceHealth,
    },
    ...actionAggregation,
  };
}

export function buildLandingSummaryFromImpactSnapshot(
  payload: PublicImpactSnapshotPayload,
  recentContracts: ActionDataContract[],
  sourceHealth: UnifiedSourceHealth = DEFAULT_LANDING_SOURCE_HEALTH,
): LandingSummary {
  const { kpis } = payload;
  const counters: HomeCounters = {
    wasteKg: kpis.impactTerrain.wasteKg,
    butts: kpis.impactTerrain.buttsTotal,
    volunteers: kpis.participantsTotal,
    co2AvoidedKg: kpis.impactTerrain.co2eKg,
    waterSavedLiters: kpis.impactTerrain.waterLiters,
    euroSaved: Math.round(kpis.streetCleaningSavings.massEstimateEuros),
  };
  const activity = buildHomeCommunityActivityFromRecentContracts(
    recentContracts,
    payload.period.fromDate,
    {
      visibleActions: payload.aggregates.visibleActions,
      distinctLocations: payload.aggregates.distinctLocations,
    },
  );

  return {
    counters,
    activity,
    dataAvailability: {
      status: sourceHealth.partial ? "partial" : "available",
      sourceHealth,
    },
    ...kpis,
  };
}

type RecentCommunityActivityData = {
  contracts: ActionDataContract[];
  floorDate: string;
  activity: HomeCommunityActivitySummary;
  sourceHealth: UnifiedSourceHealth;
};

async function loadRecentCommunityActivityData(
  snapshot: PublicImpactSnapshotRecord | null,
  cacheOptions: UnifiedActionContractsCacheOptions = {},
): Promise<RecentCommunityActivityData> {
  const floorDate = snapshot?.payload.period.fromDate ?? buildLandingFloorDate();
  const recent = await fetchCachedUnifiedActionContracts({
    limit: snapshot ? HOMEPAGE_COMMUNITY_ACTION_LIMIT : LANDING_FALLBACK_CONTRACT_LIMIT,
    status: "approved",
    floorDate,
    requireCoordinates: false,
    types: ["action"],
  }, cacheOptions);
  const activity = snapshot
    ? buildHomeCommunityActivityFromRecentContracts(
        recent.items,
        floorDate,
        {
          visibleActions: snapshot.payload.aggregates.visibleActions,
          distinctLocations: snapshot.payload.aggregates.distinctLocations,
        },
      )
    : buildHomeCommunityActivity(recent.items, floorDate);

  return {
    contracts: recent.items,
    floorDate,
    activity: await attachActionPreviewImages(activity),
    sourceHealth: recent.sourceHealth,
  };
}

export type HomeCommunityActivityResponse = {
  activity: HomeCommunityActivitySummary;
  errorMessage: string | null;
};

export async function loadRecentCommunityActivity(): Promise<HomeCommunityActivityResponse> {
  const snapshot = await loadLatestPublicImpactSnapshot();
  const recent = await loadRecentCommunityActivityData(snapshot);

  return {
    activity: recent.activity,
    errorMessage: recent.sourceHealth.partial
      ? "Les dernières actions vérifiées sont partiellement disponibles."
      : null,
  };
}

export async function loadLandingSummary(): Promise<LandingSummary> {
  const snapshot = await loadLatestPublicImpactSnapshot();
  if (!snapshot) {
    const fallback = await loadRecentCommunityActivityData(null, {
      revalidateSeconds: 3600,
    });
    const summary = buildLandingSummaryFromContracts(
      fallback.contracts,
      fallback.floorDate,
      fallback.sourceHealth,
    );

    return {
      ...summary,
      activity: fallback.activity,
    };
  }

  return buildLandingSummaryFromImpactSnapshot(
    snapshot.payload,
    [],
    DEFAULT_LANDING_SOURCE_HEALTH,
  );
}
