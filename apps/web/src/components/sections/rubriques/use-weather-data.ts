import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import {
  buildInterventionWindows,
  evaluateWeatherRisk,
  OPERATIONAL_ZONES,
  zoneForArea,
} from "@/lib/weather/ops-weather";
import type { OperationalZone } from "@/lib/weather/ops-weather";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { extractArrondissement } from "@/components/sections/rubriques/helpers";
import type { OpenMeteoResponse, WeatherPoint, WeatherDay, WeatherPeriod } from "./weather-types";

const FALLBACK_ZONE: OperationalZone = {
  id: "centre",
  label: "Paris centre",
  latitude: 48.8593,
  longitude: 2.347,
  coveredAreas: [],
};

export function useWeatherData() {
  const [zoneMode, setZoneMode] = useState<"auto" | "manual">("auto");
  const [manualZoneId, setManualZoneId] = useState<string>(
    OPERATIONAL_ZONES[0]?.id ?? "centre",
  );
  const [activePeriod, setActivePeriod] = useState<WeatherPeriod>("now");

  const zonesActivity = useSWR(["section-weather-zone-activity"], () =>
    fetchMapActions({ status: "approved", days: 120, limit: 260 }),
  );

  const inferredZoneId = useMemo(() => {
    const counters = new Map<string, number>();
    for (const item of zonesActivity.data?.items ?? []) {
      const area = extractArrondissement(item.location_label || "");
      const zone = zoneForArea(area);
      if (!zone) continue;
      counters.set(zone.id, (counters.get(zone.id) ?? 0) + 1);
    }
    const inferred = [...counters.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return inferred ?? OPERATIONAL_ZONES[0]?.id ?? "centre";
  }, [zonesActivity.data?.items]);

  const selectedZoneId = zoneMode === "auto" ? inferredZoneId : manualZoneId;

  const selectedZone = useMemo(
    () => OPERATIONAL_ZONES.find((zone) => zone.id === selectedZoneId) ?? OPERATIONAL_ZONES[0] ?? FALLBACK_ZONE,
    [selectedZoneId],
  );

  const { data, isLoading, error } = useSWR(
    ["section-weather-zone", selectedZone.id],
    async () => {
      const query = new URLSearchParams({
        latitude: String(selectedZone.latitude),
        longitude: String(selectedZone.longitude),
        timezone: "Europe/Paris",
        forecast_days: "8",
        current: "temperature_2m,precipitation,wind_speed_10m",
        hourly: "temperature_2m,precipitation,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("weather_unavailable");
      return (await response.json()) as OpenMeteoResponse;
    },
    swrRecentViewOptions,
  );

  const hourlyPoints = useMemo<WeatherPoint[]>(() => {
    const times = data?.hourly?.time ?? [];
    return times.map((time, index) => ({
      time,
      temperature: Number(data?.hourly?.temperature_2m?.[index] ?? 0),
      rain: Number(data?.hourly?.precipitation?.[index] ?? 0),
      wind: Number(data?.hourly?.wind_speed_10m?.[index] ?? 0),
    }));
  }, [data]);

  const nowcasting = useMemo(() => hourlyPoints.slice(0, 6), [hourlyPoints]);
  const windows = useMemo(() => buildInterventionWindows(hourlyPoints), [hourlyPoints]);

  const currentRisk = useMemo(() => {
    const point = nowcasting[0];
    return evaluateWeatherRisk({
      temperature: Number(data?.current?.temperature_2m ?? point?.temperature ?? 0),
      rain: Number(data?.current?.precipitation ?? point?.rain ?? 0),
      wind: Number(data?.current?.wind_speed_10m ?? point?.wind ?? 0),
    });
  }, [data, nowcasting]);

  const j13 = useMemo<WeatherDay[]>(() => {
    return (data?.daily?.time ?? []).slice(1, 4).map((day, index) => ({
      day,
      min: Number(data?.daily?.temperature_2m_min?.[index + 1] ?? 0),
      max: Number(data?.daily?.temperature_2m_max?.[index + 1] ?? 0),
      rain: Number(data?.daily?.precipitation_sum?.[index + 1] ?? 0),
      wind: Number(data?.daily?.wind_speed_10m_max?.[index + 1] ?? 0),
    }));
  }, [data]);

  const j7 = useMemo(() => {
    const times = data?.daily?.time ?? [];
    const index = times.length > 7 ? 7 : Math.max(0, times.length - 1);
    return {
      day: times[index] ?? "",
      min: Number(data?.daily?.temperature_2m_min?.[index] ?? 0),
      max: Number(data?.daily?.temperature_2m_max?.[index] ?? 0),
      wind: Number(data?.daily?.wind_speed_10m_max?.[index] ?? 0),
    };
  }, [data]);

  return {
    zoneMode,
    setZoneMode,
    manualZoneId,
    setManualZoneId,
    selectedZone,
    inferredZoneId,
    activePeriod,
    setActivePeriod,
    data,
    isLoading,
    error,
    nowcasting,
    windows,
    currentRisk,
    j13,
    j7,
  };
}
