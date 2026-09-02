"use client";

import dynamic from "next/dynamic";
import { AnalyticsCockpitEmptyState } from "@/components/reports/analytics-cockpit-empty-state";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";

const DeferredAnalyticsCockpitComponent = dynamic(
  () =>
    import("@/components/reports/analytics-cockpit").then(
      (module) => module.AnalyticsCockpit,
    ),
  {
    loading: () => (
      <div
        className="h-[300px] w-full animate-pulse rounded-xl bg-slate-50/70"
        aria-label="Chargement des tendances"
      />
    ),
  },
);

export function DeferredAnalyticsCockpit({
  data,
}: {
  data: MonthlyAnalyticsPoint[];
}) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "260px 0px",
  });
  const shouldRenderChart = isInView || typeof IntersectionObserver === "undefined";

  if (!data || data.length === 0) {
    return <AnalyticsCockpitEmptyState />;
  }

  return (
    <div ref={ref}>
      {shouldRenderChart ? (
        <DeferredAnalyticsCockpitComponent data={data} />
      ) : (
        <div
          className="h-[300px] w-full animate-pulse rounded-xl bg-slate-50/70"
          aria-label="Chargement des tendances"
        />
      )}
    </div>
  );
}
