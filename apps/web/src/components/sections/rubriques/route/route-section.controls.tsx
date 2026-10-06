import { RouteEventSelector } from "./components/route-event-selector";
import { RouteSummaryCards } from "./components/route-summary-cards";
import { RouteOptionsForm } from "./components/route-constraints-form";
import { RouteOriginControls } from "./route-section.origin-controls";
import { RouteRecommendationTrigger } from "./route-section.trigger";
import type { RouteOptions, RouteOriginMode, RoutePlanningMode, RouteRecommendationOrigin } from "./route-types";
import { Zap } from "lucide-react";

export function RouteOriginAndTriggerControls({
  options, setOptions, fr, planningMode, setPlanningMode, originMode, setOriginMode,
  mapOrigin, clearMapOrigin, originSelectionError, isLoaded, isSignedIn, isLoading,
  isRequestInFlight, isResolvingOrigin, recommendationRequested, requestRecommendation,
}: {
  options: RouteOptions;
  setOptions: React.Dispatch<React.SetStateAction<RouteOptions>>;
  fr: boolean;
  planningMode: RoutePlanningMode;
  setPlanningMode: (mode: RoutePlanningMode) => void;
  originMode: RouteOriginMode;
  setOriginMode: (mode: RouteOriginMode) => void;
  mapOrigin: RouteRecommendationOrigin | null;
  clearMapOrigin: () => void;
  originSelectionError: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  isRequestInFlight: boolean;
  isResolvingOrigin: boolean;
  recommendationRequested: boolean;
  requestRecommendation: () => Promise<void>;
}) {
  return <>
    <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400"><Zap size={20} /></div><h3 className="text-xl font-black text-white tracking-tight">{fr ? "Configuration" : "Settings"}</h3></div>
    <RouteSummaryCards options={options} fr={fr} />
    <RouteEventSelector planningMode={planningMode} setPlanningMode={setPlanningMode} fr={fr} />
    <RouteOriginControls fr={fr} originMode={originMode} setOriginMode={setOriginMode} mapOrigin={mapOrigin} clearMapOrigin={clearMapOrigin} originSelectionError={originSelectionError} />
    <RouteOptionsForm options={options} setOptions={setOptions} fr={fr} />
    <RouteRecommendationTrigger fr={fr} originMode={originMode} mapOrigin={mapOrigin} isLoaded={isLoaded} isSignedIn={isSignedIn} isLoading={isLoading} isRequestInFlight={isRequestInFlight} isResolvingOrigin={isResolvingOrigin} recommendationRequested={recommendationRequested} requestRecommendation={requestRecommendation} />
  </>;
}
