"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";


export function RouteSection() {
  const [constraints, setConstraints] = useState({
    availableMinutes: 180,
    volunteers: 4,
    accessibility: "standard",
    security: "standard",
    weather: "ok",
    impactVsDistance: 65,
    maxStops: 6,
  });

  const { data, isLoading, error } = useSWR(
    ["section-route", JSON.stringify(constraints)],
    async () => {
      const response = await fetch("/api/route/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(constraints),
      });
      if (!response.ok) {
        throw new Error("Route indisponible");
      }
      return (await response.json()) as {
        stops: Array<{
          id: string;
          label: string;
          latitude: number;
          longitude: number;
          segmentKm: number;
          estimatedMinutes: number;
          priorityReason: string;
          score: number;
        }>;
        scoreBreakdown: {
          impact: number;
          distance: number;
          constraints: number;
          global: number;
        };
        constraintsApplied: Record<string, unknown>;
        tradeoffs: string[];
        proactiveAssistant: {
          actNow: string;
          criticalNearby: string;
          mostUsefulAction: string;
          predictedDirtyZones: string[];
          eventAnticipation: string[];
          hotspots: Array<{
            zoneLabel: string;
            predictedDirtScore: number;
            recentActions: number;
            recentSpots: number;
            eventPressure: number;
            distanceKm: number | null;
            reason: string;
          }>;
        };
      };
    },
  );

  const picks = useMemo(() => data?.stops ?? [], [data?.stops]);
  const totalKm = useMemo(
    () => picks.reduce((acc, item) => acc + Number(item.segmentKm || 0), 0),
    [picks],
  );
  const totalMinutes = useMemo(
    () =>
      picks.reduce((acc, item) => acc + Number(item.estimatedMinutes || 0), 0),
    [picks],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Temps dispo (min)
          <input
            type="number"
            min={30}
            max={600}
            value={constraints.availableMinutes}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                availableMinutes: Number(event.target.value || 180),
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Benevoles
          <input
            type="number"
            min={1}
            max={200}
            value={constraints.volunteers}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                volunteers: Number(event.target.value || 4),
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Accessibilite
          <select
            value={constraints.accessibility}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                accessibility: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="standard">Standard</option>
            <option value="accessible">Accessible</option>
            <option value="strict">Strict</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Securite
          <select
            value={constraints.security}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                security: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="standard">Standard</option>
            <option value="renforced">Renforcee</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Meteo
          <select
            value={constraints.weather}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                weather: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="ok">Stable</option>
            <option value="rain">Pluie</option>
            <option value="wind">Vent</option>
            <option value="heat">Chaleur</option>
            <option value="cold">Froid</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Arbitrage impact/distance
          <input
            type="range"
            min={0}
            max={100}
            value={constraints.impactVsDistance}
            onChange={(event) =>
              setConstraints((prev) => ({
                ...prev,
                impactVsDistance: Number(event.target.value || 65),
              }))
            }
          />
          <span className="text-xs text-slate-500">
            {constraints.impactVsDistance}% impact /{" "}
            {100 - constraints.impactVsDistance}% distance
          </span>
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Calcul de l&apos;itineraire...</p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">
          Impossible de calculer les points prioritaires.
        </p>
      ) : null}
      {!isLoading && !error && picks.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Distance estimee du circuit:{" "}
          <span className="font-semibold">{totalKm.toFixed(2)} km</span> - temps
          estime <span className="font-semibold">{totalMinutes} min</span> -
          score global{" "}
          <span className="font-semibold">
            {data?.scoreBreakdown.global ?? 0}
          </span>
          .
        </div>
      ) : null}

      {!isLoading && !error && data ? (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
          <p className="font-semibold">{data.proactiveAssistant.actNow}</p>
          <p className="mt-1">{data.proactiveAssistant.criticalNearby}</p>
          <p className="mt-1">{data.proactiveAssistant.mostUsefulAction}</p>
        </div>
      ) : null}

      {!isLoading && !error && data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Trade-offs appliques</p>
          <ul className="mt-1 list-disc pl-5">
            {data.tradeoffs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      data &&
      (data.proactiveAssistant.predictedDirtyZones.length > 0 ||
        data.proactiveAssistant.eventAnticipation.length > 0) ? (
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">
              Prediction des zones sales
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {data.proactiveAssistant.predictedDirtyZones.length === 0 ? (
                <li>Pas de signal fort sur la fenetre recente.</li>
              ) : (
                data.proactiveAssistant.predictedDirtyZones.map((line) => (
                  <li key={line}>{line}</li>
                ))
              )}
            </ul>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">
              Anticipation des evenements et flux
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {data.proactiveAssistant.eventAnticipation.length === 0 ? (
                <li>Aucun evenement majeur detecte sur les 3 prochaines semaines.</li>
              ) : (
                data.proactiveAssistant.eventAnticipation.map((line) => (
                  <li key={line}>{line}</li>
                ))
              )}
            </ul>
          </article>
        </div>
      ) : null}

      {!isLoading && !error && data && data.proactiveAssistant.hotspots.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">
            Zones critiques proches de toi
          </p>
          <ul className="mt-2 space-y-2">
            {data.proactiveAssistant.hotspots.slice(0, 3).map((hotspot) => (
              <li
                key={`${hotspot.zoneLabel}-${hotspot.predictedDirtScore}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <p className="font-semibold text-slate-900">
                  {hotspot.zoneLabel} - risque {hotspot.predictedDirtScore.toFixed(1)}
                </p>
                <p className="mt-1 text-slate-600">
                  Actions {hotspot.recentActions}, spots {hotspot.recentSpots}, pression evenement{" "}
                  {hotspot.eventPressure.toFixed(1)}
                  {hotspot.distanceKm !== null
                    ? `, distance estimee ${hotspot.distanceKm.toFixed(1)} km`
                    : ""}
                  .
                </p>
                <p className="mt-1 text-slate-600">{hotspot.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <ol className="space-y-2">
          {picks.map((item, index) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <p className="font-semibold">
                Etape {index + 1}: {item.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Segment {Number(item.segmentKm || 0).toFixed(2)} km - temps
                estime {item.estimatedMinutes} min - score {item.score}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Pourquoi prioritaire: {item.priorityReason}
              </p>
              {item.latitude !== null && item.longitude !== null ? (
                <a
                  className="mt-1 inline-block text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir dans Google Maps
                </a>
              ) : null}
            </li>
          ))}
          {picks.length === 0 ? (
            <li className="text-sm text-slate-600">
              Aucun point disponible sur la periode.
            </li>
          ) : null}
        </ol>
      ) : null}
    </div>
  );
}
