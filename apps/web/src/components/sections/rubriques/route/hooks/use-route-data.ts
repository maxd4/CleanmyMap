"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { RouteOptions, RouteResponse } from "../route-types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  DEFAULT_ROUTE_OPTIONS,
  readRouteDraftOptions,
  writeRouteDraftOptions,
} from "../route-draft-storage";
import {
  createRouteRecommendationRequest,
  fetchRouteRecommendation,
  type RouteRecommendationRequest,
} from "../route-request";

export function useRouteData() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const [options, setOptionsState] = useState<RouteOptions>(() => ({
    ...DEFAULT_ROUTE_OPTIONS,
  }));
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [recommendationRequest, setRecommendationRequest] =
    useState<RouteRecommendationRequest | null>(null);
  const requestSequence = useRef(0);
  const draftEditedBeforeHydration = useRef(false);

  const setOptions = useCallback<React.Dispatch<React.SetStateAction<RouteOptions>>>((update) => {
    draftEditedBeforeHydration.current = true;
    setOptionsState(update);
  }, []);

  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = undefined;
    }
    if (!draftEditedBeforeHydration.current) {
      setOptionsState(readRouteDraftOptions(storage));
    }
    setIsDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!isDraftHydrated) return;

    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = undefined;
    }
    writeRouteDraftOptions(storage, options);
  }, [options, isDraftHydrated]);

  const { data, isLoading, error } = useSWR<RouteResponse>(
    recommendationRequest
      ? ["section-route", recommendationRequest]
      : null,
    ([, request]: readonly [string, RouteRecommendationRequest]) =>
      fetchRouteRecommendation(request),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  const picks = useMemo(() => data?.stops ?? [], [data?.stops]);

  const totalKm = useMemo(() => data?.travelDistanceKm ?? 0, [data?.travelDistanceKm]);

  const totalMinutes = useMemo(() => data?.travelMinutes ?? 0, [data?.travelMinutes]);

  const hasData = !isLoading && !error && Boolean(data);
  const hasRoute = hasData && picks.length > 0;

  return {
    options,
    setOptions,
    data,
    isLoading,
    error,
    picks,
    totalKm,
    totalMinutes,
    hasData,
    hasRoute,
    fr,
    recommendationRequested: recommendationRequest !== null,
    requestRecommendation: () => {
      requestSequence.current += 1;
      setRecommendationRequest(
        createRouteRecommendationRequest(requestSequence.current, options),
      );
    },
  };
}
