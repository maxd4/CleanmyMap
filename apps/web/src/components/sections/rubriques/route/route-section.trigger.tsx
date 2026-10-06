import Link from "next/link";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
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
  requestRecommendation: () => Promise<void>;
}) {
  const disabled = isLoading || isRequestInFlight || (originMode === "map" && !mapOrigin);
  const label = originMode === "map" && !mapOrigin
    ? fr ? "Choisir un point sur la carte" : "Choose a point on the map"
    : isResolvingOrigin
      ? fr ? "Localisation en cours…" : "Locating…"
      : isLoading || isRequestInFlight
        ? fr ? "Calcul en cours…" : "Calculating…"
        : fr
          ? recommendationRequested ? "Recalculer la recommandation" : "Calculer la recommandation"
          : recommendationRequested ? "Recalculate recommendation" : "Calculate recommendation";
  return <div className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(13,46,34,0.88)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
    {isLoaded && isSignedIn ? <button type="button" onClick={() => { void requestRecommendation(); }} disabled={disabled} aria-busy={isResolvingOrigin || isLoading || isRequestInFlight} className="min-h-11 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">{label}</button> : <Link href={buildSignInRedirectHref("/actions/new?panel=itineraire")} className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-center text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-400">{fr ? "Se connecter pour calculer" : "Sign in to calculate"}</Link>}
  </div>;
}
