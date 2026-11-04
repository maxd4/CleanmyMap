import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { RouteExplanation } from "./components/route-explanation";
import { RouteList } from "./components/route-list";
import { RoutePdfExport } from "./components/route-pdf-export";
import { RouteWeatherSummary } from "./components/route-weather-summary";
import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
import type { RouteResponse, RouteOriginMode, RouteRecommendationOrigin, RouteStartZone } from "./route-types";
import type {
  MeetingOpportunity,
  MeetingPointProjection,
  RouteGroupRoute,
} from "@/lib/route/route-response-contract";
import {
  getRouteGroupPatternLabel,
  getRouteGroupVisualStyle,
  type RouteMultiRouteDisplayMode,
} from "./route-types";
import { formatBusinessDurationRangeMinutes } from "@/lib/actions/time-contract";
import { EMPTY_ROUTE_GEOMETRY } from "./route-section.model";
import { CmmButton } from "@/components/ui/cmm-button";

const RouteMap = dynamic(
  () => import("./components/route-map").then((module) => module.RouteMap),
  { ssr: false },
);

type RouteResultDisplayProps = {
  fr: boolean;
  groupRoutes: RouteGroupRoute[];
  totalKm: number;
  totalMinutes: number;
  serviceMinutes: number | null;
  operationalTotalMinutes: number | null;
  actionDurationLabel: string;
  operationalTotalLabel: string;
  eventBudgetMinutes: number | null;
  actionBudgetMinutes: number | null;
  organizationMarginMinutes: number | null;
  onCreateAction: () => void;
};

