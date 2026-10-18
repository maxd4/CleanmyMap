"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPlannerWeatherRequest,
  fetchPlannerWeatherContext,
  isPlannerWeatherContextCompatible,
  PLANNER_WEATHER_SNAPSHOT_VERSION,
  type PlannerWeatherContext,
  type PlannerWeatherContextRequest,
} from "@/lib/weather/planner-weather";
import { WEATHER_OPERATIONAL_RULE_VERSION } from "@/lib/weather/ops-weather";
import type { ActionWeatherState } from "@/lib/actions/action-preparation-checklist";

export type ActionPreparationWeatherInput = {
  contextId?: string | null;
  request?: PlannerWeatherContextRequest | null;
  initialWeatherContext?: PlannerWeatherContext | null;
};

type WeatherState = {
  requestKey: string | null;
  state: ActionWeatherState;
  context: PlannerWeatherContext | null;
};

function requestKey(request: PlannerWeatherContextRequest | null | undefined, contextId?: string | null): string | null {
  if (!request) return null;
  return [
    contextId ?? "",
    PLANNER_WEATHER_SNAPSHOT_VERSION,
    WEATHER_OPERATIONAL_RULE_VERSION,
    request.latitude,
    request.longitude,
    request.scheduledStartAt ?? "",
    request.scheduledEndAt ?? "",
  ].join("|");
}

export function createActionPreparationWeatherRequest(fields: {
  actionDate: unknown;
  scheduledStartTime: unknown;
  scheduledEndTime: unknown;
  latitude: unknown;
  longitude: unknown;
  now?: Date;
}): PlannerWeatherContextRequest | null {
  return buildPlannerWeatherRequest(fields);
}

export function useActionPreparationWeather({
  contextId = null,
  request = null,
  initialWeatherContext = null,
}: ActionPreparationWeatherInput): {
  weatherContext: PlannerWeatherContext | null;
  weatherRequest: PlannerWeatherContextRequest | null;
  weatherState: ActionWeatherState;
  requestWeather: () => Promise<void>;
} {
  const key = useMemo(() => requestKey(request, contextId), [contextId, request]);
  const [state, setState] = useState<WeatherState>({ requestKey: null, state: "idle", context: null });
  const requestVersion = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<{ requestKey: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    requestVersion.current += 1;
  }, [key]);

  const requestWeather = useCallback(async () => {
    const currentKey = key;
    const currentRequest = request;
    if (currentKey && inFlightRef.current?.requestKey === currentKey) return inFlightRef.current.promise;
    if (currentKey && state.requestKey === currentKey && state.state === "success" && state.context && currentRequest && isPlannerWeatherContextCompatible(state.context, currentRequest)) return;
    const version = ++requestVersion.current;
    abortRef.current?.abort();

    if (!currentRequest || !currentKey) {
      setState({ requestKey: currentKey, state: "unavailable", context: null });
      return;
    }

    if (initialWeatherContext && isPlannerWeatherContextCompatible(initialWeatherContext, currentRequest)) {
      setState({ requestKey: currentKey, state: "success", context: initialWeatherContext });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ requestKey: currentKey, state: "loading", context: null });
    const promise = (async () => {
      try {
        const context = await fetchPlannerWeatherContext({
          ...currentRequest,
          client: {
            fetcher: (input, init) => fetch(input, { ...init, signal: controller.signal }),
          },
        });
        if (version !== requestVersion.current) return;
        setState({
          requestKey: currentKey,
          state: context.status === "available" ? "success" : "unavailable",
          context: context.status === "available" ? context : null,
        });
      } catch {
        if (version === requestVersion.current) setState({ requestKey: currentKey, state: "error", context: null });
      } finally {
        if (version === requestVersion.current) abortRef.current = null;
      }
    })();
    inFlightRef.current = { requestKey: currentKey, promise };
    try {
      await promise;
    } finally {
      if (inFlightRef.current?.promise === promise) inFlightRef.current = null;
    }
  }, [initialWeatherContext, key, request, state]);

  const currentState = state.requestKey === key
    ? state
    : { requestKey: key, state: "idle" as const, context: null };
  return {
    weatherContext: currentState.context,
    weatherRequest: request,
    weatherState: currentState.state,
    requestWeather,
  };
}
