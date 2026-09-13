import { loadLandingSummary } from "@/lib/accueil/data";
import {
  buildPublicImpactMetrics,
  type PublicImpactCounters,
} from "@/lib/impact/public-impact-kpis";
import { ActionsMapPageClient } from "./page-client";

const EMPTY_PUBLIC_IMPACT_COUNTERS: PublicImpactCounters = {
  wasteKg: 0,
  butts: 0,
  volunteers: 0,
  co2: 0,
  water: 0,
  euro: 0,
};

export default async function ActionsMapPage() {
  let counters = EMPTY_PUBLIC_IMPACT_COUNTERS;
  let hasData = false;

  try {
    const summary = await loadLandingSummary();
    counters = summary.counters;
    hasData = true;
  } catch {
    // Keep the existing public KPI empty state when the server snapshot and
    // its canonical fallback are both unavailable.
  }

  return (
    <ActionsMapPageClient
      impactMetrics={buildPublicImpactMetrics(counters, hasData)}
    />
  );
}
