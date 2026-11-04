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
import { CmmCard } from "@/components/ui/cmm-card";
import { Info } from "lucide-react";
import { motion } from "framer-motion";
import type { RoutePlanningMode, RouteMultiRouteDisplayMode } from "./route-types";
import {
  createOperationalRouteFromRecommendation,
  createPlannerActionPreparationData,
} from "@/lib/route/route-operational";
import { writePlannerActionHandoff } from "@/lib/route/route-action-handoff";
import type { RouteRiskHeatmapCategory } from "@/lib/route/route-risk-heatmap-contract";

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
  const [riskHeatmapCategory, setRiskHeatmapCategory] = useState<RouteRiskHeatmapCategory>("mixed");
  const { isLoaded, isSignedIn } = useEffectiveAuthState();
  const routeData = useRouteData();
  const {
    options, setOptions, data, isLoading, error, picks, totalKm, totalMinutes,
    serviceMinutes, operationalTotalMinutes, hasData, hasRoute, fr,
    recommendationRequested, planningMode, setPlanningMode, originMode,
    setOriginMode, mapOrigin, setMapOrigin, setZoneCenter, clearMapOrigin, originSelectionError,
    planningModeValidationError, isResolvingOrigin, isRequestInFlight, requestRecommendation,
  } = routeData;
  const derived = deriveRouteSectionState({ data, picks, selectedGroupIndex, fr, serviceMinutes, operationalTotalMinutes });
  const showResultsColumn = hasData || isLoading || Boolean(error) || originMode === "map" || options.startLocation?.mode === "zone";
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
    <div data-route-planner className="space-y-4">
      <div className={`grid items-start gap-4 ${showResultsColumn ? "xl:grid-cols-[minmax(19rem,0.78fr)_minmax(0,1.42fr)]" : "xl:grid-cols-1"}`}>
        <aside className={`min-w-0 space-y-4 ${showResultsColumn ? "xl:sticky xl:top-4" : ""}`}>
          <div className="space-y-3">
            <RouteOriginAndTriggerControls
              options={options} setOptions={setOptions} fr={fr}
              planningMode={planningMode} setPlanningMode={setPlanningMode}
              originMode={originMode} setOriginMode={setOriginMode}
              mapOrigin={mapOrigin} setMapOrigin={setMapOrigin} clearMapOrigin={clearMapOrigin}
              originSelectionError={originSelectionError}
              planningModeValidationError={planningModeValidationError}
              isLoaded={isLoaded} isSignedIn={isSignedIn} isLoading={isLoading}
              isRequestInFlight={isRequestInFlight} isResolvingOrigin={isResolvingOrigin}
              recommendationRequested={recommendationRequested}
              requestRecommendation={requestRecommendation}
            />
            <RouteAssistant data={data} hasData={hasData} fr={fr} />
          </div>
        </aside>
        <section aria-label={fr ? "Résultats de l’itinéraire" : "Route results"} className="min-w-0 space-y-4">
          {isLoading ? <CmmCard tone="emerald" variant="muted" size="md" className="space-y-4"><CmmSkeleton className="h-8 w-1/3 rounded-xl" /><div className="grid grid-cols-2 gap-3"><CmmSkeleton className="h-20 rounded-2xl" /><CmmSkeleton className="h-20 rounded-2xl" /></div><CmmSkeleton className="h-[min(48vh,28rem)] rounded-2xl" /></CmmCard> : null}
          {error ? <motion.div initial={{ opacity: 1, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-950"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><Info size={20} aria-hidden="true" /></div><p className="text-sm font-bold leading-snug">{getRouteRecommendationErrorMessage(error, fr)}</p></motion.div> : null}
          {derived.dataStatusMessage && data ? <div role="status" data-route-status={data.status} data-route-data-status={data.dataStatus} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"><p>{derived.dataStatusMessage}</p>{data.isTruncated ? <p className="mt-1 text-xs font-medium text-amber-900/75">{fr ? "Le volume chargé a atteint la limite de recommandation." : "The loaded volume reached the recommendation limit."}</p> : null}{data.sourceHealth.warnings.map((warning) => <p key={warning} className="mt-1 text-xs font-medium text-amber-900/75">{warning}</p>)}</div> : null}
          {data ? <p role="status" data-route-origin-source={data.origin.source} className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-950">{fr ? "Point de départ utilisé : " : "Starting point used: "}{getRouteOriginLabel(data.origin.source, fr)}</p> : null}
          <RouteResults
            data={data} fr={fr} hasData={hasData} hasRoute={hasRoute}
            originMode={originMode} mapOrigin={mapOrigin} setMapOrigin={setMapOrigin}
            clearMapOrigin={clearMapOrigin} selectedStopId={selectedStopId}
            startZone={options.startLocation?.mode === "zone" ? options.startLocation.zone : null}
            onSelectZoneCenter={setZoneCenter}
            setSelectedStopId={setSelectedStopId} selectedGroupIndex={selectedGroupIndex}
            setSelectedGroupIndex={setSelectedGroupIndex}
            multiRouteDisplayMode={multiRouteDisplayMode}
            setMultiRouteDisplayMode={setMultiRouteDisplayMode}
            riskHeatmapCategory={riskHeatmapCategory}
            setRiskHeatmapCategory={setRiskHeatmapCategory}
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
        </section>
      </div>
    </div>
  );
}
