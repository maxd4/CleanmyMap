"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, ClipboardCheck, Eye, Gavel, ShieldCheck, UserRound, Weight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type {
  SpogomiPersonalEventChange,
  SpogomiPersonalEvent,
  SpogomiPersonalRelation,
} from "@/lib/spogomi/personal-events-service";
import { formatDateTimeInTimeZone } from "@/lib/time/civil-date";
import { buildSpogomiEventSpaceHref, isSpogomiEventInJourney, type SpogomiCatalogFocus, type SpogomiCatalogJourney } from "@/lib/spogomi/navigation-intent";
import { isSpogomiCachanDemoEvent } from "@/lib/spogomi/demo-scenario";
import { SpogomiSyntheticDemoNotice } from "./spogomi-synthetic-demo-notice";

type FilterKey = "all" | SpogomiPersonalRelation;

const FILTERS: readonly { key: FilterKey; label: string; relation?: SpogomiPersonalRelation }[] = [
  { key: "all", label: "Tous" },
  { key: "organizer", label: "J’organise", relation: "organizer" },
  { key: "referee", label: "J’arbitre", relation: "referee" },
  { key: "checkin", label: "J’accueille", relation: "checkin" },
  { key: "observer", label: "J’observe", relation: "observer" },
  { key: "field_operator", label: "Opérations terrain", relation: "field_operator" },
  { key: "participant", label: "Je participe", relation: "participant" },
];

const RELATION_LABELS: Record<SpogomiPersonalRelation, string> = {
  organizer: "Organisateur",
  referee: "Arbitre",
  checkin: "Accueil et présences",
  observer: "Observateur",
  field_operator: "Opérations terrain",
  participant: "Participant lié",
};

const ACCESS_LABELS = {
  manage: "Gestion",
  arbitrate: "Arbitrage",
  checkin: "Pointage",
  observe: "Lecture opérationnelle",
  operate: "Opérations terrain",
  participate: "Parcours personnel",
} as const;

const CHANGE_FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  schedule: "Horaires",
  location: "Lieu",
  official_start_at: "Début officiel",
  collection_limit_at: "Limite de collecte",
  registration: "Inscriptions",
  regulation: "Règlement",
  team_size_config: "Composition des équipes",
};

