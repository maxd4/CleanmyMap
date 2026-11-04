import type { RoutePollutionRelevanceAssessment, RoutePollutionRelevanceWarning } from "@/lib/route/route-pollution-relevance";
import type { RouteNearestRelevantSearch } from "@/lib/route/route-nearest-relevant";
import { CmmButton } from "@/components/ui/cmm-button";

function categoryLabel(category: RoutePollutionRelevanceAssessment["selectedCategory"], fr: boolean): string {
  if (category === "waste") return fr ? "déchets" : "waste";
  if (category === "cigaretteButts") return fr ? "mégots" : "cigarette butts";
  return fr ? "mixte" : "mixed";
}

function confidenceLabel(
  score: number | null,
  fr: boolean,
): string {
  return score === null
    ? (fr ? "inconnue" : "unknown")
    : `${Math.round(score * 100)} %`;
}

function warningLabel(warning: RoutePollutionRelevanceWarning, fr: boolean): string | null {
  if (warning === "red") return fr ? "Alerte : pertinence faible pour cet itinéraire." : "Warning: low relevance for this route.";
  if (warning === "orange") return fr ? "Alerte : pertinence limitée pour cet itinéraire." : "Warning: limited relevance for this route.";
  if (warning === "unavailable") return fr ? "Pertinence non évaluable." : "Relevance cannot be assessed.";
  return null;
}

function scoreLabel(score: number | null, fr: boolean): string {
  return score === null
    ? (fr ? "Pertinence non évaluable" : "Relevance cannot be assessed")
    : `${Number.isInteger(score) ? score : score.toFixed(2)} / 100`;
}

function warningTone(warning: RoutePollutionRelevanceWarning): string {
  if (warning === "red") return "border-rose-300/45 bg-rose-500/15 text-rose-50";
  if (warning === "orange") return "border-orange-300/45 bg-orange-400/15 text-orange-50";
  if (warning === "unavailable") return "border-slate-300/20 bg-white/[0.05] text-slate-100";
  return "border-emerald-300/25 bg-emerald-400/10 text-emerald-50";
}

export function RoutePollutionRelevanceCard({
  assessment,
  fr,
  onFindNearestRelevantRoute,
  nearestRelevantSearch,
}: {
  assessment: RoutePollutionRelevanceAssessment;
  fr: boolean;
  onFindNearestRelevantRoute?: () => void;
  nearestRelevantSearch?: RouteNearestRelevantSearch;
}) {
  const warning = warningLabel(assessment.warning, fr);
  const showAlternative = assessment.alternativeSearch.relevant && Boolean(onFindNearestRelevantRoute);
  return (
    <section
      aria-labelledby="route-pollution-relevance-title"
      data-route-pollution-relevance
      data-route-pollution-warning={assessment.warning}
      className={`rounded-2xl border p-4 ${warningTone(assessment.warning)}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p id="route-pollution-relevance-title" className="text-xs font-black uppercase tracking-[0.16em] text-current/75">
            {fr ? "Pertinence théorique" : "Theoretical relevance"}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight" data-route-pollution-score>
            {scoreLabel(assessment.score, fr)}
          </p>
          <p className="mt-1 text-xs font-semibold text-current/80">
            {categoryLabel(assessment.selectedCategory, fr)} · {fr ? "confiance" : "confidence"} {confidenceLabel(assessment.confidence.score, fr)}
          </p>
        </div>
        <p className="max-w-sm text-xs font-semibold leading-relaxed text-current/80">
          {fr ? "Référence parisienne : " : "Paris reference: "}{assessment.reference?.label ?? (fr ? "indisponible" : "unavailable")}
        </p>
      </div>
      <p className="mt-3 text-xs font-semibold leading-relaxed text-current/75">
        {fr
          ? "Ce score exprime un potentiel théorique relatif, pas une mesure de pollution actuelle."
          : "This score expresses a relative theoretical potential, not a measurement of current pollution."}
      </p>
      {warning ? <p role="status" aria-live="polite" className="mt-3 text-sm font-black" data-route-pollution-warning-message>{warning}</p> : null}
      {assessment.groups.length > 1 ? (
        <div className="mt-3 border-t border-current/15 pt-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-current/75">{fr ? "Par groupe" : "By group"}</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2" aria-label={fr ? "Pertinence théorique par groupe" : "Theoretical relevance by group"}>
            {assessment.groups.map((group) => (
              <li key={group.groupIndex} role={group.warning !== "none" ? "status" : undefined} aria-live={group.warning !== "none" ? "polite" : undefined} className="rounded-xl border border-current/15 bg-black/10 px-3 py-2 text-xs font-semibold">
                <span className="font-black">{fr ? `Groupe ${group.groupIndex}` : `Group ${group.groupIndex}`}</span>
                <span className="ml-2">{scoreLabel(group.score, fr)}</span>
                {group.warning !== "none" ? <span className="mt-1 block font-black">{warningLabel(group.warning, fr)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showAlternative ? (
        <CmmButton
          type="button"
          tone="secondary"
          size="sm"
          onClick={onFindNearestRelevantRoute}
          className="mt-4 w-full justify-center text-center font-black sm:w-auto"
        >
          {fr ? "Trouver l’itinéraire pertinent le plus proche" : "Find the nearest relevant route"}
        </CmmButton>
      ) : null}
      {nearestRelevantSearch ? (
        <div className="mt-4 border-t border-current/15 pt-3 text-xs font-semibold leading-relaxed" data-route-nearest-relevant-search={nearestRelevantSearch.status}>
          <p className="font-black">
            {nearestRelevantSearch.status === "found"
              ? (fr ? "Itinéraire pertinent trouvé" : "Relevant route found")
              : (fr ? "Recherche alternative non suffisante" : "Alternative search was not sufficient")}
          </p>
          <p className="mt-1">
            {fr ? "Score avant / après : " : "Score before / after: "}
            {nearestRelevantSearch.scoreBefore ?? "—"} / {nearestRelevantSearch.scoreAfter ?? "—"}
            {nearestRelevantSearch.accessDistanceKm !== null
              ? ` · ${nearestRelevantSearch.accessDistanceKm.toFixed(2)} km d’accès piéton · ${nearestRelevantSearch.accessDurationMinutes ?? "—"} min d’accès`
              : " · distance d’accès indisponible"}
          </p>
          {nearestRelevantSearch.rendezvous ? (
            <p className="mt-1">
              {fr ? "Nouveau rendez-vous : " : "New meeting point: "}
              {nearestRelevantSearch.rendezvous.latitude.toFixed(5)}, {nearestRelevantSearch.rendezvous.longitude.toFixed(5)}
              {nearestRelevantSearch.routingStatus === "fallback" ? " · routage estimé" : " · réseau piéton"}
            </p>
          ) : null}
          {nearestRelevantSearch.bestAttempt ? (
            <p className="mt-1 text-current/75">
              {fr ? "Meilleur résultat identifié : " : "Best identified result: "}
              {nearestRelevantSearch.bestAttempt.score ?? "—"} / 100 · {fr ? "insuffisant" : "insufficient"}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
