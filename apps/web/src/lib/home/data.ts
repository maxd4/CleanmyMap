import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import type { ActionDataContract } from "@/lib/actions/data-contract";

export const HOMEPAGE_TEST_MARKERS = [
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

  return HOMEPAGE_TEST_MARKERS.some((marker) => haystack.includes(marker));
}

export async function loadLandingOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 365,
    limit: 5000,
  });
}

export function computeLandingCounters(
  contracts: ActionDataContract[],
  floorDate: string,
) {
  const inWindow = contracts.filter((contract) => {
    if (contract.status === "rejected") {
      return false;
    }
    if (isLikelyTestContract(contract)) {
      return false;
    }
    return contract.dates.observedAt >= floorDate;
  });

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
