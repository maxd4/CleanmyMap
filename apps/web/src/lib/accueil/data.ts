import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import type { ActionDataContract } from "@/lib/actions/data-contract";

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

export const ACCUEIL_TEST_MARKERS = [
  "test",
  "demo",
  "seed",
  "sandbox",
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

export async function loadLandingOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 365,
    limit: 5000,
  });
}

function getAccueilVisibleContracts(
  contracts: ActionDataContract[],
  floorDate: string,
) {
  return contracts.filter((contract) => {
    if (contract.status === "rejected") {
      return false;
    }
    if (isLikelyTestContract(contract)) {
      return false;
    }
    return contract.dates.observedAt >= floorDate;
  });
}

function formatSourceLabel(source: string): string {
  const normalized = source.trim().toLowerCase();

  if (normalized.includes("sheet")) {
    return "Google Sheet";
  }
  if (normalized.includes("spot")) {
    return "Signalement terrain";
  }
  if (normalized.includes("action")) {
    return "Action terrain";
  }

  return (
    source
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Action terrain"
  );
}

function getActorLabel(contract: ActionDataContract): string {
  return (
    contract.metadata.actorName?.trim() ||
    contract.metadata.associationName?.trim() ||
    formatSourceLabel(contract.source)
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

export function computeLandingCounters(
  contracts: ActionDataContract[],
  floorDate: string,
) {
  const inWindow = getAccueilVisibleContracts(contracts, floorDate);

  const wasteKg = inWindow.reduce(
    (acc, contract) => acc + Number(contract.metadata.wasteKg || 0),
    0,
  );
  const butts = inWindow.reduce(
    (acc, contract) => acc + Number(contract.metadata.cigaretteButts || 0),
    0,
  );
  const volunteers = inWindow.reduce(
    (acc, contract) => acc + Number(contract.metadata.volunteersCount || 0),
    0,
  );

  const co2AvoidedKg = wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg;
  const waterSavedLiters = Math.round(
    butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
  );
  const euroSaved = Math.round(
    wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg,
  );

  return {
    wasteKg,
    butts,
    volunteers,
    co2AvoidedKg,
    waterSavedLiters,
    euroSaved,
  };
}
