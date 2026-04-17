"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { fetchCommunityEvents } from "@/lib/community/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { computeReportModel, getWeatherAdvice } from "./analytics";

export function useReportsWebDocumentModel() {
  const [associationFilter, setAssociationFilter] = useState<string>("all");

  const actionsAll = useSWR(
    ["report-web-actions-all", associationFilter],
    () =>
      fetchActions({
        status: "all",
        limit: 200,
        days: 365,
        types: "all",
        association: associationFilter,
      }),
    swrRecentViewOptions,
  );
  const actionsApproved = useSWR(
    ["report-web-actions-approved", associationFilter],
    () =>
      fetchActions({
        status: "approved",
        limit: 200,
        days: 365,
        types: "all",
        association: associationFilter,
      }),
    swrRecentViewOptions,
  );
  const mapAll = useSWR(
    ["report-web-map-all", associationFilter],
    () =>
      fetchMapActions({
        status: "all",
        limit: 300,
        days: 365,
        types: "all",
        association: associationFilter,
      }),
    swrRecentViewOptions,
  );
  const community = useSWR(
    ["report-web-community-events"],
    () => fetchCommunityEvents({ limit: 240 }),
    swrRecentViewOptions,
  );
  const weather = useSWR(["report-web-weather"], async () => {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("weather_unavailable");
    return (await response.json()) as {
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
      };
    };
  });

  const isLoading =
    actionsAll.isLoading ||
    actionsApproved.isLoading ||
    mapAll.isLoading ||
    community.isLoading;
  const hasError = Boolean(
    actionsAll.error || actionsApproved.error || mapAll.error || community.error,
  );

  const associationOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of actionsAll.data?.items ?? []) {
      const value = item.association_name?.trim();
      if (value) names.add(value);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "fr"));
  }, [actionsAll.data?.items]);

  const report = useMemo(
    () =>
      computeReportModel({
        allItems: actionsAll.data?.items ?? [],
        approvedItems: actionsApproved.data?.items ?? [],
        mapItems: mapAll.data?.items ?? [],
        events: community.data?.items ?? [],
      }),
    [
      actionsAll.data?.items,
      actionsApproved.data?.items,
      community.data?.items,
      mapAll.data?.items,
    ],
  );

  const weatherAdvice = useMemo(() => {
    const temperature = Number(weather.data?.current?.temperature_2m ?? 0);
    const rain = Number(weather.data?.current?.precipitation ?? 0);
    const wind = Number(weather.data?.current?.wind_speed_10m ?? 0);
    return getWeatherAdvice({ temperature, rain, wind });
  }, [weather.data]);

  const activeScopeLabel =
    associationFilter === "all"
      ? "Global (toutes associations)"
      : associationFilter;

  return {
    associationFilter,
    setAssociationFilter,
    associationOptions,
    activeScopeLabel,
    report,
    weather,
    weatherAdvice,
    isLoading,
    hasError,
  };
}
