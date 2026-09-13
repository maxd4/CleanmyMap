"use client";

import dynamic from "next/dynamic";
import type { ActionDrawing } from "@/lib/actions/types";
import type { ActualRoute, ActualRouteZoneKey } from "@/lib/route/route-actual";
import {
  buildActualRouteGeometryFromDrawing,
  getActualRouteGroupCount,
  removeActualRouteLoop,
  replaceActualRouteLoop,
  updateActualRouteZone,
} from "@/lib/route/route-actual";
import { CmmInput } from "@/components/ui/cmm-field";

const ActualRouteMap = dynamic(
  () => import("./actual-route-map").then((module) => module.ActualRouteMap),
  { ssr: false },
);

export function ActualRouteEditor({
  actualRoute,
  replacementDrawing,
  onChange,
}: {
  actualRoute: ActualRoute;
  replacementDrawing?: ActionDrawing | null;
  onChange: (actualRoute: ActualRoute) => void;
}) {
  const replacementGeometry = buildActualRouteGeometryFromDrawing(replacementDrawing);
  const updateZoneLabel = (zone: ActualRouteZoneKey, label: string) => {
    onChange(updateActualRouteZone(actualRoute, zone, { label: label.trim() || null }));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/60">
          Parcours réel
        </p>
        <h3 className="mt-1 text-lg font-bold text-emerald-950">
          Ajuster le parcours exécuté
        </h3>
        <p className="mt-1 text-xs leading-5 text-emerald-900/60">
          Cette copie opérationnelle peut changer sans modifier la recommandation originale.
          Les arrêts techniques restent dans la trace scientifique et ne sont pas affichés sur le parcours public.
        </p>
        <p className="mt-2 text-xs leading-5 text-emerald-900/60">
          Pour remplacer une boucle, dessinez un nouveau tracé linéaire dans la carte de localisation,
          puis utilisez le bouton de remplacement correspondant.
        </p>
      </div>

      <ActualRouteMap actualRoute={actualRoute} />

      <div className="grid gap-3 md:grid-cols-3">
        {([
          ["departure", "Départ", actualRoute.zones.departure.label],
          ["midpoint", "Mi-parcours", actualRoute.zones.midpoint.label],
          ["arrival", "Arrivée", actualRoute.zones.arrival.label],
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
          {getActualRouteGroupCount(actualRoute) ?? 0} groupe(s) opérationnel(s) selon les boucles conservées.
        </p>
        {actualRoute.routes.length > 0 ? actualRoute.routes.map((route) => (
          <div key={route.routeId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-white px-3 py-2">
            <div className="text-sm text-emerald-950">
              <span className="font-bold">Boucle {route.groupIndex}</span>
              <span className="ml-2 text-xs text-emerald-900/55">
                {route.geometry.coordinates.length} points · {route.technicalStops.length} arrêts techniques
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange(removeActualRouteLoop(actualRoute, route.routeId))}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
            >
              Supprimer cette boucle
            </button>
            <button
              type="button"
              disabled={!replacementGeometry}
              onClick={() => {
                if (!replacementGeometry) return;
                onChange(replaceActualRouteLoop(actualRoute, route.routeId, replacementGeometry));
              }}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Remplacer par le tracé dessiné
            </button>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Aucune boucle active. Le snapshot planner reste conservé pour la traçabilité.
          </p>
        )}
      </div>
    </section>
  );
}
