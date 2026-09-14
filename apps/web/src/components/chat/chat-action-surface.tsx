"use client";

import { CalendarDays, MapPin, MessageCircle, Route, Users2 } from "lucide-react";
import type { ActionListItem } from "@/lib/actions/types";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import { extractEventRefFromNotes } from "@/lib/actions/event-link";

function titleFor(item: ActionListItem): string {
  return item.contract?.metadata.preparationData?.actionTitle?.trim() || item.location_label;
}

function plannedParticipants(item: ActionListItem): number {
  const planned = item.contract?.metadata.preparationData?.volunteerParticipation?.participantsCount;
  return typeof planned === "number" && Number.isFinite(planned)
    ? Math.max(0, Math.trunc(planned))
    : Math.max(0, Math.trunc(item.volunteers_count));
}

function timeWindowFor(item: ActionListItem): string | null {
  const start = item.contract?.dates.eventStartTime ?? null;
  const end = item.contract?.dates.eventEndTime ?? null;
  return start || end ? [start, end].filter(Boolean).join(" – ") : null;
}

function stateLabel(item: ActionListItem): string {
  if (isActionStartInFuture({ action_date: item.action_date, event_start_time: item.contract?.dates.eventStartTime ?? null })) {
    return "À venir";
  }
  const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const start = item.contract?.dates.eventStartTime ?? "00:00";
  const end = item.contract?.dates.eventEndTime ?? null;
  if (item.action_date === currentDate && end && currentTime >= start && currentTime <= end) {
    return "En cours";
  }
  return "Passée ou en cours";
}

export function ChatActionSurface({
  items,
  activeActionId,
  onSelectAction,
  loading,
  error,
  tone = "dark",
}: {
  items: ActionListItem[];
  activeActionId: string | null;
  onSelectAction: (actionId: string) => void;
  loading: boolean;
  error: string | null;
  tone?: "light" | "dark";
}) {
  const isLight = tone === "light";
  return (
    <section className="space-y-2">
      <p className={`px-2 text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        Actions
      </p>
      {loading ? <p className="px-2 text-xs text-slate-500">Chargement des actions...</p> : null}
      {error ? <p className="px-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="px-2 text-xs text-slate-500">Aucune action publiée.</p> : null}
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.id === activeActionId;
          const timeWindow = timeWindowFor(item);
          const eventRef = extractEventRefFromNotes(item.notes ?? item.contract?.metadata.notes);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAction(item.id)}
              aria-pressed={active}
              className={`w-full rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                active
                  ? isLight ? "border-sky-200 bg-sky-50 text-sky-950" : "border-sky-500/40 bg-sky-500/10 text-sky-100"
                  : isLight ? "border-transparent hover:bg-white" : "border-transparent hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-start gap-2">
                <MessageCircle size={15} className="mt-0.5 shrink-0 text-sky-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black">{titleFor(item)}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">{stateLabel(item)}</span>
                  <span className="mt-1 block space-y-0.5 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><CalendarDays size={11} />{item.action_date}{timeWindow ? ` · ${timeWindow}` : ""}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} />{item.location_label}</span>
                    <span className="flex items-center gap-1"><Users2 size={11} />{plannedParticipants(item)} participants prévus · {formatBusinessDurationMinutes(item.duration_minutes)} estimés</span>
                    <span className="flex items-center gap-1"><Route size={11} />{item.geometry_kind ? "Itinéraire prévu" : "Lieu uniquement"}</span>
                    {eventRef ? <span className="block">Événement : {eventRef}</span> : null}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
