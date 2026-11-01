import { RouteEventSelector } from "./components/route-event-selector";
import { RouteSummaryCards } from "./components/route-summary-cards";
import { RouteOptionsForm } from "./components/route-constraints-form";
import { RouteOriginControls } from "./route-section.origin-controls";
import { RouteRecommendationTrigger } from "./route-section.trigger";
import type { RouteOptions, RouteOriginMode, RoutePlanningMode, RouteRecommendationOrigin } from "./route-types";
import { ROUTE_TERRITORIAL_GUIDED_VERSION } from "@/lib/route/route-planning-mode";
import type { RouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";
import { Zap } from "lucide-react";
import { RouteGuidedEditor } from "./components/route-guided-editor";

export function RouteOriginAndTriggerControls({
  options, setOptions, fr, planningMode, setPlanningMode, originMode, setOriginMode,
  mapOrigin, setMapOrigin, clearMapOrigin, originSelectionError, isLoaded, isSignedIn, isLoading,
  planningModeValidationError, isRequestInFlight, isResolvingOrigin, recommendationRequested, requestRecommendation,
}: {
  options: RouteOptions;
  setOptions: React.Dispatch<React.SetStateAction<RouteOptions>>;
  fr: boolean;
  planningMode: RoutePlanningMode;
  setPlanningMode: (mode: RoutePlanningMode) => void;
  originMode: RouteOriginMode;
  setOriginMode: (mode: RouteOriginMode) => void;
  mapOrigin: RouteRecommendationOrigin | null;
  setMapOrigin: (origin: RouteRecommendationOrigin) => void;
  clearMapOrigin: () => void;
  originSelectionError: boolean;
  planningModeValidationError: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  isRequestInFlight: boolean;
  isResolvingOrigin: boolean;
  recommendationRequested: boolean;
  requestRecommendation: () => Promise<void>;
}) {
  const handlePlanningModeChange = (mode: RoutePlanningMode) => {
    setPlanningMode(mode);
    if (mode.type !== "territorial-guided" || mode.version !== ROUTE_TERRITORIAL_GUIDED_VERSION) return;
    const guidedMode = mode as RouteTerritorialGuidedMode;
    const volunteers = guidedMode.groups.reduce(
      (total, group) => total + (group.volunteerCount ?? 0),
      0,
    );
    setOptions((previous) => ({
      ...previous,
      volunteers,
      groupCount: guidedMode.groups.length,
      travelBudgetMinutes: guidedMode.budget.totalMinutes,
    }));
  };

  return <>
    <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400"><Zap size={20} /></div><h3 className="text-xl font-black text-white tracking-tight">{fr ? "Configuration" : "Settings"}</h3></div>
    <RouteSummaryCards options={options} fr={fr} />
    <RouteEventSelector
      planningMode={planningMode}
      setPlanningMode={handlePlanningModeChange}
      volunteers={options.volunteers}
      groupCount={options.groupCount}
      fr={fr}
    />
    {planningMode.type === "territorial-guided" && planningMode.version === ROUTE_TERRITORIAL_GUIDED_VERSION ? (
      <RouteGuidedEditor
        mode={planningMode as RouteTerritorialGuidedMode}
        options={options}
        origin={mapOrigin}
        fr={fr}
        onChange={handlePlanningModeChange}
        onSelectOrigin={(origin) => {
          setOriginMode("map");
          setMapOrigin(origin);
        }}
      />
    ) : null}
    <RouteOriginControls fr={fr} options={options} setOptions={setOptions} originMode={originMode} setOriginMode={setOriginMode} mapOrigin={mapOrigin} clearMapOrigin={clearMapOrigin} originSelectionError={originSelectionError} />
    <RouteOptionsForm
      options={options}
      setOptions={setOptions}
      fr={fr}
      guided={planningMode.type === "territorial-guided" && planningMode.version === ROUTE_TERRITORIAL_GUIDED_VERSION}
    />
    <RouteRecommendationTrigger fr={fr} originMode={originMode} mapOrigin={mapOrigin} isLoaded={isLoaded} isSignedIn={isSignedIn} isLoading={isLoading} isRequestInFlight={isRequestInFlight} isResolvingOrigin={isResolvingOrigin} recommendationRequested={recommendationRequested} planningModeError={planningModeValidationError} requestRecommendation={requestRecommendation} />
  </>;
}
