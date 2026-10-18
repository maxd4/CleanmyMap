"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildPlannerWeatherRequest,
  fetchPlannerWeatherContext,
  type PlannerWeatherContext,
  type PlannerWeatherContextRequest,
} from "@/lib/weather/planner-weather";

type PreparationWeatherFields = {
  actionDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  latitude: string;
  longitude: string;
};

export function useActionPreparationWeather(fields: PreparationWeatherFields): {
  weatherContext: PlannerWeatherContext | null;
  weatherRequest: PlannerWeatherContextRequest | null;
  weatherLoading: boolean;
} {
  const {
    actionDate,
    latitude,
    longitude,
    scheduledEndTime,
    scheduledStartTime,
  } = fields;
  const weatherRequest = useMemo(
    () => buildPlannerWeatherRequest({
      actionDate,
      latitude,
      longitude,
      scheduledEndTime,
      scheduledStartTime,
    }),
    [actionDate, latitude, longitude, scheduledEndTime, scheduledStartTime],
  );
  const requestKey = weatherRequest
    ? [weatherRequest.latitude, weatherRequest.longitude, weatherRequest.scheduledStartAt, weatherRequest.scheduledEndAt].join("|")
    : null;
  const [state, setState] = useState<{
    requestKey: string | null;
    weatherContext: PlannerWeatherContext | null;
    loading: boolean;
  }>({ requestKey: null, weatherContext: null, loading: false });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!weatherRequest || !requestKey) return () => controller.abort();

    void fetchPlannerWeatherContext({
      ...weatherRequest,
      client: {
        fetcher: (input, init) => fetch(input, { ...init, signal: controller.signal }),
      },
    }).then((context) => {
      if (active) {
        setState({
          requestKey,
          weatherContext: context.status === "available" ? context : null,
          loading: false,
        });
      }
    }).catch(() => {
      if (active) setState({ requestKey, weatherContext: null, loading: false });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey, weatherRequest]);

  return {
    weatherContext: state.requestKey === requestKey ? state.weatherContext : null,
    weatherRequest,
    weatherLoading: Boolean(weatherRequest) && (state.requestKey !== requestKey || state.loading),
  };
}
