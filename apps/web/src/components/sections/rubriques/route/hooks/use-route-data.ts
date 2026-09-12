"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import useSWR from "swr";
import type {
  RouteOptions,
  RouteRecommendationOrigin,
  RouteResponse,
  RouteOriginMode,
  RoutePlanningMode,
} from "../route-types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  DEFAULT_ROUTE_OPTIONS,
  ROUTE_DRAFT_STORAGE_KEY,
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

type RouteDraftSnapshot = {
  options: RouteOptions;
  hydrated: boolean;
};

const serverRouteDraftSnapshot: RouteDraftSnapshot = {
  options: { ...DEFAULT_ROUTE_OPTIONS },
  hydrated: false,
};
let cachedRouteDraftRaw: string | null | undefined;
let cachedRouteDraftSnapshot = serverRouteDraftSnapshot;

function readRouteDraftStorage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function getClientRouteDraftSnapshot(): RouteDraftSnapshot {
  const storage = readRouteDraftStorage();
  let raw: string | null = null;
  try {
    raw = storage?.getItem(ROUTE_DRAFT_STORAGE_KEY) ?? null;
  } catch {
    raw = null;
  }

  if (raw === cachedRouteDraftRaw && cachedRouteDraftSnapshot !== serverRouteDraftSnapshot) {
    return cachedRouteDraftSnapshot;
  }

  cachedRouteDraftRaw = raw;
  cachedRouteDraftSnapshot = {
    options: readRouteDraftOptions(storage),
    hydrated: true,
  };
  return cachedRouteDraftSnapshot;
}

function subscribeToRouteDraft(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ROUTE_DRAFT_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function useRouteData() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const [optionsState, setOptionsState] = useState<RouteOptions>(() => ({
    ...DEFAULT_ROUTE_OPTIONS,
  }));
  const routeDraftSnapshot = useSyncExternalStore(
    subscribeToRouteDraft,
    getClientRouteDraftSnapshot,
    () => serverRouteDraftSnapshot,
  );
  const [recommendationRequest, setRecommendationRequest] =
    useState<RouteRecommendationSubmission | null>(null);
  const [planningMode, setPlanningModeState] = useState<RoutePlanningMode>({ type: "free" });
  const [originMode, setOriginModeState] = useState<RouteOriginMode>("browser");
  const [mapOrigin, setMapOriginState] =
    useState<RouteRecommendationOrigin | null>(null);
  const [originSelectionError, setOriginSelectionError] = useState(false);
  const [isResolvingOrigin, setIsResolvingOrigin] = useState(false);
  const [isRequestInFlight, setIsRequestInFlight] = useState(false);
  const requestSequence = useRef(0);
  const requestGate = useRef(createRouteRequestGate());
  const [draftEditedBeforeHydration, setDraftEditedBeforeHydration] = useState(false);

  const options = routeDraftSnapshot.hydrated && !draftEditedBeforeHydration
    ? routeDraftSnapshot.options
    : optionsState;
  const isDraftHydrated = routeDraftSnapshot.hydrated;

  const setOptions = useCallback<React.Dispatch<React.SetStateAction<RouteOptions>>>((update) => {
    const shouldApplyHydratedDraft =
      routeDraftSnapshot.hydrated && !draftEditedBeforeHydration;
    const baseOptions = shouldApplyHydratedDraft ? routeDraftSnapshot.options : optionsState;
    setDraftEditedBeforeHydration(true);
    setOptionsState(() =>
      typeof update === "function" ? update(baseOptions) : update,
    );
  }, [draftEditedBeforeHydration, optionsState, routeDraftSnapshot]);

  const setOriginMode = useCallback((mode: RouteOriginMode) => {
    setOriginModeState(mode);
    setOriginSelectionError(false);
  }, []);

  const setPlanningMode = useCallback((mode: RoutePlanningMode) => {
    setPlanningModeState(mode.type === "event-centered" ? { ...mode } : { type: "free" });
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
    if (!isDraftHydrated) return;

    writeRouteDraftOptions(readRouteDraftStorage(), options);
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

  const serviceMinutes = data?.serviceMinutesEstimate ?? null;
  const operationalTotalMinutes = data?.totalMinutesEstimate ?? null;

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
    serviceMinutes,
    operationalTotalMinutes,
    hasData,
    hasRoute,
    fr,
    recommendationRequested: recommendationRequest !== null,
    planningMode,
    setPlanningMode,
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
        createRouteRecommendationSubmission(
          requestSequence.current,
          options,
          origin,
          planningMode,
        ),
      );
    },
  };
}
