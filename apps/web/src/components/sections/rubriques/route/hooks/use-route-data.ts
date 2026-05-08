import { useMemo, useState } from "react";
import useSWR from "swr";
import { RouteConstraints, RouteResponse } from "../route-types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function useRouteData() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const [constraints, setConstraints] = useState<RouteConstraints>({
    availableMinutes: 180,
    volunteers: 4,
    accessibility: "standard",
    security: "standard",
    weather: "ok",
    impactVsDistance: 65,
    maxStops: 6,
  });

  const { data, isLoading, error } = useSWR<RouteResponse>(
    ["section-route", JSON.stringify(constraints)],
    async () => {
      const response = await fetch("/api/route/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(constraints),
      });

      if (!response.ok) {
        throw new Error(fr ? "Route indisponible" : "Route unavailable");
      }

      return (await response.json()) as RouteResponse;
    },
  );

  const picks = useMemo(() => data?.stops ?? [], [data?.stops]);
  
  const totalKm = useMemo(
    () => picks.reduce((acc, item) => acc + Number(item.segmentKm || 0), 0),
    [picks],
  );
  
  const totalMinutes = useMemo(
    () => picks.reduce((acc, item) => acc + Number(item.estimatedMinutes || 0), 0),
    [picks],
  );

  const hasData = !isLoading && !error && Boolean(data);
  const hasRoute = hasData && picks.length > 0;

  return {
    constraints,
    setConstraints,
    data,
    isLoading,
    error,
    picks,
    totalKm,
    totalMinutes,
    hasData,
    hasRoute,
    fr,
  };
}
