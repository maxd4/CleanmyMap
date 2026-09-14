"use client";

import { useEffect } from "react";
import { CalendarDays, MapPin, Route, Users2 } from "lucide-react";
import type { ActionListItem } from "@/lib/actions/types";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

function actionTitle(item: ActionListItem): string {
  return item.contract?.metadata.preparationData?.actionTitle?.trim() || item.location_label;
}

function finalParticipants(item: ActionListItem): number | null {
  const count = item.contract?.metadata.volunteerParticipation?.participantsCount;
  return typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : null;
}

export function PastActionsPanel({
  items,
  loading,
  error,
  fr,
  focusedActionId,
}: {
  items: ActionListItem[];
  loading: boolean;
  error: string | null;
  fr: boolean;
  focusedActionId?: string | null;
}) {
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
          {fr ? "Les résultats affichés proviennent des déclarations publiques terminées. Aucune participation ne peut être ajoutée depuis cette vue." : "These results come from public completed declarations. Participation cannot be added from this view."}
        </p>
      </div>

      {loading ? <p className="text-sm font-semibold text-slate-700">{fr ? "Chargement des actions passées..." : "Loading past actions..."}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">{fr ? "Aucune action passée publique pour le moment." : "No public past action yet."}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const participants = finalParticipants(item);
          const hasRoute = Boolean(item.geometry_kind || item.contract?.geometry.coordinates.length);
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