function formatDateRange(startsAt: string, endsAt: string | null, timeZone: string): string {
  let startLabel: string;
  try {
    startLabel = formatDateTimeInTimeZone(startsAt, timeZone, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "Dates indisponibles";
  }
  if (!endsAt) return `Début : ${startLabel}`;
  try {
    return `${startLabel} → ${formatDateTimeInTimeZone(endsAt, timeZone, { dateStyle: "medium", timeStyle: "short" })}`;
  } catch {
    return `Début : ${startLabel} · fin indisponible`;
  }
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
  if (relation === "field_operator") return <Weight size={14} aria-hidden="true" />;
  if (relation === "observer") return <Eye size={14} aria-hidden="true" />;
  return <UserRound size={14} aria-hidden="true" />;
}

function changeFieldLabel(field: string): string {
  return CHANGE_FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

function changeDateLabel(createdAt: string, timeZone: string): string {
  try {
    return formatDateTimeInTimeZone(createdAt, timeZone, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "Date indisponible";
  }
}

function EventChangeReceipts({ event, changes }: { event: SpogomiPersonalEvent; changes: readonly SpogomiPersonalEventChange[] }) {
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => new Set(changes.filter((change) => change.acknowledgedAt).map((change) => change.id)));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!changes.length) return null;

  const acknowledge = async (change: SpogomiPersonalEventChange) => {
    setPendingId(change.id);
    setError(false);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(event.id)}/changes/${encodeURIComponent(change.id)}/acknowledge`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("acknowledgement_failed");
      setAcknowledgedIds((current) => new Set(current).add(change.id));
    } catch {
      setError(true);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4" aria-labelledby={`spogomi-event-changes-${event.id}`} data-testid={`spogomi-event-changes-${event.id}`}>
      <div>
        <h4 id={`spogomi-event-changes-${event.id}`} className="text-sm font-black text-amber-950">Changements de l’édition</h4>
        <p className="mt-1 text-sm text-amber-950">Les changements concernés par votre inscription sont affichés sans exposer les instantanés internes.</p>
      </div>
      <ul className="space-y-3">
        {changes.map((change) => {
          const acknowledged = acknowledgedIds.has(change.id);
          return (
            <li key={change.id} className="rounded-xl border border-amber-200 bg-white/80 p-3 text-sm text-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Révision {change.revision} · {changeDateLabel(change.createdAt, event.officialTimezone)}</p>
                {change.requiresConfirmation && !acknowledged ? <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-950">Confirmation requise</span> : null}
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">Champs modifiés : {change.changedFields.map(changeFieldLabel).join(", ") || "Détails indisponibles"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {acknowledged ? <span className="font-bold text-emerald-800" role="status">Accusé le {changeDateLabel(change.acknowledgedAt ?? change.createdAt, event.officialTimezone)}</span> : change.requiresConfirmation ? <CmmButton tone="primary" size="sm" loading={pendingId === change.id} onClick={() => void acknowledge(change)}>Confirmer ce changement</CmmButton> : <span className="font-semibold text-slate-700">Information reçue</span>}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm font-semibold text-rose-800" role="alert">La confirmation n’a pas pu être enregistrée. Réessayez.</p> : null}
    </section>
  );
}

function PersonalEventCard({ event, journey, focus, changes }: { event: SpogomiPersonalEvent; journey: SpogomiCatalogJourney | null; focus: SpogomiCatalogFocus | null; changes: readonly SpogomiPersonalEventChange[] }) {
  const spaceHref = journey ? buildSpogomiEventSpaceHref(event, journey, focus) : event.links.space;
  const volunteerPrivateAccessExplanation = (journey === null || journey === "volunteers") && event.relations.includes("participant") && !event.links.public;
  const syntheticDemo = isSpogomiCachanDemoEvent(event);
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

      {syntheticDemo ? <SpogomiSyntheticDemoNotice><p>Cette édition de validation est proposée uniquement lorsqu’elle figure dans le catalogue autorisé de votre compte. Elle ne crée aucun accès si la relation organisateur n’est pas active.</p></SpogomiSyntheticDemoNotice> : null}

      <div className="space-y-2 text-sm text-slate-800">
        <p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />{formatDateRange(event.startsAt, event.endsAt, event.officialTimezone)}</p>
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

      <EventChangeReceipts event={event} changes={changes} />

      <div className="flex flex-wrap gap-3">
        {spaceHref ? <CmmButton href={spaceHref} tone="primary" size="sm">{syntheticDemo && journey === "organizers" ? "Ouvrir le cockpit de validation" : "Ouvrir l’espace"} <ArrowRight size={15} /></CmmButton> : null}
        {event.links.public ? <CmmButton href={event.links.public} tone="secondary" size="sm">Voir la fiche publique</CmmButton> : null}
        {volunteerPrivateAccessExplanation ? <p className="cmm-text-body max-w-2xl font-semibold text-slate-900">Cette édition privée n’a pas de fiche publique. Pour consulter les éléments personnels autorisés, utilisez le lien privé contextualisé remis par l’organisateur ; il est nécessaire pour l’accès à cette édition et ne donne aucun accès de gestion.</p> : null}
        {!spaceHref && !event.links.public && !volunteerPrivateAccessExplanation ? <p className="text-sm font-semibold text-slate-700">Les contrôles serveur conservent cet accès sans exposer de route supplémentaire.</p> : null}
      </div>
    </CmmCard>
  );
}

export function SpogomiPersonalEventsList({ events, changes = [], journey = null, focus = null }: { events: SpogomiPersonalEvent[]; changes?: readonly SpogomiPersonalEventChange[]; journey?: SpogomiCatalogJourney | null; focus?: SpogomiCatalogFocus | null }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const journeyEvents = journey ? events.filter((event) => isSpogomiEventInJourney(event, journey)) : events;
  const visibleFilters = FILTERS.filter((filter) => filter.key === "all" || journeyEvents.some((event) => event.relations.includes(filter.relation!)));
  const filteredEvents = activeFilter === "all"
    ? journeyEvents
    : journeyEvents.filter((event) => event.relations.includes(activeFilter));
  const heading = journey === "volunteers" ? "Mes participations" : journey === "referees" ? "Mes événements habilités" : journey === "organizers" ? "Mes événements à organiser" : "Compétitions accessibles";
  const description = journey === "volunteers" ? "Les éditions liées à votre compte vérifié restent séparées des accès de gestion." : journey === "referees" ? "Une habilitation active est nécessaire pour apparaître dans cette liste ; elle reste limitée à chaque édition." : journey === "organizers" ? "Les événements ci-dessous proviennent de vos relations organisateur vérifiées." : "Une relation vérifiée est nécessaire pour apparaître dans cette liste.";
  const changesByEventId = new Map<string, SpogomiPersonalEventChange[]>();
  for (const change of changes) {
    const eventChanges = changesByEventId.get(change.eventId) ?? [];
    eventChanges.push(change);
    changesByEventId.set(change.eventId, eventChanges);
  }

  return (
    <section className="space-y-5" aria-labelledby="spogomi-personal-events-title" data-testid="spogomi-personal-events-list">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="spogomi-personal-events-title" className="text-2xl font-black text-slate-950">{heading}</h2>
          <p className="cmm-text-body mt-1 text-slate-900">{description}</p>
        </div>
        {journey !== "volunteers" && journey !== "referees" ? <CmmButton href="/spogomi/nouveau" tone="primary" size="sm">Créer une compétition</CmmButton> : null}
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
          {filteredEvents.map((event) => <PersonalEventCard key={event.id} event={event} journey={journey} focus={focus} changes={changesByEventId.get(event.id) ?? []} />)}
        </div>
      ) : (
        <CmmCard tone="slate" variant="glass" className="border-dashed p-6" data-testid="spogomi-personal-events-empty">
          <p className="font-bold text-slate-900">{journey === "volunteers" ? "Aucune participation liée à ce compte." : journey === "referees" ? "Aucune habilitation SPOGOMI active pour ce compte." : "Aucune compétition ne correspond à ce filtre."}</p>
          <p className="mt-2 text-sm text-slate-700">Les brouillons, relations révoquées et accès non vérifiés ne sont pas ajoutés ici.</p>
          {journey !== "volunteers" && journey !== "referees" ? <CmmButton href="/spogomi/nouveau" tone="primary" size="sm" className="mt-4">Créer une compétition</CmmButton> : null}
        </CmmCard>
      )}
    </section>
  );
}
