"use client";

import { CalendarDays, MapPin, Route, Users2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { AdministrativeRequirementsStatus } from "@/components/actions/administrative-requirements-status";
import { extractEventRefFromNotes } from "@/lib/actions/event-link";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import type { ActionListItem } from "@/lib/actions/types";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";
import { buildCommunityEventHref } from "@/lib/community/event-links";

function plannedParticipants(item: ActionListItem): number | null {
  const fromPreparation = item.contract?.metadata.preparationData?.volunteerParticipation?.participantsCount;
  return typeof fromPreparation === "number" && Number.isFinite(fromPreparation)
    ? Math.max(0, Math.trunc(fromPreparation))
    : item.volunteers_count === null
      ? null
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

function hasAccessibilityInformation(item: ActionListItem): boolean {
  const preparation = item.contract?.metadata.preparationData;
  return Boolean(
    (preparation?.accessibilityStatus && preparation.accessibilityStatus !== "not_evaluated") ||
    (typeof preparation?.accessibility === "string" && preparation.accessibility.trim()),
  );
}

function accessibilityStatusLabel(status: string | undefined, fr: boolean): string {
  if (status === "conditions_reported") return fr ? "Informations renseignées" : "Information provided";
  if (status === "obstacles_identified") return fr ? "Obstacles identifiés" : "Known obstacles";
  if (status === "to_confirm") return fr ? "À confirmer" : "To confirm";
  return fr ? "Non évalué" : "Not assessed";
}

function FutureActionParticipants({ item, fr }: { item: ActionListItem; fr: boolean }) {
  const participants = plannedParticipants(item);
  return <p className="flex items-center gap-2"><Users2 size={14} className="text-slate-400" />{participants === null ? (fr ? "Participants non renseignés" : "Participants not provided") : `${formatCount(participants)} ${fr ? "participants prévus" : "planned participants"}`}</p>;
}

function FutureActionRegistration({ item, authenticated, fr, onShareAction }: { item: ActionListItem; authenticated: boolean; fr: boolean; onShareAction?: (actionId: string) => void }) {
  const shareButton = onShareAction ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => onShareAction(item.id)}>Partager dans la messagerie</CmmButton> : null;
  if (item.contract?.metadata.groupJoinEnabled === true) return <div className="flex flex-wrap gap-2"><CmmButton href={`/sections/rejoindre-une-action?actionId=${encodeURIComponent(item.id)}`} tone="primary" variant="pill" size="sm">{authenticated ? (fr ? "Rejoindre" : "Join") : (fr ? "Se connecter pour rejoindre" : "Sign in to join")}</CmmButton>{shareButton}</div>;
  return <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-500">{fr ? "Inscriptions fermées" : "Registration closed"}</span>{shareButton}</div>;
}

function FutureActionCard({ item, authenticated, fr, onShareAction }: { item: ActionListItem; authenticated: boolean; fr: boolean; onShareAction?: (actionId: string) => void }) {
  const title = titleFor(item);
  const eventRef = eventRefFor(item);
  const timeWindow = timeWindowFor(item);
  const preparation = item.contract?.metadata.preparationData;
  const status = preparation?.accessibilityStatus;
  const accessibilityText = preparation?.accessibility?.trim();
  return <article className="rounded-[1.2rem] border border-sky-100 bg-white p-4 shadow-sm"><div className="space-y-3"><div><h3 className="text-lg font-black tracking-tight text-sky-950">{title}</h3><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin size={14} className="text-slate-400" />{item.location_label}</p></div><div className="grid gap-2 text-sm text-slate-600"><p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />{formatDate(item.action_date, fr ? "fr" : "en")}</p>{timeWindow ? <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" />{timeWindow}</p> : null}<FutureActionParticipants item={item} fr={fr} /><p className="flex items-center gap-2"><Route size={14} className="text-slate-400" />{item.geometry_kind ? (fr ? "Itinéraire prévu disponible" : "Planned route available") : (fr ? "Lieu uniquement" : "Location only")}</p><p className="text-sm font-semibold text-slate-700">{formatBusinessDurationMinutes(item.duration_minutes)} {fr ? "estimés" : "estimated"}</p></div><div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3"><p className="text-xs font-bold text-violet-950">{fr ? "Accessibilité — " : "Accessibility — "}{accessibilityStatusLabel(status, fr)}</p>{accessibilityText ? <p className="mt-1 whitespace-pre-line text-sm leading-5 text-violet-950">{accessibilityText}</p> : <p className="mt-1 text-xs text-violet-900">{fr ? "Aucune précision supplémentaire n’est renseignée. Cela ne signifie pas que l’action est inaccessible." : "No additional detail is available. This does not mean the action is inaccessible."}</p>}<Link href={`/sections/rejoindre-une-action?actionId=${encodeURIComponent(item.id)}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-violet-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{fr ? "Conditions et accompagnement" : "Conditions and support"}</Link></div><p className="text-xs text-slate-500">{fr ? "Organisateur : " : "Organizer: "}{item.association_name || item.actor_name || "—"}</p><AdministrativeRequirementsStatus actionId={item.id} surface="summary" />{eventRef ? <p className="text-xs font-semibold text-slate-500">{fr ? "Événement associé : " : "Linked event: "}{eventRef} <Link href={buildCommunityEventHref(eventRef, "future")} className="ml-2 underline underline-offset-2">{fr ? "Voir l’événement" : "View event"}</Link></p> : null}<FutureActionRegistration item={item} authenticated={authenticated} fr={fr} onShareAction={onShareAction} /></div></article>;
}

export function FutureActionsPanel({
  items,
  loading,
  error,
  authenticated,
  fr,
  onShareAction,
}: {
  items: ActionListItem[];
  loading: boolean;
  error: string | null;
  authenticated: boolean;
  fr: boolean;
  onShareAction?: (actionId: string) => void;
}) {
  const [accessibilityOnly, setAccessibilityOnly] = useState(false);
  const visibleItems = accessibilityOnly ? items.filter(hasAccessibilityInformation) : items;
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

      <label className="flex min-h-11 items-start gap-3 rounded-xl border border-violet-200 bg-white p-3 text-sm font-semibold text-violet-950">
        <input type="checkbox" checked={accessibilityOnly} onChange={(event) => setAccessibilityOnly(event.target.checked)} className="mt-0.5 size-4 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
        <span>{fr ? "Afficher uniquement les actions avec des informations d’accessibilité renseignées" : "Show only actions with accessibility information"}</span>
      </label>

      {loading ? <p className="text-sm font-semibold text-sky-800">Chargement des actions futures...</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && !error && visibleItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white px-4 py-4 text-sm text-slate-600">
          {accessibilityOnly
            ? (fr ? "Aucune action ne comporte encore d’information d’accessibilité renseignée. Les autres actions restent disponibles en désactivant ce filtre." : "No action has accessibility information yet. Other actions remain available when you turn this filter off.")
            : (fr ? "Aucune action future publiée pour le moment." : "No published future action yet.")}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {visibleItems.map((item) => <FutureActionCard key={item.id} item={item} authenticated={authenticated} fr={fr} onShareAction={onShareAction} />)}
      </div>
    </section>
  );
}
