"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Route, Users2 } from "lucide-react";
import type { ActionListItem } from "@/lib/actions/types";
import type { JoinableActionHistoryItem } from "@/lib/actions/participation/group-participation";
import { CmmButton } from "@/components/ui/cmm-button";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

function actionTitle(item: ActionListItem): string {
  return item.contract?.metadata.preparationData?.actionTitle?.trim() || item.location_label;
}

function finalParticipants(item: ActionListItem): number | null {
  const count = item.contract?.metadata.volunteerParticipation?.participantsCount;
  return typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : null;
}

type ClaimState = Pick<
  JoinableActionHistoryItem,
  "participationStatus" | "participationSource"
>;

function claimStatusLabel(state: ClaimState, fr: boolean): string {
  if (state.participationStatus === "confirmed") {
    return fr ? "Participation confirmée" : "Participation confirmed";
  }
  if (state.participationStatus === "pending") {
    return fr ? "Participation à confirmer" : "Participation awaiting confirmation";
  }
  return fr ? "Demande refusée" : "Request refused";
}

export function PastActionsPanel({
  items,
  loading,
  error,
  fr,
  focusedActionId,
  authenticated = false,
  historyItems = [],
}: {
  items: ActionListItem[];
  loading: boolean;
  error: string | null;
  fr: boolean;
  focusedActionId?: string | null;
  authenticated?: boolean;
  historyItems?: readonly JoinableActionHistoryItem[];
}) {
  const [claimOverrides, setClaimOverrides] = useState<Record<string, ClaimState>>({});
  const [claimingActionId, setClaimingActionId] = useState<string | null>(null);
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const historyByActionId = useMemo(
    () => new Map(historyItems.map((item) => [item.id, {
      participationStatus: item.participationStatus,
      participationSource: item.participationSource,
    }] as const)),
    [historyItems],
  );

  async function requestClaim(actionId: string) {
    if (claimingActionId) return;
    setClaimingActionId(actionId);
    setClaimErrors((previous) => ({ ...previous, [actionId]: "" }));
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/participation-claim`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        participationStatus?: ClaimState["participationStatus"];
        participationSource?: ClaimState["participationSource"];
        error?: string;
      };
      if (!response.ok || !payload.participationStatus || !payload.participationSource) {
        setClaimErrors((previous) => ({
          ...previous,
          [actionId]: payload.error || (fr ? "La demande n’a pas pu être envoyée." : "The request could not be sent."),
        }));
        return;
      }
      setClaimOverrides((previous) => ({
        ...previous,
        [actionId]: {
          participationStatus: payload.participationStatus!,
          participationSource: payload.participationSource!,
        },
      }));
    } catch {
      setClaimErrors((previous) => ({
        ...previous,
        [actionId]: fr ? "La demande n’a pas pu être envoyée." : "The request could not be sent.",
      }));
    } finally {
      setClaimingActionId(null);
    }
  }

  useEffect(() => {
    if (!focusedActionId || loading) return;
    const target = document.getElementById(`join-action-${focusedActionId}`);
    if (!(target instanceof HTMLElement)) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.focus({ preventScroll: true });
  }, [focusedActionId, items.length, loading]);

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 md:p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{fr ? "Actions passées" : "Past actions"}</h2>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">{formatCount(items.length)}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          {fr ? "Les résultats affichés proviennent des déclarations publiques terminées. Si vous y avez réellement participé, vous pouvez demander votre rattachement." : "These results come from public completed declarations. If you actually participated, you can request to be linked."}
        </p>
      </div>

      {loading ? <p className="text-sm font-semibold text-slate-700">{fr ? "Chargement des actions passées..." : "Loading past actions..."}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">{fr ? "Aucune action passée publique pour le moment." : "No public past action yet."}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const participants = finalParticipants(item);
          const hasRoute = Boolean(item.geometry_kind || item.contract?.geometry.coordinates.length);
          const claimState = claimOverrides[item.id] ?? historyByActionId.get(item.id) ?? null;
          return (
            <article
              key={item.id}
              id={`join-action-${item.id}`}
              tabIndex={focusedActionId === item.id ? -1 : undefined}
              aria-describedby={focusedActionId === item.id ? `join-action-${item.id}-target` : undefined}
              className={`rounded-[1.2rem] border bg-white p-4 shadow-sm ${focusedActionId === item.id ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-300/80 ring-offset-2" : "border-slate-200"}`}
            >
              {focusedActionId === item.id ? (
                <p id={`join-action-${item.id}-target`} className="mb-3 inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                  {fr ? "Action ciblée par le lien" : "Action targeted by this link"}
                </p>
              ) : null}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-950">{actionTitle(item)}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin size={14} className="text-slate-400" />{item.location_label}</p>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />{formatDate(item.action_date, fr ? "fr" : "en")}</p>
                  {participants !== null ? <p className="flex items-center gap-2"><Users2 size={14} className="text-slate-400" />{formatCount(participants)} {fr ? "participants rattachés" : "linked participants"}</p> : null}
                  {item.waste_kg !== null ? <p>{formatCount(item.waste_kg)} kg {fr ? "collectés" : "collected"}</p> : null}
                  {item.cigarette_butts !== null ? <p>{formatCount(item.cigarette_butts)} {fr ? "mégots collectés" : "cigarette butts collected"}</p> : null}
                  <p className="flex items-center gap-2"><Route size={14} className="text-slate-400" />{hasRoute ? (fr ? "Parcours final/opérationnel disponible" : "Final/operational route available") : (fr ? "Localisation seule" : "Location only")}</p>
                  <p className="text-sm font-semibold text-slate-700">{formatBusinessDurationMinutes(item.duration_minutes)} {fr ? "finales" : "final"}</p>
                </div>
                <p className="text-xs text-slate-500">{fr ? "Organisateur : " : "Organizer: "}{item.association_name || item.actor_name || "—"}</p>
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {claimState ? (
                    <p className="text-sm font-bold text-emerald-800" role="status">{claimStatusLabel(claimState, fr)}</p>
                  ) : authenticated ? (
                    <CmmButton
                      type="button"
                      tone="primary"
                      variant="pill"
                      className="w-full justify-center text-xs"
                      loading={claimingActionId === item.id}
                      onClick={() => void requestClaim(item.id)}
                    >
                      {fr ? "J’ai participé à cette action" : "I participated in this action"}
                    </CmmButton>
                  ) : (
                    <CmmButton
                      href={`/sign-in?redirect_url=${encodeURIComponent("/sections/rejoindre-une-action?tab=past")}`}
                      tone="primary"
                      variant="pill"
                      className="w-full justify-center text-xs"
                    >
                      {fr ? "J’ai participé à cette action" : "I participated in this action"}
                    </CmmButton>
                  )}
                  {claimErrors[item.id] ? <p className="text-xs font-semibold text-rose-700" role="alert">{claimErrors[item.id]}</p> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
