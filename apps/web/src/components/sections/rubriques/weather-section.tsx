"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import {
  buildInterventionWindows,
  evaluateWeatherRisk,
  OPERATIONAL_ZONES,
  zoneForArea,
} from "@/lib/weather/ops-weather";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { extractArrondissement, formatDateTimeShort, formatDateShort } from "@/components/sections/rubriques/helpers";



export function WeatherSection() {
  const [zoneMode, setZoneMode] = useState<"auto" | "manual">("auto");
  const [manualZoneId, setManualZoneId] = useState<string>(
    OPERATIONAL_ZONES[0]?.id ?? "centre",
  );
  const [activePeriod, setActivePeriod] = useState<"now" | "j13" | "j7">("now");

  const zonesActivity = useSWR(["section-weather-zone-activity"], () =>
    fetchMapActions({ status: "approved", days: 120, limit: 260 }),
  );

  const inferredZoneId = useMemo(() => {
    const counters = new Map<string, number>();
    for (const item of zonesActivity.data?.items ?? []) {
      const area = extractArrondissement(item.location_label || "");
      const zone = zoneForArea(area);
      if (!zone) {
        continue;
      }
      counters.set(zone.id, (counters.get(zone.id) ?? 0) + 1);
    }
    const inferred = [...counters.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    return inferred ?? OPERATIONAL_ZONES[0]?.id ?? "centre";
  }, [zonesActivity.data?.items]);

  const selectedZoneId = zoneMode === "auto" ? inferredZoneId : manualZoneId;

  const selectedZone = useMemo(
    () =>
      OPERATIONAL_ZONES.find((zone) => zone.id === selectedZoneId) ??
      OPERATIONAL_ZONES[0],
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
        daily:
          "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
      });
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${query.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("weather_unavailable");
      }
      return (await response.json()) as {
        current?: {
          temperature_2m?: number;
          precipitation?: number;
          wind_speed_10m?: number;
        };
        hourly?: {
          time?: string[];
          temperature_2m?: number[];
          precipitation?: number[];
          wind_speed_10m?: number[];
        };
        daily?: {
          time?: string[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          precipitation_sum?: number[];
          wind_speed_10m_max?: number[];
        };
      };
    },
    swrRecentViewOptions,
  );

  const hourlyPoints = useMemo(() => {
    const times = data?.hourly?.time ?? [];
    return times.map((time, index) => ({
      time,
      temperature: Number(data?.hourly?.temperature_2m?.[index] ?? 0),
      rain: Number(data?.hourly?.precipitation?.[index] ?? 0),
      wind: Number(data?.hourly?.wind_speed_10m?.[index] ?? 0),
    }));
  }, [
    data?.hourly?.precipitation,
    data?.hourly?.temperature_2m,
    data?.hourly?.time,
    data?.hourly?.wind_speed_10m,
  ]);

  const nowcasting = hourlyPoints.slice(0, 6);
  const windows = useMemo(
    () => buildInterventionWindows(hourlyPoints),
    [hourlyPoints],
  );

  const currentRisk = useMemo(() => {
    const point = nowcasting[0];
    return evaluateWeatherRisk({
      temperature: Number(
        data?.current?.temperature_2m ?? point?.temperature ?? 0,
      ),
      rain: Number(data?.current?.precipitation ?? point?.rain ?? 0),
      wind: Number(data?.current?.wind_speed_10m ?? point?.wind ?? 0),
    });
  }, [data, nowcasting]);

  const j13 = useMemo(() => {
    return (data?.daily?.time ?? []).slice(1, 4).map((day, index) => ({
      day,
      min: Number(data?.daily?.temperature_2m_min?.[index + 1] ?? 0),
      max: Number(data?.daily?.temperature_2m_max?.[index + 1] ?? 0),
      rain: Number(data?.daily?.precipitation_sum?.[index + 1] ?? 0),
      wind: Number(data?.daily?.wind_speed_10m_max?.[index + 1] ?? 0),
    }));
  }, [
    data?.daily?.precipitation_sum,
    data?.daily?.temperature_2m_max,
    data?.daily?.temperature_2m_min,
    data?.daily?.time,
    data?.daily?.wind_speed_10m_max,
  ]);

  const j7 = useMemo(() => {
    const times = data?.daily?.time ?? [];
    const index = times.length > 7 ? 7 : Math.max(0, times.length - 1);
    return {
      day: times[index],
      min: Number(data?.daily?.temperature_2m_min?.[index] ?? 0),
      max: Number(data?.daily?.temperature_2m_max?.[index] ?? 0),
      rain: Number(data?.daily?.precipitation_sum?.[index] ?? 0),
      wind: Number(data?.daily?.wind_speed_10m_max?.[index] ?? 0),
    };
  }, [
    data?.daily?.precipitation_sum,
    data?.daily?.temperature_2m_max,
    data?.daily?.temperature_2m_min,
    data?.daily?.time,
    data?.daily?.wind_speed_10m_max,
  ]);

  const riskTone =
    currentRisk.level === "rouge"
      ? "border-rose-300 bg-rose-50 text-rose-900"
      : currentRisk.level === "orange"
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-emerald-300 bg-emerald-50 text-emerald-900";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Zone operationnelle
            <select
              value={selectedZone.id}
              onChange={(event) => {
                setZoneMode("manual");
                setManualZoneId(event.target.value);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            >
              {OPERATIONAL_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setZoneMode("auto")}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Auto-detection zone
          </button>
          <p className="text-xs text-slate-500">
            Mode {zoneMode === "auto" ? "auto" : "manuel"} - zone detectee:{" "}
            {OPERATIONAL_ZONES.find((zone) => zone.id === inferredZoneId)
              ?.label ?? "n/a"}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Horizon utile: nowcasting 0-6h, prevision J+1 a J+3, apercu J+7.
          Seuils EPI explicites pluie/vent/chaleur/froid.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement meteo...</p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">
          Meteo indisponible, verifier avant sortie terrain.
        </p>
      ) : null}
      {!isLoading && !error ? (
        <>
          <article className={`rounded-xl border p-4 ${riskTone}`}>
            <h3 className="text-sm font-semibold">
              Lecture decisionnelle meteo
            </h3>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide">
                  Niveau de risque
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {currentRisk.level.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">
                  Equipement conseille
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {currentRisk.equipment.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">
                  Contraintes intervention
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {currentRisk.constraints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm">
              Raisons: {currentRisk.reasons.join(", ")}.
            </p>
          </article>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActivePeriod("now")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${activePeriod === "now" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              0-6h
            </button>
            <button
              onClick={() => setActivePeriod("j13")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${activePeriod === "j13" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              J+1 a J+3
            </button>
            <button
              onClick={() => setActivePeriod("j7")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${activePeriod === "j7" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              J+7
            </button>
          </div>

          {activePeriod === "now" ? (
            <div className="grid gap-2 md:grid-cols-3">
              {nowcasting.map((point) => {
                const risk = evaluateWeatherRisk({
                  temperature: point.temperature,
                  rain: point.rain,
                  wind: point.wind,
                });
                return (
                  <article
                    key={point.time}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <p className="font-semibold">
                      {formatDateTimeShort(point.time)}
                    </p>
                    <p>
                      {point.temperature.toFixed(1)} C - pluie{" "}
                      {point.rain.toFixed(1)} mm/h - vent{" "}
                      {point.wind.toFixed(0)} km/h
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Risque {risk.level}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}

          {activePeriod === "j13" ? (
            <div className="grid gap-2 md:grid-cols-3">
              {j13.map((day) => {
                const risk = evaluateWeatherRisk({
                  temperature: day.max,
                  rain: day.rain / 3,
                  wind: day.wind,
                });
                return (
                  <article
                    key={day.day}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <p className="font-semibold">{formatDateShort(day.day)}</p>
                    <p>
                      {day.min.toFixed(1)} / {day.max.toFixed(1)} C - pluie{" "}
                      {day.rain.toFixed(1)} mm - vent max {day.wind.toFixed(0)}{" "}
                      km/h
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Risque {risk.level}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}

          {activePeriod === "j7" ? (
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">
                Apercu J+7 ({formatDateShort(j7.day)})
              </p>
              <p className="mt-1">
                {j7.min.toFixed(1)} / {j7.max.toFixed(1)} C - pluie{" "}
                {j7.rain.toFixed(1)} mm - vent max {j7.wind.toFixed(0)} km/h
              </p>
            </article>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Fenetres recommandees d&apos;intervention
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {windows.recommended.slice(0, 5).map((window) => (
                  <li
                    key={`${window.from}-${window.to}`}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-2"
                  >
                    {formatDateTimeShort(window.from)} -{" "}
                    {formatDateTimeShort(window.to)}: {window.reason}
                  </li>
                ))}
                {windows.recommended.length === 0 ? (
                  <li>Aucune fenetre recommandee detectee.</li>
                ) : null}
              </ul>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Fenetres a eviter
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {windows.avoid.slice(0, 5).map((window) => (
                  <li
                    key={`${window.from}-${window.to}`}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2"
                  >
                    {formatDateTimeShort(window.from)} -{" "}
                    {formatDateTimeShort(window.to)}: {window.reason}
                  </li>
                ))}
                {windows.avoid.length === 0 ? (
                  <li>Aucune fenetre critique detectee.</li>
                ) : null}
              </ul>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Regles EPI explicites
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Pluie: orange si &gt;=0.8 mm/h, rouge si &gt;=3 mm/h.</li>
              <li>Vent: orange si &gt;=30 km/h, rouge si &gt;=45 km/h.</li>
              <li>Chaleur: orange si &gt;=28 C, rouge si &gt;=33 C.</li>
              <li>Froid: orange si &lt;=4 C, rouge si &lt;=0 C.</li>
            </ul>
          </article>
        </>
      ) : null}
    </div>
  );
}
