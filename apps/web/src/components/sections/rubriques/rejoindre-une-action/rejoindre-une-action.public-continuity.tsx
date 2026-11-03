"use client";

import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { fetchPublicActionReference, type PublicActionReference } from "@/lib/chat/action-reference-http";
import { formatDate } from "./rejoindre-un-formulaire-section.format";

export type PublicActionContinuityState = {
  actionId: string | null;
  loading: boolean;
  error: string | null;
  reference: PublicActionReference | null;
};

export function usePublicActionContinuity(
  actionId: string | null | undefined,
  fr: boolean,
): PublicActionContinuityState {
  const [state, setState] = useState<PublicActionContinuityState>({
    actionId: null,
    loading: false,
    error: null,
    reference: null,
  });

  useEffect(() => {
    const normalizedActionId = actionId?.trim() || null;
    if (!normalizedActionId) return;

    let active = true;
    void fetchPublicActionReference(normalizedActionId)
      .then((reference) => {
        if (active) setState({ actionId: normalizedActionId, loading: false, error: null, reference });
      })
      .catch(() => {
        if (active) {
          setState({
            actionId: normalizedActionId,
            loading: false,
            error: fr ? "La continuité publique est temporairement indisponible." : "Public continuity is temporarily unavailable.",
            reference: null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [actionId, fr]);

  const normalizedActionId = actionId?.trim() || null;
  if (!normalizedActionId) return { actionId: null, loading: false, error: null, reference: null };
  if (state.actionId !== normalizedActionId) {
    return { actionId: normalizedActionId, loading: true, error: null, reference: null };
  }
  return state;
}

export function PublicActionContinuity({ state, fr }: { state: PublicActionContinuityState; fr: boolean }) {
  if (!state.actionId) return null;
  if (state.loading) {
    return <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3 text-sm font-semibold text-emerald-900">{fr ? "Chargement du retour et des prochaines actions…" : "Loading the retrospective and next actions…"}</p>;
  }
  if (state.error) {
    return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-800">{state.error}</p>;
  }
  const reference = state.reference;
  if (!reference || reference.shareKind !== "result") return null;
  const retrospective = reference.retrospective;
  const recommendations = reference.recommendations ?? [];
  const retrospectiveEntries = retrospective
    ? [
        [fr ? "Ce qui a bien fonctionné" : "What worked well", retrospective.workedWell],
        [fr ? "Ce qui nous a freinés" : "What slowed us down", retrospective.blockers],
        [fr ? "À améliorer la prochaine fois" : "Improve next time", retrospective.improveNextTime],
      ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
    : [];

  return (
    <section aria-labelledby={`join-action-continuity-${reference.id}`} className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div>
        <h3 id={`join-action-continuity-${reference.id}`} className="text-lg font-black text-emerald-950">{fr ? "Merci aux participants" : "Thank you to the participants"}</h3>
        <p className="mt-1 text-sm text-emerald-950/80">{retrospective?.thanksMessage || (fr ? "Merci à toutes les personnes qui ont contribué à cette action." : "Thank you to everyone who contributed to this action.")}</p>
      </div>

      {retrospectiveEntries.length > 0 ? (
        <div className="space-y-2 border-t border-emerald-200 pt-3">
          <h4 className="font-bold text-emerald-950">{fr ? "Retour d’expérience" : "Retrospective"}</h4>
          {retrospectiveEntries.map(([label, value]) => <p key={label} className="text-sm text-slate-700"><strong>{label} : </strong>{value}</p>)}
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="space-y-2 border-t border-emerald-200 pt-3">
          <h4 className="font-bold text-emerald-950">{fr ? "Prochaines actions près de ce secteur" : "Next actions near this area"}</h4>
          <ul className="grid gap-2" aria-label={fr ? "Prochaines actions recommandées" : "Recommended next actions"}>
            {recommendations.map((recommendation) => (
              <li key={recommendation.id} className="flex flex-col gap-2 rounded-xl border border-white/80 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm text-slate-700">
                  <p className="font-bold text-slate-950">{recommendation.title}</p>
                  <p>{formatDate(recommendation.actionDate, fr ? "fr" : "en")}{recommendation.eventStartTime ? ` · ${recommendation.eventStartTime}` : ""} · {recommendation.sector}</p>
                </div>
                <CmmButton href={`/actions/map?actionId=${encodeURIComponent(recommendation.id)}`} tone="secondary" variant="pill" size="sm" className="shrink-0 justify-center">{fr ? "Voir l’action" : "View action"}</CmmButton>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
