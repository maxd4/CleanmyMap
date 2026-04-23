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
import { useSitePreferences } from "@/components/ui/site-preferences-provider";



export function WeatherSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      {/* GAUCHE : Paramètres et Alertes */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
            {fr ? "Zone opérationnelle" : "Operational zone"}
            <select
              value={selectedZone.id}
              onChange={(event) => {
                setZoneMode("manual");
                setManualZoneId(event.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            >
              {OPERATIONAL_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <button
              onClick={() => setZoneMode("auto")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                zoneMode === "auto"
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {fr ? "Auto-détection" : "Auto-detect"}
            </button>
            <p className="text-[10px] text-slate-500 text-right">
              {fr ? "Zone détectée" : "Detected zone"}: <span className="font-semibold">{OPERATIONAL_ZONES.find((zone) => zone.id === inferredZoneId)?.label ?? "n/a"}</span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">{fr ? "Chargement météo..." : "Loading weather..."}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
            {fr ? "Météo indisponible, vérifier l'horizon avant sortie terrain." : "Weather unavailable, check the horizon before field work."}
          </p>
        ) : null}

        {!isLoading && !error ? (
          <>
            <article className={`rounded-xl border shadow-sm p-4 ${riskTone}`}>
              <h3 className="text-sm font-semibold uppercase tracking-wide">
                {fr ? "Lecture décisionnelle" : "Decision reading"}
              </h3>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-3 border-emerald-900/10">
                  <span className="text-xs font-semibold opacity-70 uppercase">{fr ? "Niveau de risque" : "Risk level"}</span>
                  <span className="text-2xl font-bold">{currentRisk.level.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold opacity-70 uppercase">{fr ? "Équipement conseillé" : "Recommended gear"}</p>
                  <ul className="mt-1 list-disc pl-5 text-sm opacity-90 font-medium">
                    {currentRisk.equipment.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold opacity-70 uppercase">{fr ? "Contraintes" : "Constraints"}</p>
                  <ul className="mt-1 list-disc pl-5 text-sm opacity-90 font-medium">
                    {currentRisk.constraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-1 border-t pt-3 border-emerald-900/10 text-xs font-medium opacity-80">
                  {fr ? "Raisons" : "Reasons"}: {currentRisk.reasons.join(", ")}.
                </div>
              </div>
            </article>

            <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-700">
              <summary className="cursor-pointer font-semibold text-slate-900 text-sm">
                {fr ? "Méthodologie météo" : "Weather methodology"}
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-sm text-slate-600">
                  Lecture opérationnelle fondée sur Open-Meteo, avec seuils de décision
                  conservés ici pour ne pas encombrer l&apos;alerte principale.
                </p>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-2">Règles EPI</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>Pluie: <span className="font-medium">orange</span> ≥ 0.8 mm/h, <span className="font-medium text-rose-700">rouge</span> ≥ 3 mm/h.</li>
                    <li>Vent: <span className="font-medium">orange</span> ≥ 30 km/h, <span className="font-medium text-rose-700">rouge</span> ≥ 45 km/h.</li>
                    <li>Chaleur: <span className="font-medium">orange</span> ≥ 28°C, <span className="font-medium text-rose-700">rouge</span> ≥ 33°C.</li>
                    <li>Froid: <span className="font-medium">orange</span> ≤ 4°C, <span className="font-medium text-rose-700">rouge</span> ≤ 0°C.</li>
                  </ul>
                </div>
              </div>
            </details>
          </>
        ) : null}
      </div>

      {/* DROITE : Data et Prévisions */}
      <div className="space-y-4">
        {!isLoading && !error ? (
          <>
            <div className="bg-slate-100 p-1.5 flex gap-1 rounded-lg w-fit">
              <button
                onClick={() => setActivePeriod("now")}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activePeriod === "now" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                0-6h (Nowcasting)
              </button>
              <button
                onClick={() => setActivePeriod("j13")}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activePeriod === "j13" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                J+1 à J+3
              </button>
              <button
                onClick={() => setActivePeriod("j7")}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activePeriod === "j7" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Horizon J+7
              </button>
            </div>

            {activePeriod === "now" ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {nowcasting.map((point) => {
                  const risk = evaluateWeatherRisk({
                    temperature: point.temperature,
                    rain: point.rain,
                    wind: point.wind,
                  });
                  return (
                    <article key={point.time} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-200 transition">
                      <p className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-2">
                        {formatDateTimeShort(point.time)}
                      </p>
                      <ul className="text-xs font-medium text-slate-600 space-y-1">
                        <li>Température: {point.temperature.toFixed(1)}°C</li>
                        <li>Pluie: {point.rain.toFixed(1)} mm/h</li>
                        <li>Vent: {point.wind.toFixed(0)} km/h</li>
                      </ul>
                      <p className={`mt-3 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${risk.level === 'rouge' ? 'bg-rose-100 text-rose-700' : risk.level === 'orange' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        Risque {risk.level}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {activePeriod === "j13" ? (
              <div className="grid gap-3 md:grid-cols-3">
                {j13.map((day) => {
                  const risk = evaluateWeatherRisk({
                    temperature: day.max,
                    rain: day.rain / 3,
                    wind: day.wind,
                  });
                  return (
                    <article key={day.day} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-2">{formatDateShort(day.day)}</p>
                      <ul className="text-xs font-medium text-slate-600 space-y-1">
                        <li>Min/Max: {day.min.toFixed(1)} / {day.max.toFixed(1)}°C</li>
                        <li>Pluie (total): {day.rain.toFixed(1)} mm</li>
                        <li>Rafales: {day.wind.toFixed(0)} km/h</li>
                      </ul>
                      <p className={`mt-3 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${risk.level === 'rouge' ? 'bg-rose-100 text-rose-700' : risk.level === 'orange' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        Risque {risk.level}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {activePeriod === "j7" ? (
              <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 shadow-sm max-w-sm">
                <p className="font-semibold uppercase tracking-wider text-xs opacity-80 mb-1">
                  Aperçu probabiliste à J+7
                </p>
                <p className="text-lg font-bold">{formatDateShort(j7.day)}</p>
                <ul className="mt-3 text-sm font-medium space-y-1">
                  <li>Temperatures: {j7.min.toFixed(1)} / {j7.max.toFixed(1)}°C</li>
                  <li>Précipitations: {j7.rain.toFixed(1)} mm</li>
                  <li>Vent max: {j7.wind.toFixed(0)} km/h</li>
                </ul>
              </article>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-slate-100 mt-2">
              <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-emerald-900 mb-3">
                  Fenêtres d'intervention recommandées
                </h3>
                <ul className="space-y-2 text-sm text-emerald-800">
                  {windows.recommended.slice(0, 5).map((window) => (
                    <li key={`${window.from}-${window.to}`} className="flex flex-col rounded bg-white p-2 border border-emerald-100">
                      <span className="font-semibold text-xs text-emerald-700 uppercase tracking-widest">{formatDateTimeShort(window.from)} <span className="opacity-50">à</span> {formatDateTimeShort(window.to)}</span>
                      <span className="text-xs mt-1 font-medium">{window.reason}</span>
                    </li>
                  ))}
                  {windows.recommended.length === 0 ? (
                    <li className="text-xs font-medium text-emerald-700/70 italic">Aucune fenêtre stable détectée en Nowcast.</li>
                  ) : null}
                </ul>
              </article>
              <article className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-rose-900 mb-3">
                  Fenêtres critiques à éviter
                </h3>
                <ul className="space-y-2 text-sm text-rose-800">
                  {windows.avoid.slice(0, 5).map((window) => (
                    <li key={`${window.from}-${window.to}`} className="flex flex-col rounded bg-white p-2 border border-rose-100">
                      <span className="font-semibold text-xs text-rose-700 uppercase tracking-widest">{formatDateTimeShort(window.from)} <span className="opacity-50">à</span> {formatDateTimeShort(window.to)}</span>
                      <span className="text-xs mt-1 font-medium">{window.reason}</span>
                    </li>
                  ))}
                  {windows.avoid.length === 0 ? (
                    <li className="text-xs font-medium text-rose-700/70 italic">Aucune alerte rouge imminente.</li>
                  ) : null}
                </ul>
              </article>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
