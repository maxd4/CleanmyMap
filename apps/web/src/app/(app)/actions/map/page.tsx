import type { Metadata } from "next";
import { Suspense } from "react";
import { loadLandingSummary } from "@/lib/accueil/data";
import {
  buildPublicImpactMetrics,
  type PublicImpactCounters,
} from "@/lib/impact/public-impact-kpis";
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

export default function ActionsMapPage() {
  const emptyImpactMetrics = buildPublicImpactMetrics(
    EMPTY_PUBLIC_IMPACT_COUNTERS,
    false,
  );

  return (
    <>
      <header className="cmm-page-header cmm-page-header--left cmm-page-width px-6 pt-6">
        <div className="flex w-full flex-col gap-4 items-start">
          <div className="min-w-0 w-full">
            <h1 className={`cmm-page-header-title ${resolvePageFamily("/actions/map").hero.titleColor}`}>
              Cartographie des actions
            </h1>
          </div>
        </div>
      </header>
      <Suspense
        fallback={<ActionsMapPageClient impactMetrics={emptyImpactMetrics} />}
      >
        <ActionsMapContent />
      </Suspense>
    </>
  );
}

async function ActionsMapContent() {
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
