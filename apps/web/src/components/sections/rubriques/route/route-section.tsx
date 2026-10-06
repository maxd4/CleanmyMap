"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { useEffectiveAuthState } from "@/lib/auth/use-effective-auth-state";
import { useRouteData } from "./hooks/use-route-data";
import { RouteAssistant } from "./components/route-assistant";
import { RouteOriginAndTriggerControls } from "./route-section.controls";
import { deriveRouteSectionState } from "./route-section.model";
import { RouteResults } from "./route-section.results";
import { getRouteOriginLabel, getRouteRecommendationErrorMessage } from "./route-origin";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Navigation, Info } from "lucide-react";
import { motion } from "framer-motion";
import type { RoutePlanningMode, RouteMultiRouteDisplayMode } from "./route-types";
import {
  createOperationalRouteFromRecommendation,
  createPlannerActionPreparationData,
} from "@/lib/route/route-operational";
import { writePlannerActionHandoff } from "@/lib/route/route-action-handoff";

export function buildPlannerActionHref(
  actionId: string | null | undefined,
  planningMode: RoutePlanningMode,
): string {
  const params = new URLSearchParams({ from: "planner" });
  if (actionId) params.set("actionId", actionId);
  if (planningMode.type === "event-centered") params.set("fromEventId", planningMode.eventId);
  return `/actions/new?${params.toString()}`;
}

export function RouteSection({ actionId }: { actionId?: string | null } = {}) {
  const router = useRouter();
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [multiRouteDisplayMode, setMultiRouteDisplayMode] = useState<RouteMultiRouteDisplayMode>("colors");
  const { isLoaded, isSignedIn } = useEffectiveAuthState();
  const routeData = useRouteData();
  const {
    options, setOptions, data, isLoading, error, picks, totalKm, totalMinutes,
    serviceMinutes, operationalTotalMinutes, hasData, hasRoute, fr,
    recommendationRequested, planningMode, setPlanningMode, originMode,
    setOriginMode, mapOrigin, setMapOrigin, clearMapOrigin, originSelectionError,
    isResolvingOrigin, isRequestInFlight, requestRecommendation,
  } = routeData;
  const derived = deriveRouteSectionState({ data, picks, selectedGroupIndex, fr, serviceMinutes, operationalTotalMinutes });
  const createActionFromRecommendation = () => {
    if (!data) return;
    writePlannerActionHandoff({
      ...(actionId ? { actionId } : {}),
      operationalRoute: createOperationalRouteFromRecommendation(data),
      routeCalibrationContext: data.calibrationContext ?? null,
      plannerProof: data.plannerProof ?? null,
      preparationData: createPlannerActionPreparationData(data, options),
      expiresAt: data.plannerProof?.expiresAt ?? new Date(0).toISOString(),
    });
    router.push(buildPlannerActionHref(actionId, planningMode));
  };
  return (
    <SectionShell id="route" title={fr ? "Où agir" : "Where to act"} subtitle={fr ? "Décidez rapidement où agir selon la priorité opérationnelle, le déplacement et le nombre d’arrêts." : "Choose where to act using operational priority, travel, and the number of stops."} icon={Navigation} gradient="from-blue-500/20 via-indigo-500/10 to-transparent">
      <div className="grid gap-10 xl:grid-cols-[1fr_1.5fr] pt-12 pb-20">
        <aside className="space-y-8">
          <div className="p-8 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
            <RouteOriginAndTriggerControls
              options={options} setOptions={setOptions} fr={fr}
              planningMode={planningMode} setPlanningMode={setPlanningMode}
              originMode={originMode} setOriginMode={setOriginMode}
              mapOrigin={mapOrigin} clearMapOrigin={clearMapOrigin}
              originSelectionError={originSelectionError}
              isLoaded={isLoaded} isSignedIn={isSignedIn} isLoading={isLoading}
              isRequestInFlight={isRequestInFlight} isResolvingOrigin={isResolvingOrigin}
              recommendationRequested={recommendationRequested}
              requestRecommendation={requestRecommendation}
            />
            <RouteAssistant data={data} hasData={hasData} fr={fr} />
          </div>
        </aside>
        <div className="space-y-8">
          {isLoading ? <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6"><CmmSkeleton className="h-12 w-1/3 rounded-xl bg-white/5" /><div className="grid grid-cols-2 gap-6"><CmmSkeleton className="h-24 rounded-2xl bg-white/5" /><CmmSkeleton className="h-24 rounded-2xl bg-white/5" /></div><CmmSkeleton className="h-[400px] rounded-[2rem] bg-white/5" /></div> : null}
          {error ? <motion.div initial={{ opacity: 1, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-10 rounded-[3rem] border border-rose-500/20 bg-rose-500/5 backdrop-blur-3xl shadow-2xl flex items-center gap-8"><div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500"><Info size={32} /></div><p className="text-lg font-black text-white tracking-tight leading-snug">{getRouteRecommendationErrorMessage(error, fr)}</p></motion.div> : null}
          {derived.dataStatusMessage && data ? <div role="status" data-route-status={data.status} data-route-data-status={data.dataStatus} className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-50"><p>{derived.dataStatusMessage}</p>{data.isTruncated ? <p className="mt-1 text-xs font-medium text-amber-100/75">{fr ? "Le volume chargé a atteint la limite de recommandation." : "The loaded volume reached the recommendation limit."}</p> : null}{data.sourceHealth.warnings.map((warning) => <p key={warning} className="mt-1 text-xs font-medium text-amber-100/75">{warning}</p>)}</div> : null}
          {data ? <p role="status" data-route-origin-source={data.origin.source} className="rounded-2xl border border-blue-300/15 bg-blue-500/5 px-5 py-3 text-sm font-semibold text-blue-50">{fr ? "Point de départ utilisé : " : "Starting point used: "}{getRouteOriginLabel(data.origin.source, fr)}</p> : null}
          <RouteResults
            data={data} fr={fr} hasData={hasData} hasRoute={hasRoute}
            originMode={originMode} mapOrigin={mapOrigin} setMapOrigin={setMapOrigin}
            clearMapOrigin={clearMapOrigin} selectedStopId={selectedStopId}
            setSelectedStopId={setSelectedStopId} selectedGroupIndex={selectedGroupIndex}
            setSelectedGroupIndex={setSelectedGroupIndex}
            multiRouteDisplayMode={multiRouteDisplayMode}
            setMultiRouteDisplayMode={setMultiRouteDisplayMode}
            groupRoutes={derived.groupRoutes} visibleStops={derived.visibleStops}
            visibleGeometry={derived.visibleGeometry} totalKm={totalKm}
            totalMinutes={totalMinutes} serviceMinutes={serviceMinutes}
            operationalTotalMinutes={operationalTotalMinutes}
            actionDurationLabel={derived.actionDurationLabel}
            operationalTotalLabel={derived.operationalTotalLabel}
            eventBudgetMinutes={derived.eventBudgetMinutes}
            actionBudgetMinutes={derived.actionBudgetMinutes}
            organizationMarginMinutes={derived.organizationMarginMinutes}
            onCreateAction={createActionFromRecommendation}
          />
        </div>
      </div>
    </SectionShell>
  );
}
