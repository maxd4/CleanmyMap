"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { RouteConstraints, RouteResponse } from "../route-types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  DEFAULT_ROUTE_CONSTRAINTS,
  readRouteDraftConstraints,
  writeRouteDraftConstraints,
} from "../route-draft-storage";
import {
  createRouteRecommendationRequest,
  fetchRouteRecommendation,
  type RouteRecommendationRequest,
} from "../route-request";

export function useRouteData() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const [constraints, setConstraintsState] = useState<RouteConstraints>(() => ({
    ...DEFAULT_ROUTE_CONSTRAINTS,
  }));
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [recommendationRequest, setRecommendationRequest] =
    useState<RouteRecommendationRequest | null>(null);
  const requestSequence = useRef(0);
  const draftEditedBeforeHydration = useRef(false);

  const setConstraints = useCallback<React.Dispatch<React.SetStateAction<RouteConstraints>>>((update) => {
    draftEditedBeforeHydration.current = true;
    setConstraintsState(update);
  }, []);

  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = undefined;
    }
    if (!draftEditedBeforeHydration.current) {
      setConstraintsState(readRouteDraftConstraints(storage));
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
    writeRouteDraftConstraints(storage, constraints);
  }, [constraints, isDraftHydrated]);

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
  const routeGeometry = data?.routeGeometry;
  
  const totalKm = useMemo(
    () =>
      routeGeometry?.mode === "network"
        ? routeGeometry.distanceKm
        : picks.reduce((acc, item) => acc + Number(item.segmentKm || 0), 0),
    [routeGeometry, picks],
  );
  
  const totalMinutes = useMemo(
    () =>
      routeGeometry?.mode === "network"
        ? routeGeometry.durationMinutes
        : picks.reduce(
            (acc, item) => acc + Number(item.estimatedMinutes || 0),
            0,
          ),
    [routeGeometry, picks],
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
    recommendationRequested: recommendationRequest !== null,
    requestRecommendation: () => {
      requestSequence.current += 1;
      setRecommendationRequest(
        createRouteRecommendationRequest(requestSequence.current, constraints),
      );
    },
  };
}
