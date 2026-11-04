import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { CmmButton } from "@/components/ui/cmm-button";
import type { RouteOriginMode, RouteRecommendationOrigin } from "./route-types";

export function RouteRecommendationTrigger({
  fr,
  originMode,
  mapOrigin,
  isLoaded,
  isSignedIn,
  isLoading,
  isRequestInFlight,
  isResolvingOrigin,
  recommendationRequested,
  planningModeError,
  requestRecommendation,
}: {
  fr: boolean;
  originMode: RouteOriginMode;
  mapOrigin: RouteRecommendationOrigin | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  isRequestInFlight: boolean;
  isResolvingOrigin: boolean;
  recommendationRequested: boolean;
  planningModeError: string | null;
  requestRecommendation: () => Promise<void>;
}) {
  const disabled = isLoading || isRequestInFlight || Boolean(planningModeError) || (originMode === "map" && !mapOrigin);
  const label = originMode === "map" && !mapOrigin
    ? fr ? "Choisir un point sur la carte" : "Choose a point on the map"
    : isResolvingOrigin
      ? fr ? "Localisation en cours…" : "Locating…"
      : isLoading || isRequestInFlight
        ? fr ? "Calcul en cours…" : "Calculating…"
        : fr
          ? recommendationRequested ? "Recalculer la recommandation" : "Calculer la recommandation"
          : recommendationRequested ? "Recalculate recommendation" : "Calculate recommendation";
  return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
    {planningModeError ? <p role="alert" className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">{planningModeError}</p> : null}
    {isLoaded && isSignedIn ? <CmmButton tone="primary" width="wide" loading={isResolvingOrigin || isLoading || isRequestInFlight} disabled={disabled} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ requestRecommendation(); }} className="w-full justify-center text-center font-black uppercase tracking-[0.12em]">{label}</CmmButton> : <CmmButton href={buildSignInRedirectHref("/actions/new?panel=itineraire")} tone="primary" width="wide" className="w-full justify-center text-center font-black uppercase tracking-[0.12em]">{fr ? "Se connecter pour calculer" : "Sign in to calculate"}</CmmButton>}
  </div>;
}
