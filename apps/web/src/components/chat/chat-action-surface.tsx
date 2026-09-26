"use client";

import { CalendarDays, MapPin, MessageCircle } from "lucide-react";
import type { ActionListItem } from "@/lib/actions/types";
import { isActionStartInFuture } from "@/lib/actions/temporal";

function titleFor(item: ActionListItem): string {
  return item.contract?.metadata.preparationData?.actionTitle?.trim() || item.location_label;
}

export type ChatActionDisplayState = "upcoming" | "ongoing" | "past";

export function getChatActionDisplayState(
  item: ActionListItem,
  now = new Date(),
): ChatActionDisplayState {
  if (isActionStartInFuture({ action_date: item.action_date, event_start_time: item.contract?.dates.eventStartTime ?? null }, now)) {
    return "upcoming";
  }
  const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const start = item.contract?.dates.eventStartTime ?? "00:00";
  const end = item.contract?.dates.eventEndTime ?? null;
  if (
    item.action_date === currentDate &&
    currentTime >= start &&
    (!end || currentTime <= end)
  ) {
    return "ongoing";
  }
  return "past";
}

function stateLabel(state: ChatActionDisplayState): string {
  return state === "upcoming" ? "À venir" : state === "ongoing" ? "En cours" : "Passée";
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
  const activeAndCurrentItems = items.filter((item) => getChatActionDisplayState(item) !== "past");
  const pastItems = items.filter((item) => getChatActionDisplayState(item) === "past");

  const renderAction = (item: ActionListItem) => {
    const state = getChatActionDisplayState(item);
    const active = item.id === activeActionId;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectAction(item.id)}
        aria-pressed={active}
        className={`w-full rounded-xl border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
          active
            ? isLight ? "border-pink-200 bg-pink-50 text-pink-950" : "border-pink-500/40 bg-pink-500/10 text-pink-100"
            : isLight ? "border-transparent hover:bg-white" : "border-transparent hover:bg-slate-800/50"
        }`}
      >
        <span className="flex items-start gap-2">
          <MessageCircle size={15} className="mt-0.5 shrink-0 text-pink-600" />
          <span className="min-w-0 flex-1">
            <span className="block break-words cmm-text-small font-bold">{titleFor(item)}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 cmm-text-caption text-slate-500">
              <span className="inline-flex items-center gap-1"><CalendarDays size={11} aria-hidden="true" />{item.action_date}</span>
              <span>{stateLabel(state)}</span>
            </span>
            <span className="mt-0.5 flex items-center gap-1 cmm-text-caption text-slate-500">
              <MapPin size={11} aria-hidden="true" />
              <span className="break-words">{item.location_label}</span>
            </span>
          </span>
        </span>
      </button>
    );
  };

  return (
    <section className="space-y-2">
      <p className={`px-2 cmm-text-caption font-semibold ${isLight ? "text-slate-500" : "text-slate-500"}`}>
        Actions
      </p>
      {loading ? <p className="px-2 text-xs text-slate-500">Chargement des actions...</p> : null}
      {error ? <p className="px-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="px-2 text-xs text-slate-500">Aucune action publiée.</p> : null}
      {activeAndCurrentItems.length > 0 ? <div className="space-y-1">{activeAndCurrentItems.map(renderAction)}</div> : null}
      {pastItems.length > 0 ? (
        <details className="rounded-xl border border-slate-200/70 px-2 py-1 dark:border-slate-700/70">
          <summary className="cursor-pointer list-none py-1 cmm-text-caption font-semibold text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400">
            Actions passées ({pastItems.length})
          </summary>
          <div className="space-y-1 pb-1">{pastItems.map(renderAction)}</div>
        </details>
      ) : null}
    </section>
  );
}
