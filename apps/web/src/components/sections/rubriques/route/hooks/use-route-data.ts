"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type {
  RouteOptions,
  RouteRecommendationOrigin,
  RouteResponse,
  RouteOriginMode,
} from "../route-types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  DEFAULT_ROUTE_OPTIONS,
  readRouteDraftOptions,
  writeRouteDraftOptions,
} from "../route-draft-storage";
import {
  createRouteRecommendationSubmission,
  createRouteRequestGate,
  fetchRouteRecommendation,
  resolveRouteRequestOrigin,
  type RouteRecommendationSubmission,
} from "../route-request";
import { resolveBrowserRouteOrigin } from "../route-geolocation";

export function useRouteData() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const [options, setOptionsState] = useState<RouteOptions>(() => ({
    ...DEFAULT_ROUTE_OPTIONS,
  }));
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [recommendationRequest, setRecommendationRequest] =
    useState<RouteRecommendationSubmission | null>(null);
  const [originMode, setOriginModeState] = useState<RouteOriginMode>("browser");
  const [mapOrigin, setMapOriginState] =
    useState<RouteRecommendationOrigin | null>(null);
  const [originSelectionError, setOriginSelectionError] = useState(false);
  const [isResolvingOrigin, setIsResolvingOrigin] = useState(false);
  const [isRequestInFlight, setIsRequestInFlight] = useState(false);
  const requestSequence = useRef(0);
  const requestGate = useRef(createRouteRequestGate());
  const draftEditedBeforeHydration = useRef(false);

  const setOptions = useCallback<React.Dispatch<React.SetStateAction<RouteOptions>>>((update) => {
    draftEditedBeforeHydration.current = true;
    setOptionsState(update);
  }, []);

  const setOriginMode = useCallback((mode: RouteOriginMode) => {
    setOriginModeState(mode);
    setOriginSelectionError(false);
  }, []);

  const setMapOrigin = useCallback((origin: RouteRecommendationOrigin) => {
    setMapOriginState(origin);
    setOriginSelectionError(false);
  }, []);

  const clearMapOrigin = useCallback(() => {
    setMapOriginState(null);
    setOriginSelectionError(false);
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
    ([, request]: readonly [string, RouteRecommendationSubmission]) =>
      fetchRouteRecommendation(request),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      onSuccess: () => {
        requestGate.current.finish();
        setIsRequestInFlight(false);
      },
      onError: () => {
        requestGate.current.finish();
        setIsRequestInFlight(false);
      },
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
    originMode,
    setOriginMode,
    mapOrigin,
    setMapOrigin,
    clearMapOrigin,
    originSelectionError,
    isResolvingOrigin,
    isRequestInFlight,
    requestRecommendation: async () => {
      if (originMode === "map" && !mapOrigin) {
        setOriginSelectionError(true);
        return;
      }

      if (!requestGate.current.start()) return;

      setIsRequestInFlight(true);
      setIsResolvingOrigin(originMode === "browser");

      let origin: RouteRecommendationOrigin | undefined;
      try {
        origin = await resolveRouteRequestOrigin(
          originMode,
          mapOrigin,
          resolveBrowserRouteOrigin,
        );
      } catch {
        origin = undefined;
      } finally {
        setIsResolvingOrigin(false);
      }

      requestSequence.current += 1;
      setRecommendationRequest(
        createRouteRecommendationSubmission(requestSequence.current, options, origin),
      );
    },
  };
}
