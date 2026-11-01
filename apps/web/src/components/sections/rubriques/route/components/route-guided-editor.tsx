"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUp, MapPin, Plus, Trash2 } from "lucide-react";
import {
  MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM,
  MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES,
  MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP,
} from "@/lib/route/route-planning-mode";
import type {
  RouteGuidedCoordinate,
  RouteGuidedWaypoint,
  RouteTerritorialGuidedMode,
} from "@/lib/route/route-planning-mode";
import type { RouteOptions, RouteRecommendationOrigin } from "../route-types";
import { EMPTY_ROUTE_GEOMETRY } from "../route-section.model";

const RouteMap = dynamic(
  () => import("./route-map").then((module) => module.RouteMap),
  { ssr: false },
);

type GuidedMapTarget = "origin" | "sector" | "waypoint";

type RouteGuidedEditorProps = {
  mode: RouteTerritorialGuidedMode;
  options: RouteOptions;
  origin: RouteRecommendationOrigin | null;
  fr: boolean;
  onChange: (mode: RouteTerritorialGuidedMode) => void;
  onSelectOrigin: (origin: RouteRecommendationOrigin) => void;
};

const inputClass = "min-h-11 rounded-xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-300/60";

function coordinateLabel(coordinate: RouteGuidedCoordinate): string {
  return `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;
}

function cloneMode(mode: RouteTerritorialGuidedMode): RouteTerritorialGuidedMode {
  return {
    ...mode,
    budget: { ...mode.budget },
    groups: mode.groups.map((group) => ({
      ...group,
      sector: { ...group.sector, center: { ...group.sector.center } },
      waypoints: group.waypoints.map((waypoint) => ({ ...waypoint })),
    })),
  };
}

export function RouteGuidedEditor({
  mode,
  options,
  origin,
  fr,
  onChange,
  onSelectOrigin,
}: RouteGuidedEditorProps) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [mapTarget, setMapTarget] = useState<GuidedMapTarget>("origin");
  const activeGroup = mode.groups[activeGroupIndex] ?? mode.groups[0];
  const totalVolunteers = mode.groups.reduce(
    (total, group) => total + (group.volunteerCount ?? 0),
    0,
  );
  const allocatedMinutes = mode.budget.organizationMarginMinutes +
    mode.budget.travelMaxMinutes + mode.budget.minimumCollectionMinutes;
  const budgetIsValid = Math.abs(allocatedMinutes - mode.budget.totalMinutes) < 0.000001;

  function updateMode(updater: (next: RouteTerritorialGuidedMode) => void) {
    const next = cloneMode(mode);
    updater(next);
    onChange(next);
  }

  function updateGroup(
    groupIndex: number,
    updater: (group: RouteTerritorialGuidedMode["groups"][number]) => void,
  ) {
    updateMode((next) => {
      const group = next.groups[groupIndex];
      if (group) updater(group);
    });
  }

  function updateWaypoint(
    groupIndex: number,
    waypointIndex: number,
    updater: (waypoint: RouteGuidedWaypoint) => void,
  ) {
    updateGroup(groupIndex, (group) => {
      const waypoint = group.waypoints[waypointIndex];
      if (waypoint) updater(waypoint);
    });
  }

  function handleMapPoint(coordinate: RouteGuidedCoordinate) {
    if (mapTarget === "origin") {
      onSelectOrigin({ ...coordinate, source: "map" });
      return;
    }
    if (activeGroupIndex < 0) return;
    if (mapTarget === "sector") {
      updateGroup(activeGroupIndex, (group) => {
        group.sector.center = { ...coordinate };
      });
      return;
    }
    const selectedGroup = mode.groups[activeGroupIndex];
    if (!selectedGroup || selectedGroup.waypoints.length >= MAX_ROUTE_GUIDED_WAYPOINTS_PER_GROUP) return;
    updateGroup(activeGroupIndex, (group) => {
      const order = group.waypoints.length + 1;
      group.waypoints.push({
        id: `${group.label ?? `group-${activeGroupIndex + 1}`}-waypoint-${order}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        label: `${fr ? "Passage" : "Waypoint"} ${order}`,
        ...coordinate,
      });
    });
  }

  function addGroup() {
    if (mode.groups.length >= 12) return;
    const source = activeGroup ?? mode.groups[0];
    if (!source) return;
    updateMode((next) => {
      const groupIndex = next.groups.length + 1;
      next.groups.push({
        label: `${fr ? "Groupe" : "Group"} ${groupIndex}`,
        volunteerCount: 1,
        sector: {
          ...source.sector,
          center: { ...source.sector.center },
        },
        waypoints: [{
          id: `group-${groupIndex}-waypoint-1`,
          label: `${fr ? "Passage" : "Waypoint"} ${groupIndex}.1`,
          latitude: source.sector.center.latitude,
          longitude: source.sector.center.longitude,
        }],
      });
    });
    setActiveGroupIndex(mode.groups.length);
  }

  function removeGroup(groupIndex: number) {
    if (mode.groups.length <= 1) return;
    updateMode((next) => {
      next.groups.splice(groupIndex, 1);
    });
    setActiveGroupIndex((current) => Math.min(current, Math.max(0, mode.groups.length - 2)));
  }

  function moveWaypoint(groupIndex: number, waypointIndex: number, offset: -1 | 1) {
    updateGroup(groupIndex, (group) => {
      const targetIndex = waypointIndex + offset;
      if (targetIndex < 0 || targetIndex >= group.waypoints.length) return;
      const current = group.waypoints[waypointIndex];
      const target = group.waypoints[targetIndex];
      if (!current || !target) return;
      group.waypoints[waypointIndex] = target;
      group.waypoints[targetIndex] = current;
    });
  }

  return (
    <section
      className="rounded-[1.75rem] border border-sky-300/25 bg-[rgba(8,38,58,0.9)] p-5 shadow-[0_24px_56px_-32px_rgba(56,189,248,0.35)]"
      aria-labelledby="guided-route-editor-title"
      data-guided-route-editor
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-sky-100/70">
            {fr ? "Mode territorial guidé" : "Guided territorial mode"}
          </p>
          <h3 id="guided-route-editor-title" className="mt-2 text-xl font-black text-white">
            {fr ? "Configurer les boucles de groupe" : "Configure group loops"}
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-sky-50">
            {fr
              ? "Le départ commun, les secteurs et les passages planifiés restent distincts des observations et prédictions."
              : "The common start, sectors, and planned passages remain distinct from observations and predictions."}
          </p>
        </div>
        <span className="rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-50">
          {totalVolunteers} {fr ? "bénévoles" : "volunteers"} · {mode.groups.length} {fr ? "groupes" : "groups"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={fr ? "Groupes guidés" : "Guided groups"}>
            {mode.groups.map((group, index) => (
              <button
                key={`guided-group-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={activeGroupIndex === index}
                onClick={() => setActiveGroupIndex(index)}
                className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-black transition ${activeGroupIndex === index ? "border-sky-200/70 bg-sky-300/20 text-white" : "border-white/10 bg-white/[0.04] text-sky-50/75"}`}
              >
                {group.label || `${fr ? "Groupe" : "Group"} ${index + 1}`}
                <span className="ml-2 text-xs font-semibold text-sky-100/65">{group.volunteerCount ?? 0}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={addGroup}
              disabled={mode.groups.length >= 12}
              className="min-h-11 rounded-xl border border-dashed border-sky-200/35 px-3 py-2 text-sm font-bold text-sky-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus size={15} aria-hidden="true" className="mr-1 inline" />
              {fr ? "Ajouter" : "Add"}
            </button>
          </div>

          {mode.groups.map((group, groupIndex) => (
            <fieldset
              key={`guided-group-${groupIndex}`}
              hidden={activeGroupIndex !== groupIndex}
              className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4"
              aria-label={`${fr ? "Configuration" : "Configuration"} ${group.label || `${fr ? "Groupe" : "Group"} ${groupIndex + 1}`}`}
            >
              <legend className="px-1 text-sm font-black text-sky-50">
                {group.label || `${fr ? "Groupe" : "Group"} ${groupIndex + 1}`}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-bold text-sky-50/90 sm:col-span-2">
                  {fr ? "Nom du groupe" : "Group name"}
                  <input
                    className={inputClass}
                    value={group.label ?? ""}
                    placeholder={`${fr ? "Groupe" : "Group"} ${groupIndex + 1}`}
                    onChange={(event) => updateGroup(groupIndex, (current) => { current.label = event.target.value; })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-bold text-sky-50/90">
                  {fr ? "Effectif" : "Volunteers"}
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={group.volunteerCount ?? 1}
                    onChange={(event) => updateGroup(groupIndex, (current) => { current.volunteerCount = Math.min(100, Math.max(1, Number(event.target.value || 1))); })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-bold text-sky-50/90">
                  {fr ? "Rayon du secteur (km)" : "Sector radius (km)"}
                  <input
                    className={inputClass}
                    type="number"
                    min={0.1}
                    max={MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM}
                    step={0.1}
                    value={group.sector.radiusKm}
                    onChange={(event) => updateGroup(groupIndex, (current) => { current.sector.radiusKm = Math.min(MAX_ROUTE_GUIDED_SECTOR_RADIUS_KM, Math.max(0.1, Number(event.target.value || 0.1))); })}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-sky-100/10 bg-sky-950/25 p-3 text-xs text-sky-50/80">
                <p className="font-black">{fr ? "Centre du secteur" : "Sector center"}</p>
                <p className="mt-1 font-mono">{coordinateLabel(group.sector.center)}</p>
                <button type="button" onClick={() => setMapTarget("sector")} className={`mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 font-bold ${mapTarget === "sector" ? "border-sky-100/70 bg-sky-300/20" : "border-sky-100/20"}`}>
                  <MapPin size={15} aria-hidden="true" />
                  {fr ? "Choisir le centre sur la carte" : "Choose center on map"}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-sky-50">{fr ? "Points de passage ordonnés" : "Ordered waypoints"}</p>
                  <button type="button" onClick={() => setMapTarget("waypoint")} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${mapTarget === "waypoint" ? "border-sky-100/70 bg-sky-300/20" : "border-sky-100/20"}`}>
                    <MapPin size={15} aria-hidden="true" />
                    {fr ? "Ajouter depuis la carte" : "Add from map"}
                  </button>
                </div>
                {group.waypoints.map((waypoint, waypointIndex) => (
                  <div key={waypoint.id} className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-300/20 text-sm font-black text-sky-50" aria-label={`${fr ? "Ordre" : "Order"} ${waypointIndex + 1}`}>{waypointIndex + 1}</span>
                    <div className="min-w-0">
                      <label className="sr-only" htmlFor={`guided-waypoint-${groupIndex}-${waypointIndex}`}>{fr ? "Nom du passage" : "Waypoint name"}</label>
                      <input id={`guided-waypoint-${groupIndex}-${waypointIndex}`} className={`${inputClass} w-full`} value={waypoint.label} onChange={(event) => updateWaypoint(groupIndex, waypointIndex, (current) => { current.label = event.target.value; })} />
                      <p className="mt-1 font-mono text-xs text-sky-100">{coordinateLabel(waypoint)}</p>
                    </div>
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label={fr ? "Monter le passage" : "Move waypoint up"} disabled={waypointIndex === 0} onClick={() => moveWaypoint(groupIndex, waypointIndex, -1)} className="rounded-lg border border-white/10 p-2 text-sky-50 disabled:opacity-30"><ArrowUp size={14} aria-hidden="true" /></button>
                      <button type="button" aria-label={fr ? "Descendre le passage" : "Move waypoint down"} disabled={waypointIndex === group.waypoints.length - 1} onClick={() => moveWaypoint(groupIndex, waypointIndex, 1)} className="rounded-lg border border-white/10 p-2 text-sky-50 disabled:opacity-30"><ArrowDown size={14} aria-hidden="true" /></button>
                      <button type="button" aria-label={fr ? "Supprimer le passage" : "Delete waypoint"} disabled={group.waypoints.length <= 1} onClick={() => updateGroup(groupIndex, (current) => { current.waypoints.splice(waypointIndex, 1); })} className="rounded-lg border border-rose-200/20 p-2 text-rose-100 disabled:opacity-30"><Trash2 size={14} aria-hidden="true" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => removeGroup(groupIndex)} disabled={mode.groups.length <= 1} className="min-h-10 rounded-xl border border-rose-200/20 px-3 py-2 text-xs font-bold text-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                {fr ? "Supprimer ce groupe" : "Delete this group"}
              </button>
            </fieldset>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-sky-100/10 bg-sky-950/20 p-3">
            <p className="text-sm font-black text-sky-50">{fr ? "Départ commun" : "Common start"}</p>
            <p className="mt-1 text-xs text-sky-100/70">
              {origin ? coordinateLabel(origin) : fr ? "Non choisi : cliquez sur la carte." : "Not chosen: click the map."}
            </p>
            <button type="button" onClick={() => setMapTarget("origin")} className={`mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${mapTarget === "origin" ? "border-sky-100/70 bg-sky-300/20" : "border-sky-100/20"}`}>
              <MapPin size={15} aria-hidden="true" />
              {fr ? "Choisir le départ sur la carte" : "Choose start on map"}
            </button>
          </div>
          <div className="rounded-2xl border border-sky-100/10 bg-sky-950/20 p-3">
            <p className="text-sm font-black text-sky-50">{fr ? "Budget guidé" : "Guided budget"}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                ["totalMinutes", fr ? "Créneau total" : "Total slot"],
                ["organizationMarginMinutes", fr ? "Organisation" : "Organization"],
                ["travelMaxMinutes", fr ? "Déplacement max" : "Max travel"],
                ["minimumCollectionMinutes", fr ? "Collecte minimale" : "Minimum collection"],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex flex-col gap-2 text-xs font-bold text-sky-50/90">
                  {label} (min)
                  <input className={inputClass} type="number" min={field === "organizationMarginMinutes" ? 0 : 1} max={MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES} step={1} value={mode.budget[field]} onChange={(event) => updateMode((next) => { next.budget[field] = Math.min(MAX_ROUTE_GUIDED_TOTAL_BUDGET_MINUTES, Math.max(field === "organizationMarginMinutes" ? 0 : 1, Number(event.target.value || 0))); })} />
                </label>
              ))}
            </div>
            <p className={`mt-3 text-xs font-bold ${budgetIsValid ? "text-emerald-200" : "text-amber-200"}`} role={budgetIsValid ? undefined : "alert"}>
              {fr ? `Répartition : ${mode.budget.organizationMarginMinutes} + ${mode.budget.travelMaxMinutes} + ${mode.budget.minimumCollectionMinutes} = ${allocatedMinutes} min.` : `Allocation: ${mode.budget.organizationMarginMinutes} + ${mode.budget.travelMaxMinutes} + ${mode.budget.minimumCollectionMinutes} = ${allocatedMinutes} min.`}
              {!budgetIsValid ? (fr ? " Ajustez les valeurs pour atteindre le créneau total." : " Adjust the values to reach the total slot.") : null}
            </p>
          </div>
          <RouteMap
            stops={[]}
            routeGeometry={EMPTY_ROUTE_GEOMETRY}
            guidedGroups={mode.groups}
            guidedActiveGroupIndex={activeGroupIndex + 1}
            onSelectGuidedPoint={handleMapPoint}
            origin={origin}
            fr={fr}
          />
          <p className="text-xs font-semibold text-sky-100/65" role="status">
            {fr ? `Mode carte : ${mapTarget === "origin" ? "départ commun" : mapTarget === "sector" ? "centre du secteur" : "ajout d’un passage"}. Groupe actif : ${activeGroup?.label ?? activeGroupIndex + 1}.` : `Map mode: ${mapTarget}. Active group: ${activeGroup?.label ?? activeGroupIndex + 1}.`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-sky-100/60">
        {fr ? `${options.volunteers} bénévoles dans les paramètres généraux ; les effectifs guidés détaillés totalisent ${totalVolunteers}.` : `${options.volunteers} volunteers in general settings; detailed guided groups total ${totalVolunteers}.`}
      </p>
    </section>
  );
}
