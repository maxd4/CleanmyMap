"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, ClipboardCheck, Eye, Gavel, ShieldCheck, UserRound } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type {
  SpogomiPersonalEvent,
  SpogomiPersonalRelation,
} from "@/lib/spogomi/personal-events-service";

type FilterKey = "all" | SpogomiPersonalRelation;

const FILTERS: readonly { key: FilterKey; label: string; relation?: SpogomiPersonalRelation }[] = [
  { key: "all", label: "Tous" },
  { key: "organizer", label: "J’organise", relation: "organizer" },
  { key: "referee", label: "J’arbitre", relation: "referee" },
  { key: "checkin", label: "J’accueille", relation: "checkin" },
  { key: "observer", label: "J’observe", relation: "observer" },
  { key: "participant", label: "Je participe", relation: "participant" },
];

const RELATION_LABELS: Record<SpogomiPersonalRelation, string> = {
  organizer: "Organisateur",
  referee: "Arbitre",
  checkin: "Accueil et présences",
  observer: "Observateur",
  participant: "Participant lié",
};

const ACCESS_LABELS = {
  manage: "Gestion",
  arbitrate: "Arbitrage",
  checkin: "Pointage",
  observe: "Lecture opérationnelle",
  participate: "Parcours personnel",
} as const;

function formatDateRange(startsAt: string, endsAt: string | null): string {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) return "Dates indisponibles";
  const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const startLabel = formatter.format(starts);
  if (!endsAt) return `Début : ${startLabel}`;
  const ends = new Date(endsAt);
  return Number.isNaN(ends.getTime()) ? `Début : ${startLabel} · fin indisponible` : `${startLabel} → ${formatter.format(ends)}`;
}

function modeLabel(mode: SpogomiPersonalEvent["mode"]): string {
  return mode === "mixed" ? "Casual & World Cup" : mode === "world_cup" ? "World Cup" : "Casual";
}

function stateLabel(state: string): string {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    published: "Publié",
    running: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  };
  return labels[state] ?? state;
}

function AccessIcon({ relation }: { relation: SpogomiPersonalRelation }) {
  if (relation === "organizer") return <ShieldCheck size={14} aria-hidden="true" />;
  if (relation === "referee") return <Gavel size={14} aria-hidden="true" />;
  if (relation === "checkin") return <ClipboardCheck size={14} aria-hidden="true" />;
  if (relation === "observer") return <Eye size={14} aria-hidden="true" />;
  return <UserRound size={14} aria-hidden="true" />;
}

function PersonalEventCard({ event }: { event: SpogomiPersonalEvent }) {
  return (
    <CmmCard as="article" tone="emerald" variant="glass" className="space-y-4 p-5" data-testid={`spogomi-personal-event-${event.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-black text-emerald-950">{event.name}</h3>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
            <span>{stateLabel(event.state)}</span>
            <span aria-hidden="true">·</span>
            <span>{event.publicVisibility === "published" ? "Publié" : "Privé"}</span>
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">{modeLabel(event.mode)}</span>
      </div>

      <div className="space-y-2 text-sm text-slate-800">
        <p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />{formatDateRange(event.startsAt, event.endsAt)}</p>
        <div className="flex flex-wrap gap-2" aria-label="Relations vérifiées">
          {event.relations.map((relation) => (
            <span key={relation} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">
              <AccessIcon relation={relation} />{RELATION_LABELS[relation]}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Accès disponibles</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {event.accesses.map((access) => <span key={access} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800">{ACCESS_LABELS[access]}</span>)}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {event.links.space ? <CmmButton href={event.links.space} tone="primary" size="sm">Ouvrir l’espace <ArrowRight size={15} /></CmmButton> : null}
        {event.links.public ? <CmmButton href={event.links.public} tone="secondary" size="sm">Voir la fiche publique</CmmButton> : null}
        {!event.links.space && !event.links.public ? <p className="text-sm font-semibold text-slate-700">Les contrôles serveur conservent cet accès sans exposer de route supplémentaire.</p> : null}
      </div>
    </CmmCard>
  );
}

export function SpogomiPersonalEventsList({ events }: { events: SpogomiPersonalEvent[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const visibleFilters = FILTERS.filter((filter) => filter.key === "all" || events.some((event) => event.relations.includes(filter.relation!)));
  const filteredEvents = activeFilter === "all"
    ? events
    : events.filter((event) => event.relations.includes(activeFilter));

  return (
    <section className="space-y-5" aria-labelledby="spogomi-personal-events-title" data-testid="spogomi-personal-events-list">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="spogomi-personal-events-title" className="text-2xl font-black text-slate-950">Compétitions accessibles</h2>
          <p className="cmm-text-body mt-1 text-slate-900">Une relation vérifiée est nécessaire pour apparaître dans cette liste.</p>
        </div>
        <CmmButton href="/spogomi/nouveau" tone="primary" size="sm">Créer une compétition</CmmButton>
      </div>

      {visibleFilters.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer mes compétitions">
          {visibleFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              aria-pressed={activeFilter === filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`min-h-10 rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${activeFilter === filter.key ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-emerald-500 hover:text-emerald-900"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}

      {filteredEvents.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredEvents.map((event) => <PersonalEventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <CmmCard tone="slate" variant="glass" className="border-dashed p-6" data-testid="spogomi-personal-events-empty">
          <p className="font-bold text-slate-900">Aucune compétition ne correspond à ce filtre.</p>
          <p className="mt-2 text-sm text-slate-700">Les brouillons et les habilitations révoquées ne sont pas ajoutés ici.</p>
          <CmmButton href="/spogomi/nouveau" tone="primary" size="sm" className="mt-4">Créer une compétition</CmmButton>
        </CmmCard>
      )}
    </section>
  );
}
