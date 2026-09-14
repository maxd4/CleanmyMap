"use client";

import { CalendarDays, MapPin, Route, Users2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { extractEventRefFromNotes } from "@/lib/actions/event-link";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import type { ActionListItem } from "@/lib/actions/types";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

function plannedParticipants(item: ActionListItem): number {
  const fromPreparation = item.contract?.metadata.preparationData?.volunteerParticipation?.participantsCount;
  return typeof fromPreparation === "number" && Number.isFinite(fromPreparation)
    ? Math.max(0, Math.trunc(fromPreparation))
    : Math.max(0, Math.trunc(item.volunteers_count));
}

function titleFor(item: ActionListItem): string {
  return item.contract?.metadata.preparationData?.actionTitle?.trim() || item.location_label;
}

function eventRefFor(item: ActionListItem): string | null {
  return extractEventRefFromNotes(item.notes ?? item.contract?.metadata.notes);
}

function timeWindowFor(item: ActionListItem): string | null {
  const start = item.contract?.dates.eventStartTime ?? null;
  const end = item.contract?.dates.eventEndTime ?? null;
  if (!start && !end) return null;
  return [start, end].filter(Boolean).join(" – ");
}

export function FutureActionsPanel({
  items,
  loading,
  error,
  authenticated,
  fr,
}: {
  items: ActionListItem[];
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  fr: boolean;
}) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-sky-100 bg-sky-50/45 p-4 md:p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-sky-950">
            {fr ? "Actions futures" : "Future actions"}
          </h2>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-800">
            {formatCount(items.length)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          {fr
            ? "Des actions explicitement publiées, à venir. Les participants, la durée, l'itinéraire et les objectifs restent prévisionnels jusqu'au bilan terrain."
            : "Explicitly published actions that have not started yet. Participants, duration, route and objectives remain planned until the field report."}
        </p>
      </div>

      {loading ? <p className="text-sm font-semibold text-sky-800">Chargement des actions futures...</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white px-4 py-4 text-sm text-slate-600">
          {fr ? "Aucune action future publiée pour le moment." : "No published future action yet."}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const groupJoinEnabled = item.contract?.metadata.groupJoinEnabled === true;
          const title = titleFor(item);
          const eventRef = eventRefFor(item);
          const timeWindow = timeWindowFor(item);
          return (
            <article key={item.id} className="rounded-[1.2rem] border border-sky-100 bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-sky-950">{title}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400" />
                    {item.location_label}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />{formatDate(item.action_date, fr ? "fr" : "en")}</p>
                  {timeWindow ? <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />{timeWindow}</p> : null}
                  <p className="flex items-center gap-2"><Users2 size={14} className="text-slate-400" />{formatCount(plannedParticipants(item))} {fr ? "participants prévus" : "planned participants"}</p>
                  <p className="flex items-center gap-2"><Route size={14} className="text-slate-400" />{item.geometry_kind ? (fr ? "Itinéraire prévu disponible" : "Planned route available") : (fr ? "Lieu uniquement" : "Location only")}</p>
                  <p className="text-sm font-semibold text-slate-700">{formatBusinessDurationMinutes(item.duration_minutes)} {fr ? "estimés" : "estimated"}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {fr ? "Organisateur : " : "Organizer: "}{item.association_name || item.actor_name || "—"}
                </p>
                {eventRef ? (
                  <p className="text-xs font-semibold text-slate-500">
                    {fr ? "Événement associé : " : "Linked event: "}{eventRef}
                  </p>
                ) : null}
                {groupJoinEnabled ? (
                  <CmmButton
                    href={`/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(item.id)}`}
                    tone="primary"
                    variant="pill"
                    size="sm"
                  >
                    {authenticated ? (fr ? "Rejoindre" : "Join") : (fr ? "Se connecter pour rejoindre" : "Sign in to join")}
                  </CmmButton>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">{fr ? "Participation fermée" : "Joining closed"}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
