"use client";

import dynamic from "next/dynamic";
import type {
  OperationalRoute,
  OperationalRouteZoneKey,
} from "@/lib/route/route-operational";
import {
  getOperationalRouteLoopCount,
  removeOperationalRouteLoop,
  updateOperationalRouteZone,
} from "@/lib/route/route-operational";
import { CmmInput } from "@/components/ui/cmm-field";

const OperationalRouteMap = dynamic(
  () => import("./operational-route-map").then((module) => module.OperationalRouteMap),
  { ssr: false },
);

export function OperationalRouteEditor({
  operationalRoute,
  onChange,
}: {
  operationalRoute: OperationalRoute;
  onChange: (operationalRoute: OperationalRoute) => void;
}) {
  const updateZoneLabel = (zone: OperationalRouteZoneKey, label: string) => {
    onChange(updateOperationalRouteZone(operationalRoute, zone, { label: label.trim() || null }));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/60">
          Parcours opérationnel
        </p>
        <h3 className="mt-1 text-lg font-bold text-emerald-950">
          Ajuster le parcours prévu
        </h3>
        <p className="mt-1 text-xs leading-5 text-emerald-900/60">
          Cette copie mutable issue du planner peut changer sans modifier le snapshot historique.
          Elle décrit le parcours prévu, pas un parcours réellement observé ou une preuve GPS.
        </p>
      </div>

      <OperationalRouteMap operationalRoute={operationalRoute} />

      <div className="grid gap-3 md:grid-cols-3">
        {([
          ["departure", "Départ", operationalRoute.zones.departure.label],
          ["midpoint", "Mi-parcours", operationalRoute.zones.midpoint.label],
          ["arrival", "Arrivée", operationalRoute.zones.arrival.label],
        ] as const).map(([zone, label, value]) => (
          <label key={zone} className="space-y-1 text-xs font-semibold text-emerald-900/70">
            <span>{label}</span>
            <CmmInput
              value={value ?? ""}
              onChange={(event) => updateZoneLabel(zone, event.target.value)}
              placeholder="Zone optionnelle"
            />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-emerald-900/65">
          {getOperationalRouteLoopCount(operationalRoute) ?? 0} boucle(s) opérationnelle(s) conservée(s).
        </p>
        {operationalRoute.routes.length > 0 ? operationalRoute.routes.map((route) => (
          <div key={route.routeId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-white px-3 py-2">
            <div className="text-sm text-emerald-950">
              <span className="font-bold">Boucle {route.groupIndex}</span>
              <span className="ml-2 text-xs text-emerald-900/55">
                {route.geometry.coordinates.length} points · {route.plannerTechnicalStops.length} arrêts planner
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange(removeOperationalRouteLoop(operationalRoute, route.routeId))}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
            >
              Supprimer cette boucle
            </button>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Aucune boucle opérationnelle active. Le snapshot planner reste conservé pour la traçabilité.
          </p>
        )}
      </div>
    </section>
  );
}