function MeetingPointDetails({
  meetingPoint,
  meetingOpportunities = [],
  fr,
}: {
  meetingPoint: MeetingPointProjection | null | undefined;
  meetingOpportunities?: MeetingOpportunity[];
  fr: boolean;
}) {
  if (!meetingPoint) {
    return (
      <p className="text-xs font-semibold text-amber-100/80" data-meeting-point-state="unavailable">
        {fr ? "Rendez-vous intermédiaire indisponible pour ce tracé." : "Intermediate meeting point unavailable for this route."}
      </p>
    );
  }
  const distance = meetingPoint.cumulativeDistanceKm === null
    ? (fr ? "distance relative indisponible" : "relative distance unavailable")
    : `${meetingPoint.cumulativeDistanceKm.toFixed(2)} km ${fr ? "depuis le départ" : "from start"}`;
  const duration = meetingPoint.estimatedDurationMinutes === null
    ? (fr ? "temps relatif indisponible" : "relative time unavailable")
    : `${Math.round(meetingPoint.estimatedDurationMinutes)} min ${fr ? "depuis le départ" : "from start"}`;
  const provenance = meetingPoint.provenance === "manual_midpoint"
    ? (fr ? "point manuel conservé" : "manual point preserved")
    : (fr ? "projeté sur la géométrie finale" : "projected on final geometry");
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50" data-meeting-point-state="available">
      <p className="font-black">{fr ? "Rendez-vous intermédiaire" : "Intermediate meeting point"}</p>
      <p className="mt-1 text-xs font-semibold text-amber-100/85">
        {meetingPoint.coordinates[0].toFixed(5)}, {meetingPoint.coordinates[1].toFixed(5)} · {distance} · {duration}
      </p>
      <p className="mt-1 text-xs font-semibold text-amber-100/65">{provenance}</p>
      <section className="mt-3 border-t border-amber-200/15 pt-3" data-meeting-opportunities>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/80">
          {fr ? "Opportunités locales à proximité" : "Nearby local opportunities"}
        </p>
        {meetingOpportunities.length === 0 ? (
          <p className="mt-2 text-xs font-semibold text-amber-100/70">
            {fr ? "Aucune opportunité locale admissible." : "No admissible local opportunity."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2" aria-label={fr ? "Opportunités locales" : "Local opportunities"}>
            {meetingOpportunities.map((opportunity) => (
              <li key={opportunity.candidateId} className="rounded-xl border border-amber-100/10 bg-black/10 px-3 py-2">
                <p className="font-bold">{opportunity.label}</p>
                <p className="mt-1 text-xs font-semibold text-amber-100/75">
                  {opportunity.distanceMeters} m {fr ? "à vol d’oiseau" : "straight-line"} · {opportunity.provenance === "observed"
                    ? (fr ? "observation" : "observed")
                    : (fr ? "prédiction" : "predicted")} · {opportunity.source}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs font-semibold text-amber-100/65">
          {fr
            ? "Restez à proximité du point de regroupement et revenez-y. La distance affichée est à vol d’oiseau ; aucune accessibilité piétonne n’est calculée."
            : "Stay near the meeting point and return to it. The displayed distance is straight-line; pedestrian accessibility is not calculated."}
        </p>
      </section>
    </div>
  );
}

function RouteResultSummary({
  data,
  fr,
  groupRoutes,
  totalKm,
  totalMinutes,
  serviceMinutes,
  operationalTotalMinutes,
  actionDurationLabel,
  operationalTotalLabel,
  eventBudgetMinutes,
  actionBudgetMinutes,
  organizationMarginMinutes,
  onCreateAction,
}: RouteResultDisplayProps & {
  data: RouteResponse;
}) {
  const isLoop = (data.routeTopology ?? (data.isLoop ? "loop" : "open")) === "loop";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-950/90 p-4 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)] sm:p-5">
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-black tracking-tighter text-white sm:text-5xl">{totalKm.toFixed(2)}</span>
            <span className="text-sm font-black uppercase tracking-widest text-emerald-200">km</span>
            <span className="mx-1 text-2xl font-black text-white/25">/</span>
            <span className="text-4xl font-black tracking-tighter text-white sm:text-5xl">{totalMinutes}</span>
            <span className="text-sm font-black uppercase tracking-widest text-emerald-200">min déplacement</span>
          </div>
          <dl className="grid gap-2 text-sm text-white/80 sm:grid-cols-3" data-route-operational-budget>
            <div><dt className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">Déplacement</dt><dd className="mt-1 font-bold">{totalMinutes} min</dd></div>
            <div><dt className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">Durée d’action</dt><dd className="mt-1 font-bold">{serviceMinutes === null ? "Non fiable" : actionDurationLabel}</dd></div>
            <div><dt className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">Créneau total</dt><dd className="mt-1 font-bold">{operationalTotalMinutes === null ? "Non disponible" : operationalTotalLabel}</dd></div>
          </dl>
          <p className="text-xs font-semibold leading-relaxed text-slate-300/80">
            Créneau utilisateur : {eventBudgetMinutes === null ? "Non disponible" : formatBusinessDurationRangeMinutes(eventBudgetMinutes)} · budget d’action : {actionBudgetMinutes === null ? "Non disponible" : formatBusinessDurationRangeMinutes(actionBudgetMinutes)} · marge organisation : {organizationMarginMinutes === null ? "Non disponible" : `${organizationMarginMinutes} min`}.
          </p>
          {serviceMinutes === null ? <p className="text-xs font-semibold text-amber-100/80">La durée d’action complète n’est pas encore fiable ; le planner conserve son fonctionnement avec le temps réseau disponible.</p> : null}
          {groupRoutes.length > 1 && !data.meetingPoint ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50" data-meeting-point-state="group-specific">
              <p className="font-black">{fr ? "Pas de rendez-vous commun" : "No shared meeting point"}</p>
              <p className="mt-1 text-xs font-semibold text-amber-100/75">
                {fr
                  ? "Les rendez-vous intermédiaires disponibles pour chaque groupe sont affichés dans leurs cartes respectives."
                  : "Available intermediate meeting points for each group are shown in their respective cards."}
              </p>
            </div>
          ) : (
            <MeetingPointDetails meetingPoint={data.meetingPoint} meetingOpportunities={data.meetingOpportunities} fr={fr} />
          )}
          <p className="text-sm font-semibold text-emerald-100/80">
            {groupRoutes.length > 1
              ? `${data.volunteers} bénévoles · ${data.groupCount} groupes · ${data.multiRoute.totalDistanceKm.toFixed(2)} km cumulés`
              : isLoop
                ? `Boucle de ${totalKm.toFixed(2)} km · départ et arrivée au même endroit`
                : `Trajet ouvert de ${totalKm.toFixed(2)} km · départ / arrivée`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-emerald-200/15 bg-white/[0.04] p-3 lg:min-w-44 lg:text-right">
          <p className="cmm-text-caption font-black uppercase tracking-widest text-emerald-200/80">{fr ? "Priorité moyenne" : "Average priority"}</p>
          <p className="text-5xl font-black leading-none tracking-tighter text-white">{data.scoreBreakdown.priority}</p>
          <CmmButton type="button" tone="primary" size="sm" onClick={onCreateAction} className="mt-1 w-full justify-center text-center font-black uppercase tracking-[0.1em]">
            Créer une action avec cet itinéraire
          </CmmButton>
        </div>
      </div>
    </div>
  );
}

function RouteGroupSelection({
  data,
  fr,
  groupRoutes,
  selectedGroupIndex,
  setSelectedGroupIndex,
  multiRouteDisplayMode,
  setMultiRouteDisplayMode,
}: {
  data: RouteResponse;
  fr: boolean;
  groupRoutes: RouteGroupRoute[];
  selectedGroupIndex: number | null;
  setSelectedGroupIndex: (index: number | null) => void;
  multiRouteDisplayMode: RouteMultiRouteDisplayMode;
  setMultiRouteDisplayMode: (mode: RouteMultiRouteDisplayMode) => void;
}) {
  if (groupRoutes.length <= 1) return null;
  const isLoop = (data.routeTopology ?? (data.isLoop ? "loop" : "open")) === "loop";
  return (
    <section aria-label={fr ? "Sélection des groupes" : "Group selection"} className="rounded-[2rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-emerald-100/68">{fr ? (isLoop ? "Boucles coordonnées" : "Trajets ouverts coordonnés") : (isLoop ? "Coordinated loops" : "Coordinated open routes")}</p>
          <p className="mt-2 text-sm font-semibold text-white/80">{fr ? (isLoop ? "Chaque groupe reçoit une boucle différente afin de couvrir davantage de rues." : "Chaque groupe reçoit un trajet ouvert différent afin de couvrir davantage de rues.") : (isLoop ? "Each group receives a different loop to cover more streets." : "Each group receives a different open route to cover more streets.")}</p>
        </div>
        <fieldset className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2" aria-label={fr ? "Différencier les itinéraires par" : "Differentiate routes by"}>
          <legend className="px-1 cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-100/70">{fr ? "Différencier les itinéraires par" : "Differentiate routes by"}</legend>
          <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-white" role="radiogroup">
            <label className="flex items-center gap-2"><input type="radio" name="route-multi-display-mode" value="colors" checked={multiRouteDisplayMode === "colors"} onChange={() => setMultiRouteDisplayMode("colors")} className="accent-emerald-300" />{fr ? "Couleurs différentes" : "Different colors"}</label>
            <label className="flex items-center gap-2"><input type="radio" name="route-multi-display-mode" value="patterns" checked={multiRouteDisplayMode === "patterns"} onChange={() => setMultiRouteDisplayMode("patterns")} className="accent-emerald-300" />{fr ? "Formes différentes" : "Different patterns"}</label>
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2" role="tablist">
          <button type="button" role="tab" aria-selected={selectedGroupIndex === null} onClick={() => setSelectedGroupIndex(null)} className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white transition hover:border-emerald-300/50">{fr ? "Tous les groupes" : "All groups"}</button>
          {groupRoutes.map((group) => <button key={group.groupIndex} type="button" role="tab" aria-selected={selectedGroupIndex === group.groupIndex} onClick={() => setSelectedGroupIndex(group.groupIndex)} className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-50 transition hover:border-emerald-300/60">{group.label || (fr ? `Groupe ${group.groupIndex}` : `Group ${group.groupIndex}`)}</button>)}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3" role="list" aria-label={fr ? (isLoop ? "Légende des boucles" : "Légende des trajets ouverts") : (isLoop ? "Loop legend" : "Open route legend")}>
        {groupRoutes.map((group) => {
          const visualStyle = getRouteGroupVisualStyle(group.groupIndex, multiRouteDisplayMode);
          const groupName = group.label || (fr ? `Groupe ${group.groupIndex}` : `Group ${group.groupIndex}`);
          const groupLabel = `${groupName} — ${group.volunteerCount} ${fr ? "bénévoles" : "volunteers"}`;
          const guidedState = group.guidedRouting?.availability === "network"
            ? (fr ? "réseau piéton" : "pedestrian network")
            : group.guidedRouting
              ? (fr ? "fallback estimé" : "estimated fallback")
              : null;
          return <div key={`summary-${group.groupIndex}`} role="listitem">
            <button type="button" onClick={() => setSelectedGroupIndex(group.groupIndex)} aria-label={groupLabel} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-300/40">
              <span className="flex items-center gap-3"><span aria-hidden="true" className="h-1.5 w-10 rounded-full" style={{ backgroundColor: visualStyle.color, backgroundImage: multiRouteDisplayMode === "patterns" ? `repeating-linear-gradient(90deg, ${visualStyle.color} 0 8px, transparent 8px 14px)` : undefined }} /><span className="font-black text-white">{groupLabel}</span></span>
              <p className="mt-2 text-xs text-slate-300">{group.travelDistanceKm.toFixed(2)} km · {group.travelMinutes} min déplacement · {group.operationalBudget?.actionMinutes === null || group.operationalBudget?.actionMinutes === undefined ? "durée d’action indisponible" : `action ${formatBusinessDurationRangeMinutes(group.operationalBudget.actionMinutes)}`} · {group.targetCount} observations</p>
              {group.plannedSector ? <p className="mt-2 text-xs font-semibold text-sky-100/80">{fr ? "Secteur" : "Sector"} : {fr ? "centre" : "center"} {group.plannedSector.center.latitude.toFixed(4)}, {group.plannedSector.center.longitude.toFixed(4)} · {fr ? "rayon" : "radius"} {group.plannedSector.radiusKm.toFixed(1)} km</p> : null}
              {group.plannedWaypoints && group.plannedWaypoints.length > 0 ? <div className="mt-2 text-xs text-sky-100/80"><p className="font-black">{fr ? "Passages planifiés (ordre)" : "Planned waypoints (order)"}</p><ol className="mt-1 list-decimal space-y-0.5 pl-5">{group.plannedWaypoints.map((waypoint) => <li key={waypoint.id}>{waypoint.label}</li>)}</ol></div> : null}
              {guidedState ? <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100/80">{fr ? "État : " : "Status: "}{guidedState}</p> : null}
              {group.guidedRouting ? <p className="mt-1 text-xs font-semibold text-slate-300">{fr ? (isLoop ? `Boucle ${group.guidedRouting.loopVerified ? "fermée" : "à vérifier"}` : "Trajet ouvert") + ` · ordre ${group.guidedRouting.waypointOrderVerified ? "respecté" : "non confirmé"} · budget déplacement ${group.guidedRouting.budget.travelMinutes} min / ${group.guidedRouting.budget.travelMaxMinutes} min` : (isLoop ? `Loop ${group.guidedRouting.loopVerified ? "closed" : "to verify"}` : "Open route") + ` · order ${group.guidedRouting.waypointOrderVerified ? "preserved" : "unconfirmed"} · travel budget ${group.guidedRouting.budget.travelMinutes} / ${group.guidedRouting.budget.travelMaxMinutes} min`}</p> : null}
              {group.guidedRouting ? <p className="mt-1 text-xs font-semibold text-slate-300">{fr ? "Secteur : " : "Sector: "}{group.guidedRouting.sectorStatus === "outside" ? (fr ? "hors périmètre" : "outside") : group.guidedRouting.sectorStatus === "within" ? (fr ? "respecté" : "within") : (fr ? "inconnu (géométrie non vérifiable)" : "unknown (geometry not verifiable)")}</p> : null}
              <div className="mt-3"><MeetingPointDetails meetingPoint={group.meetingPoint} meetingOpportunities={group.meetingOpportunities} fr={fr} /></div>
              <p className="mt-1 cmm-text-small font-semibold text-emerald-100/70">{group.operationalBudget?.withinBudget === true ? "Budget d’action respecté" : group.operationalBudget?.withinBudget === false ? "Budget d’action dépassé" : "Budget d’action non vérifiable"}</p>
              {multiRouteDisplayMode === "patterns" ? <p className="mt-1 cmm-text-small font-semibold text-emerald-100/70">{fr ? "Trait : " : "Line: "}{getRouteGroupPatternLabel(group.groupIndex, fr)}</p> : null}
            </button>
          </div>;
        })}
      </div>
      <p className="mt-4 text-xs text-emerald-100/70">{fr ? `Couverture : ${data.multiRoute.coverageGain.toFixed(2)} · recouvrement des cibles : ${(data.multiRoute.sharedTargetRatio * 100).toFixed(0)} % · distance partagée réseau : ${data.multiRoute.sharedDistanceRatio === null ? "non mesurée" : `${(data.multiRoute.sharedDistanceRatio * 100).toFixed(1)} %`}.` : `Coverage: ${data.multiRoute.coverageGain.toFixed(2)} · shared targets: ${(data.multiRoute.sharedTargetRatio * 100).toFixed(0)}% · network shared distance: ${data.multiRoute.sharedDistanceRatio === null ? "not measured" : `${(data.multiRoute.sharedDistanceRatio * 100).toFixed(1)}%`}.`}</p>
    </section>
  );
}

function RouteMethodology({ data, fr }: { data: RouteResponse; fr: boolean }) {
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
    <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-300"><Info size={16} aria-hidden="true" /></div><h3 className="text-base font-black tracking-tight text-white">{fr ? "Méthode de sélection" : "Selection method"}</h3></div>
    <div className="grid gap-2 md:grid-cols-2">{data.tradeoffs.length > 0 ? data.tradeoffs.map((line, index) => <div key={index} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold leading-relaxed text-slate-200"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />{line}</div>) : <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm font-bold text-slate-200 md:col-span-2">{fr ? "Aucun ajustement majeur nécessaire." : "No major adjustment needed."}</div>}</div>
  </div>;
}

export function RouteResults({
  data,
  fr,
  hasData,
  hasRoute,
  originMode,
  mapOrigin,
  setMapOrigin,
  clearMapOrigin,
  startZone,
  onSelectZoneCenter,
  selectedStopId,
  setSelectedStopId,
  selectedGroupIndex,
  setSelectedGroupIndex,
  multiRouteDisplayMode,
  setMultiRouteDisplayMode,
  groupRoutes,
  visibleStops,
  visibleGeometry,
  totalKm,
  totalMinutes,
  serviceMinutes,
  operationalTotalMinutes,
  actionDurationLabel,
  operationalTotalLabel,
  eventBudgetMinutes,
  actionBudgetMinutes,
  organizationMarginMinutes,
  onCreateAction,
}: RouteResultDisplayProps & {
  data?: RouteResponse;
  hasData: boolean;
  hasRoute: boolean;
  originMode: RouteOriginMode;
  mapOrigin: RouteRecommendationOrigin | null;
  setMapOrigin: (origin: RouteRecommendationOrigin) => void;
  clearMapOrigin: () => void;
  startZone?: RouteStartZone | null;
  onSelectZoneCenter?: (coordinate: { latitude: number; longitude: number }) => void;
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  selectedGroupIndex: number | null;
  setSelectedGroupIndex: (index: number | null) => void;
  multiRouteDisplayMode: RouteMultiRouteDisplayMode;
  setMultiRouteDisplayMode: (mode: RouteMultiRouteDisplayMode) => void;
  visibleStops: RouteStop[];
  visibleGeometry: RouteGeometry;
}) {
  return <>
    {!hasRoute && (originMode === "map" || startZone) ? <RouteMap stops={[]} routeGeometry={EMPTY_ROUTE_GEOMETRY} origin={mapOrigin} onSelectOrigin={originMode === "map" ? setMapOrigin : undefined} onClearOrigin={originMode === "map" ? clearMapOrigin : undefined} startZone={startZone} onSelectZoneCenter={startZone ? onSelectZoneCenter : undefined} fr={fr} /> : null}
    {data?.weatherContext ? <RouteWeatherSummary context={data.weatherContext} fr={fr} /> : null}
    <AnimatePresence mode="wait">
      {hasRoute && data ? <motion.div initial={{ opacity: 1, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <RouteResultSummary data={data} fr={fr} groupRoutes={groupRoutes} totalKm={totalKm} totalMinutes={totalMinutes} serviceMinutes={serviceMinutes} operationalTotalMinutes={operationalTotalMinutes} actionDurationLabel={actionDurationLabel} operationalTotalLabel={operationalTotalLabel} eventBudgetMinutes={eventBudgetMinutes} actionBudgetMinutes={actionBudgetMinutes} organizationMarginMinutes={organizationMarginMinutes} onCreateAction={onCreateAction} />
        <RouteGroupSelection data={data} fr={fr} groupRoutes={groupRoutes} selectedGroupIndex={selectedGroupIndex} setSelectedGroupIndex={setSelectedGroupIndex} multiRouteDisplayMode={multiRouteDisplayMode} setMultiRouteDisplayMode={setMultiRouteDisplayMode} />
        {hasData ? <RouteMethodology data={data} fr={fr} /> : null}
        <RouteMap stops={visibleStops} routeGeometry={visibleGeometry} meetingPoint={data.meetingPoint} groupRoutes={groupRoutes} selectedGroupIndex={selectedGroupIndex} representationMode={multiRouteDisplayMode} origin={data.origin} onSelectOrigin={originMode === "map" ? setMapOrigin : undefined} onClearOrigin={originMode === "map" ? clearMapOrigin : undefined} startZone={startZone} onSelectZoneCenter={startZone ? onSelectZoneCenter : undefined} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} fr={fr} />
        <RoutePdfExport data={data} displayMode={multiRouteDisplayMode} onUsePatterns={() => setMultiRouteDisplayMode("patterns")} />
        <RouteList hasRoute={hasRoute} picks={visibleStops} fr={fr} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} />
      </motion.div> : null}
    </AnimatePresence>
    {data ? <RouteExplanation data={data} fr={fr} /> : null}
  </>;
}
