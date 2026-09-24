import type { Metadata } from "next";
import { loadLandingSummary } from "@/lib/accueil/data";
import {
  buildPublicImpactMetrics,
  type PublicImpactCounters,
} from "@/lib/impact/public-impact-kpis";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { ActionsMapPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Carte des actions",
  description:
    "Explorer les actions de dépollution et les signalements citoyens sur la carte CleanMyMap.",
  alternates: { canonical: "/actions/map" },
  robots: { index: true, follow: true },
};

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
    <>
      <PageHeader
        family={resolvePageFamily("/actions/map")}
        title="Cartographie des actions"
        className="cmm-page-width px-6 pt-6"
      />
      <ActionsMapPageClient
        impactMetrics={buildPublicImpactMetrics(counters, hasData)}
      />
    </>
  );
}
