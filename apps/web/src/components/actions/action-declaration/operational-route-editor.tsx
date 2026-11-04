"use client";

import dynamic from "next/dynamic";
import type {
  OperationalRoute,
  OperationalRouteZoneKey,
} from "@/lib/route/route-operational";
import {
  getOperationalRouteMeetingPoint,
  getOperationalRouteLoopCount,
  removeOperationalRouteLoop,
  updateOperationalRouteZone,
} from "@/lib/route/route-operational";
import { CmmInput } from "@/components/ui/cmm-field";
import { cn } from "@/lib/utils";

const OperationalRouteMap = dynamic(
  () => import("./operational-route-map").then((module) => module.OperationalRouteMap),
  { ssr: false },
);

export function OperationalRouteEditor({
  operationalRoute,
  onChange,
  compact = false,
}: {
  operationalRoute: OperationalRoute;
  onChange: (operationalRoute: OperationalRoute) => void;
  compact?: boolean;
}) {
  const updateZoneLabel = (zone: OperationalRouteZoneKey, label: string) => {
    onChange(updateOperationalRouteZone(operationalRoute, zone, { label: label.trim() || null }));
  };

  return (
    <section className={cn("rounded-2xl border border-emerald-200/70 bg-[#F3FBF6]", compact ? "space-y-3 p-3" : "space-y-4 p-5")}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/60">
          Parcours opérationnel
        </p>
        <h3 className="mt-1 text-lg font-bold text-emerald-950">
          Ajuster le parcours prévu
        </h3>
        <p className="mt-1 text-xs leading-5 text-emerald-900/60">
          Parcours prévu · non observé.
        </p>
      </div>

      <OperationalRouteMap operationalRoute={operationalRoute} compact={compact} />

      <div className="grid gap-2 md:grid-cols-2" data-operational-meeting-points>
        {operationalRoute.routes.map((route) => {
          const meetingPoint = getOperationalRouteMeetingPoint(operationalRoute, route);
          return (
            <div key={`meeting-point-details-${route.routeId}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <p className="font-bold">Rendez-vous intermédiaire · boucle {route.groupIndex}</p>
              {meetingPoint ? (
                <p className="mt-1">
                  {meetingPoint.coordinates[0].toFixed(5)}, {meetingPoint.coordinates[1].toFixed(5)} · {meetingPoint.cumulativeDistanceKm === null ? "distance indisponible" : `${meetingPoint.cumulativeDistanceKm.toFixed(2)} km depuis le départ`} · {meetingPoint.estimatedDurationMinutes === null ? "temps relatif indisponible" : `${Math.round(meetingPoint.estimatedDurationMinutes)} min depuis le départ`}
                </p>
              ) : (
                <p className="mt-1">Indisponible pour cette géométrie.</p>
              )}
            </div>
          );
        })}
      </div>

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
        {operationalRoute.guidedBudget ? (
          <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-950">
            Budget : {operationalRoute.guidedBudget.totalMinutes} min · collecte {operationalRoute.guidedBudget.minimumCollectionMinutes} min
          </p>
        ) : null}
        {operationalRoute.plannerWarnings?.map((warning) => (
          <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Avertissement planner : {warning}
          </p>
        ))}
        {operationalRoute.routes.length > 0 ? operationalRoute.routes.map((route) => (
          <div key={route.routeId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-white px-3 py-2">
            <div className="text-sm text-emerald-950">
              <span className="font-bold">{route.label || `Groupe ${route.groupIndex}`} · boucle {route.groupIndex}</span>
              <span className="ml-2 text-xs text-emerald-900/55">
                {route.volunteerCount ? `${route.volunteerCount} bénévoles · ` : ""}{route.geometry.coordinates.length} points · {route.plannerTechnicalStops.length} arrêts planner · {route.plannedWaypoints?.length ?? 0} passages planifiés
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange(removeOperationalRouteLoop(operationalRoute, route.routeId))}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
            >
              Supprimer cette boucle
            </button>
            {route.plannedSector || route.plannedWaypoints?.length || route.guidedRouting ? (
              <div className="basis-full rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-950">
                {route.plannedSector ? <p>Secteur : centre {route.plannedSector.center.latitude.toFixed(5)}, {route.plannedSector.center.longitude.toFixed(5)} · rayon {route.plannedSector.radiusKm} km</p> : null}
                {route.plannedWaypoints?.length ? <p className="mt-1">Passages : {route.plannedWaypoints.map((waypoint) => `${waypoint.order + 1}. ${waypoint.label}`).join(" · ")}</p> : null}
                {route.guidedBudget ? <p className="mt-1">Budget : {route.guidedBudget.totalMinutes} min total · {route.guidedBudget.travelMaxMinutes} min déplacement max · {route.guidedBudget.minimumCollectionMinutes} min collecte réservée</p> : null}
                {route.guidedRouting ? <p className="mt-1">Routage : {route.guidedRouting.availability === "network" ? "réseau piéton" : "fallback estimé"} · boucle {route.guidedRouting.loopVerified ? "fermée" : "à vérifier"} · ordre {route.guidedRouting.waypointOrderVerified ? "conservé" : "à vérifier"} · secteur {route.guidedRouting.sectorStatus === "within" ? "respecté" : route.guidedRouting.sectorStatus === "outside" ? "hors périmètre" : "inconnu"}{route.guidedRouting.warning ? ` · ${route.guidedRouting.warning}` : ""}</p> : null}
              </div>
            ) : null}
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Aucune boucle active.
          </p>
        )}
      </div>
    </section>
  );
}
