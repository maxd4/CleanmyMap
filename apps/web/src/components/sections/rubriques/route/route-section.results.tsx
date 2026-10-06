import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Route as RouteIcon, Sparkles } from "lucide-react";
import { RouteExplanation } from "./components/route-explanation";
import { RouteList } from "./components/route-list";
import { RoutePdfExport } from "./components/route-pdf-export";
import { RouteWeatherSummary } from "./components/route-weather-summary";
import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
import type { RouteResponse, RouteOriginMode, RouteRecommendationOrigin } from "./route-types";
import type { RouteGroupRoute } from "@/lib/route/route-response-contract";
import {
  getRouteGroupPatternLabel,
  getRouteGroupVisualStyle,
  type RouteMultiRouteDisplayMode,
} from "./route-types";
import { formatBusinessDurationRangeMinutes } from "@/lib/actions/time-contract";
import { EMPTY_ROUTE_GEOMETRY } from "./route-section.model";

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
  return (
    <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
        <RouteIcon size={120} className="text-blue-400" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-10 relative z-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 cmm-text-caption font-black uppercase tracking-[0.3em] text-blue-400">
            <Sparkles size={12} />
            {fr ? "Où agir" : "Where to act"}
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-black text-white tracking-tighter">{totalKm.toFixed(2)}</span>
            <span className="text-xl font-black text-slate-500 tracking-widest uppercase">km</span>
            <span className="text-4xl font-black text-white/20 mx-4">/</span>
            <span className="text-5xl font-black text-white tracking-tighter">{totalMinutes}</span>
            <span className="text-xl font-black text-slate-500 tracking-widest uppercase">min déplacement</span>
          </div>
          <dl className="grid gap-3 text-sm text-white/80 sm:grid-cols-3" data-route-operational-budget>
            <div><dt className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">Déplacement</dt><dd className="mt-1 font-bold">{totalMinutes} min</dd></div>
            <div><dt className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">Durée d’action</dt><dd className="mt-1 font-bold">{serviceMinutes === null ? "Non fiable" : actionDurationLabel}</dd></div>
            <div><dt className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">Créneau total</dt><dd className="mt-1 font-bold">{operationalTotalMinutes === null ? "Non disponible" : operationalTotalLabel}</dd></div>
          </dl>
          <p className="text-xs font-semibold text-slate-300/80">
            Créneau utilisateur : {eventBudgetMinutes === null ? "Non disponible" : formatBusinessDurationRangeMinutes(eventBudgetMinutes)} · budget d’action : {actionBudgetMinutes === null ? "Non disponible" : formatBusinessDurationRangeMinutes(actionBudgetMinutes)} · marge organisation : {organizationMarginMinutes === null ? "Non disponible" : `${organizationMarginMinutes} min`}.
          </p>
          {serviceMinutes === null ? <p className="text-xs font-semibold text-amber-100/80">La durée d’action complète n’est pas encore fiable ; le planner conserve son fonctionnement avec le temps réseau disponible.</p> : null}
          {data.isLoop ? <p className="text-sm font-semibold text-emerald-100/80">
            {groupRoutes.length > 1
              ? `${data.volunteers} bénévoles · ${data.groupCount} groupes · ${data.multiRoute.totalDistanceKm.toFixed(2)} km cumulés`
              : `Boucle de ${totalKm.toFixed(2)} km · départ et arrivée au même endroit`}
          </p> : null}
        </div>
        <div className="text-right space-y-2">
          <p className="cmm-text-caption font-black text-slate-500 uppercase tracking-widest">{fr ? "Priorité moyenne" : "Average priority"}</p>
          <p className="text-6xl font-black text-white tracking-tighter leading-none">{data.scoreBreakdown.priority}</p>
          <button type="button" onClick={onCreateAction} className="mt-4 rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-emerald-300">
            Créer une action avec cet itinéraire
          </button>
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
  return (
    <section aria-label={fr ? "Sélection des groupes" : "Group selection"} className="rounded-[2rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-emerald-100/68">{fr ? "Boucles coordonnées" : "Coordinated loops"}</p>
          <p className="mt-2 text-sm font-semibold text-white/80">{fr ? "Chaque groupe reçoit une boucle différente afin de couvrir davantage de rues." : "Each group receives a different loop to cover more streets."}</p>
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
          {groupRoutes.map((group) => <button key={group.groupIndex} type="button" role="tab" aria-selected={selectedGroupIndex === group.groupIndex} onClick={() => setSelectedGroupIndex(group.groupIndex)} className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-50 transition hover:border-emerald-300/60">{fr ? `Groupe ${group.groupIndex}` : `Group ${group.groupIndex}`}</button>)}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3" role="list" aria-label={fr ? "Légende des boucles" : "Loop legend"}>
        {groupRoutes.map((group) => {
          const visualStyle = getRouteGroupVisualStyle(group.groupIndex, multiRouteDisplayMode);
          const groupLabel = fr ? `Groupe ${group.groupIndex} — ${group.volunteerCount} bénévoles` : `Group ${group.groupIndex} — ${group.volunteerCount} volunteers`;
          return <button key={`summary-${group.groupIndex}`} type="button" onClick={() => setSelectedGroupIndex(group.groupIndex)} role="listitem" aria-label={groupLabel} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-300/40">
            <span className="flex items-center gap-3"><span aria-hidden="true" className="h-1.5 w-10 rounded-full" style={{ backgroundColor: visualStyle.color, backgroundImage: multiRouteDisplayMode === "patterns" ? `repeating-linear-gradient(90deg, ${visualStyle.color} 0 8px, transparent 8px 14px)` : undefined }} /><span className="font-black text-white">{groupLabel}</span></span>
            <p className="mt-2 text-xs text-slate-300">{group.travelDistanceKm.toFixed(2)} km · {group.travelMinutes} min déplacement · {group.operationalBudget?.actionMinutes === null || group.operationalBudget?.actionMinutes === undefined ? "durée d’action indisponible" : `action ${formatBusinessDurationRangeMinutes(group.operationalBudget.actionMinutes)}`} · {group.targetCount} stops</p>
            <p className="mt-1 cmm-text-small font-semibold text-emerald-100/70">{group.operationalBudget?.withinBudget === true ? "Budget d’action respecté" : group.operationalBudget?.withinBudget === false ? "Budget d’action dépassé" : "Budget d’action non vérifiable"}</p>
            {multiRouteDisplayMode === "patterns" ? <p className="mt-1 cmm-text-small font-semibold text-emerald-100/70">{fr ? "Trait : " : "Line: "}{getRouteGroupPatternLabel(group.groupIndex, fr)}</p> : null}
          </button>;
        })}
      </div>
      <p className="mt-4 text-xs text-emerald-100/70">{fr ? `Couverture : ${data.multiRoute.coverageGain.toFixed(2)} · recouvrement des cibles : ${(data.multiRoute.sharedTargetRatio * 100).toFixed(0)} % · distance partagée réseau : ${data.multiRoute.sharedDistanceRatio === null ? "non mesurée" : `${(data.multiRoute.sharedDistanceRatio * 100).toFixed(1)} %`}.` : `Coverage: ${data.multiRoute.coverageGain.toFixed(2)} · shared targets: ${(data.multiRoute.sharedTargetRatio * 100).toFixed(0)}% · network shared distance: ${data.multiRoute.sharedDistanceRatio === null ? "not measured" : `${(data.multiRoute.sharedDistanceRatio * 100).toFixed(1)}%`}.`}</p>
    </section>
  );
}

function RouteMethodology({ data, fr }: { data: RouteResponse; fr: boolean }) {
  return <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
    <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400"><Info size={20} /></div><h3 className="text-xl font-black text-white tracking-tight">{fr ? "Méthode de sélection" : "Selection method"}</h3></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{data.tradeoffs.length > 0 ? data.tradeoffs.map((line, index) => <div key={index} className="p-5 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold text-slate-200 leading-relaxed flex items-center gap-4 group hover:bg-white/10 transition-all"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 group-hover:bg-blue-400" />{line}</div>) : <div className="col-span-2 p-10 rounded-2xl border border-dashed border-white/10 text-center text-slate-200 font-bold text-sm">{fr ? "Aucun ajustement majeur nécessaire." : "No major adjustment needed."}</div>}</div>
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
    {originMode === "map" && !hasRoute ? <RouteMap stops={[]} routeGeometry={EMPTY_ROUTE_GEOMETRY} origin={mapOrigin} onSelectOrigin={setMapOrigin} onClearOrigin={clearMapOrigin} fr={fr} /> : null}
    {data?.weatherContext ? <RouteWeatherSummary context={data.weatherContext} fr={fr} /> : null}
    <AnimatePresence mode="wait">
      {hasRoute && data ? <motion.div initial={{ opacity: 1, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <RouteResultSummary data={data} fr={fr} groupRoutes={groupRoutes} totalKm={totalKm} totalMinutes={totalMinutes} serviceMinutes={serviceMinutes} operationalTotalMinutes={operationalTotalMinutes} actionDurationLabel={actionDurationLabel} operationalTotalLabel={operationalTotalLabel} eventBudgetMinutes={eventBudgetMinutes} actionBudgetMinutes={actionBudgetMinutes} organizationMarginMinutes={organizationMarginMinutes} onCreateAction={onCreateAction} />
        <RouteGroupSelection data={data} fr={fr} groupRoutes={groupRoutes} selectedGroupIndex={selectedGroupIndex} setSelectedGroupIndex={setSelectedGroupIndex} multiRouteDisplayMode={multiRouteDisplayMode} setMultiRouteDisplayMode={setMultiRouteDisplayMode} />
        {hasData ? <RouteMethodology data={data} fr={fr} /> : null}
        <RouteMap stops={visibleStops} routeGeometry={visibleGeometry} groupRoutes={groupRoutes} selectedGroupIndex={selectedGroupIndex} representationMode={multiRouteDisplayMode} origin={data.origin} onSelectOrigin={originMode === "map" ? setMapOrigin : undefined} onClearOrigin={originMode === "map" ? clearMapOrigin : undefined} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} fr={fr} />
        <RoutePdfExport data={data} displayMode={multiRouteDisplayMode} onUsePatterns={() => setMultiRouteDisplayMode("patterns")} />
        <RouteList hasRoute={hasRoute} picks={visibleStops} fr={fr} selectedStopId={selectedStopId} onSelectStop={setSelectedStopId} />
      </motion.div> : null}
    </AnimatePresence>
    {data ? <RouteExplanation data={data} fr={fr} /> : null}
  </>;
}
