"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, Clock3, MapPin, Route, Users2 } from "lucide-react";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import { buildJoinHref } from "@/components/actions/actions-history-list.helpers";
import {
  fetchPublicActionReference,
  type PublicActionReference,
} from "@/lib/chat/action-reference-http";
import { cn } from "@/lib/utils";

function dateLabel(action: PublicActionReference): string {
  const parsed = new Date(`${action.actionDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return action.actionDate;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
}

function timeLabel(action: PublicActionReference): string | null {
  return [action.eventStartTime, action.eventEndTime].filter(Boolean).join(" – ") || null;
}

export function ChatActionReferenceCard({
  actionId,
  tone = "dark",
}: {
  actionId: string;
  tone?: "light" | "dark";
}) {
  const isLight = tone === "light";
  const { data, error, isLoading } = useSWR(
    actionId ? ["chat-action-reference", actionId] : null,
    ([, id]) => fetchPublicActionReference(id),
    { revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  if (isLoading) {
    return <p className="mb-3 rounded-xl border border-sky-200/60 px-3 py-3 text-xs text-slate-500" role="status">Chargement de l’action…</p>;
  }

  if (error || !data) {
    return <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">Cette action n’est plus disponible.</p>;
  }

  const time = timeLabel(data);
  return (
    <article className={cn(
      "mb-3 rounded-2xl border p-4 shadow-sm",
      isLight ? "border-sky-200 bg-sky-50/70" : "border-sky-400/25 bg-sky-500/10",
    )}>
      <div className="space-y-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-sky-500">Action partagée</p>
          <h3 className={cn("mt-1 text-base font-black", isLight ? "text-sky-950" : "text-sky-100")}>{data.title}</h3>
        </div>
        <div className="grid gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><CalendarDays size={13} />{dateLabel(data)}{time ? ` · ${time}` : ""}</span>
          <span className="inline-flex items-center gap-2"><MapPin size={13} />{data.locationLabel}</span>
          <span className="inline-flex items-center gap-2"><Users2 size={13} />{data.participantsExpected} participants recherchés</span>
          <span className="inline-flex items-center gap-2"><Clock3 size={13} />{formatBusinessDurationMinutes(data.durationMinutes)} estimés</span>
          {data.objective ? <span className="font-semibold">Objectif : {data.objective}</span> : null}
          <span className="font-semibold">Organisateur : {data.organizerLabel}</span>
          {data.route ? <span className="inline-flex items-center gap-2"><Route size={13} />Itinéraire prévu ({data.route.kind})</span> : null}
          {data.event ? <span className="font-semibold">Événement associé : {data.event.title}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/actions/map?actionId=${encodeURIComponent(data.id)}`}
            className="inline-flex items-center rounded-full bg-sky-600 px-3 py-2 cmm-text-caption font-black uppercase tracking-wide text-white transition hover:bg-sky-700"
          >
            Ouvrir l’action
          </Link>
          {data.groupJoinEnabled ? (
            <Link
              href={buildJoinHref(data.id)}
            className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-2 cmm-text-caption font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-50"
            >
              Rejoindre l’action
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
