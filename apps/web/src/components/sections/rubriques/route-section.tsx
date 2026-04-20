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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      {/* GAUCHE : Paramètres et Assistances Proactives */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Paramètres du circuit
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
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
                className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
              Bénévoles
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
                className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
              Accessibilité
              <select
                value={constraints.accessibility}
                onChange={(event) =>
                  setConstraints((prev) => ({
                    ...prev,
                    accessibility: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-500"
              >
                <option value="standard">Standard</option>
                <option value="accessible">Accessible</option>
                <option value="strict">Strict</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
              Sécurité / Météo
              <select
                value={constraints.weather}
                onChange={(event) =>
                  setConstraints((prev) => ({
                    ...prev,
                    weather: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-500"
              >
                <option value="ok">Temps stable</option>
                <option value="rain">Pluie modérée</option>
                <option value="wind">Vent fort</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700 md:col-span-2">
              Arbitrage impact vs distance
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
                className="mt-2"
              />
              <span className="text-xs text-slate-500 mt-1">
                {constraints.impactVsDistance}% impact privilégié /{" "}
                {100 - constraints.impactVsDistance}% distance privilégiée
              </span>
            </label>
          </div>
        </div>

        {!isLoading && !error && data ? (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 shadow-sm">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="animate-pulse h-2 w-2 bg-cyan-600 rounded-full"></span>
              Assistant Proactif
            </h3>
            <p className="font-semibold">{data.proactiveAssistant.actNow}</p>
            <p className="mt-1 opacity-90">{data.proactiveAssistant.criticalNearby}</p>
            <p className="mt-1 opacity-90">{data.proactiveAssistant.mostUsefulAction}</p>
          </div>
        ) : null}

        {!isLoading && !error && data && data.proactiveAssistant.hotspots.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-700">
            <p className="font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Hotspots détectés dans le périmètre
            </p>
            <ul className="space-y-2">
              {data.proactiveAssistant.hotspots.slice(0, 3).map((hotspot) => (
                <li
                  key={`${hotspot.zoneLabel}-${hotspot.predictedDirtScore}`}
                  className="rounded-lg border border-amber-100 bg-amber-50/30 p-2"
                >
                  <p className="font-semibold text-slate-900">
                    {hotspot.zoneLabel} - urgence {hotspot.predictedDirtScore.toFixed(1)}/10
                  </p>
                  <p className="mt-1 text-slate-600">
                    Actions récentes: {hotspot.recentActions} | Spots: {hotspot.recentSpots} | Pression évent.: {hotspot.eventPressure.toFixed(1)}
                  </p>
                  <p className="mt-1 font-medium text-slate-700">{hotspot.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* DROITE : Itinéraire Calculé */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 rounded-xl border border-slate-200 bg-slate-50">
            <span className="animate-pulse">Calcul de la route optimale en cours...</span>
          </div>
        ) : null}
        
        {error ? (
          <div className="p-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            Impossible de calculer les points prioritaires. Vérifiez les paramètres de géolocalisation.
          </div>
        ) : null}
        
        {!isLoading && !error && picks.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm text-sm">
            <div>
              <p className="text-emerald-900 font-semibold uppercase tracking-wider text-xs opacity-80">Parcours estimé</p>
              <p className="text-xl font-bold text-emerald-950 mt-1">
                {totalKm.toFixed(2)} km <span className="opacity-40 px-1">|</span> {totalMinutes} min
              </p>
            </div>
            <div className="text-right">
              <p className="text-emerald-900 font-semibold uppercase tracking-wider text-xs opacity-80">Score IA global</p>
              <p className="text-xl font-bold text-emerald-950 mt-1">
                {data?.scoreBreakdown.global ?? 0}
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && data ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-2">Ajustements automatiques appliqués (Trade-offs)</p>
            <ul className="list-disc pl-5 space-y-1">
              {data.tradeoffs.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {data.tradeoffs.length === 0 && <li className="italic text-slate-400">Aucun ajustement majeur nécessaire.</li>}
            </ul>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <ol className="divide-y divide-slate-100">
              {picks.map((item, index) => (
                <li
                  key={item.id}
                  className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
                >
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="bg-slate-800 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]">{index + 1}</span>
                      {item.label}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded">
                      {item.priorityReason}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-xs font-medium text-slate-600 bg-slate-100 rounded px-2 py-1">
                      {Number(item.segmentKm || 0).toFixed(2)} km • {item.estimatedMinutes} min
                    </p>
                    {item.latitude !== null && item.longitude !== null ? (
                      <a
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition opacity-80 group-hover:opacity-100"
                        href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ouvrir GPS
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
              {picks.length === 0 ? (
                <li className="p-8 text-center text-sm text-slate-500 italic">
                  Aucun point de collecte ne correspond à vos critères actuels.
                </li>
              ) : null}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
