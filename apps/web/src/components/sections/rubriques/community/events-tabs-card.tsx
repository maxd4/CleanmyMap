"use client";

import Link from"next/link";
import type {
 EventConversionRow,
 EventReminder,
 EventStaffingRow,
} from"@/lib/community/engagement";
import type {
 CommunityEventItem,
 CommunityRsvpStatus,
} from"@/lib/community/http";
import { formatFrDate, toRsvpLabel } from"@/components/sections/rubriques/community/helpers";
import { buildIcsHref } from"@/components/sections/rubriques/community/ics";
import { formatPct } from"@/components/sections/rubriques/community/kpis";
import type { CommunityTab, OpsDraft } from"@/components/sections/rubriques/community/types";
import { IdentityBadge } from"@/components/ui/identity-badge";

type CommunityEventsTabsCardProps = {
 activeTab: CommunityTab;
 setActiveTab: (tab: CommunityTab) => void;
 eventsLoading: boolean;
 eventsLoadError: string | null;
 upcomingEvents: CommunityEventItem[];
 myEvents: CommunityEventItem[];
 pastEvents: CommunityEventItem[];
 conversionByEventId: Map<string, EventConversionRow>;
 remindersByEventId: Map<string, EventReminder>;
 staffingByEventId: Map<string, EventStaffingRow>;
 rsvpLoadingEventId: string | null;
 onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
 getOpsDraft: (event: CommunityEventItem) => OpsDraft;
 updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
 onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
 isUpdatingEventOpsId: string | null;
};

function tabTone(activeTab: CommunityTab, tab: CommunityTab): string {
 if (activeTab === tab) {
 return"border-emerald-300 bg-emerald-50 text-emerald-900";
 }
 return"border-slate-300 bg-white cmm-text-secondary hover:bg-slate-100";
}

function CommunityEventsTabsCard(props: CommunityEventsTabsCardProps) {
 const {
 activeTab,
 setActiveTab,
 eventsLoading,
 eventsLoadError,
 upcomingEvents,
 myEvents,
 pastEvents,
 conversionByEventId,
 remindersByEventId,
 staffingByEventId,
 rsvpLoadingEventId,
 onRsvp,
 getOpsDraft,
 updateOpsDraft,
 onSaveEventOps,
 isUpdatingEventOpsId,
 } = props;

 function organizerView(event: CommunityEventItem) {
 return (
 event.organizer ?? {
 userId: event.organizerClerkId ?? null,
 displayName:"Membre",
 roleBadge: { id:"role_benevole", label:"Bénévole", icon:"RBV" },
 profileBadge: { id:"profile_benevole", label:"Profil bénévole", icon:"PBV" },
 }
 );
 }

 return (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setActiveTab("upcoming")}
 className={`rounded-lg border px-3 py-2 cmm-text-small font-semibold transition ${tabTone(activeTab,"upcoming")}`}
 >
 À venir
 </button>
 <button
 onClick={() => setActiveTab("mine")}
 className={`rounded-lg border px-3 py-2 cmm-text-small font-semibold transition ${tabTone(activeTab,"mine")}`}
 >
 Mes inscriptions
 </button>
 <button
 onClick={() => setActiveTab("past")}
 className={`rounded-lg border px-3 py-2 cmm-text-small font-semibold transition ${tabTone(activeTab,"past")}`}
 >
 Passé
 </button>
 </div>

 {eventsLoading ? (
 <p className="mt-3 cmm-text-small cmm-text-muted">
 Chargement agenda communautaire...
 </p>
 ) : null}
 {eventsLoadError ? (
 <p className="mt-3 cmm-text-small text-rose-700">{eventsLoadError}</p>
 ) : null}

 {!eventsLoading && !eventsLoadError && activeTab ==="upcoming" ? (
 <div className="mt-4 space-y-3">
 {upcomingEvents.map((event) => (
 <article
 key={event.id}
 className="rounded-xl border border-slate-200 bg-slate-50 p-4"
 >
 {(() => {
 const organizer = organizerView(event);
 return (
 <>
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 {event.title}
 </h3>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 {formatFrDate(event.eventDate)}
 </p>
 <p className="cmm-text-caption cmm-text-secondary">{event.locationLabel}</p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 {event.description ||"Sans description."}
 </p>
 <div className="mt-2 flex flex-wrap items-center gap-2 cmm-text-caption">
 <span className="font-semibold cmm-text-secondary">
 Organisateur: {organizer.displayName}
 </span>
 <IdentityBadge
 icon={organizer.roleBadge.icon}
 label={organizer.roleBadge.label}
 tone="role"
 />
 <IdentityBadge
 icon={organizer.profileBadge.icon}
 label={organizer.profileBadge.label}
 tone="profile"
 />
 </div>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 RSVP: oui {event.rsvpCounts.yes} | peut-etre{""}
 {event.rsvpCounts.maybe} | non {event.rsvpCounts.no}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Capacite: {event.capacityTarget ??"n/a"} | remplissage{""}
 {formatPct(conversionByEventId.get(event.id)?.fillRate ?? null)}
 </p>
 {staffingByEventId.get(event.id) ? (
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Staffing: {staffingByEventId.get(event.id)?.confirmedStaff}/
 {staffingByEventId.get(event.id)?.recommendedStaff}{""}
 referent(s)
 {staffingByEventId.get(event.id)?.staffingGap
 ? ` | gap ${staffingByEventId.get(event.id)?.staffingGap}`
 :""}
 </p>
 ) : null}
 {remindersByEventId.get(event.id) ? (
 <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 cmm-text-caption text-amber-800">
 Relance {remindersByEventId.get(event.id)?.priority.toUpperCase()}
 : {remindersByEventId.get(event.id)?.reason}
 </p>
 ) : null}

 <div className="mt-3 flex flex-wrap gap-2">
 <button
 onClick={() => void onRsvp(event.id,"yes")}
 disabled={rsvpLoadingEventId === event.id}
 className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
 >
 Je participe
 </button>
 <button
 onClick={() => void onRsvp(event.id,"maybe")}
 disabled={rsvpLoadingEventId === event.id}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:cmm-text-muted"
 >
 Peut-être
 </button>
 <button
 onClick={() => void onRsvp(event.id,"no")}
 disabled={rsvpLoadingEventId === event.id}
 className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 cmm-text-caption font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-rose-300"
 >
 Je ne participe pas
 </button>
 <a
 href={buildIcsHref(event)}
 download={`${event.id}.ics`}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 Ajouter a mon agenda
 </a>
 </div>

 {event.myRsvpStatus ? (
 <p className="mt-2 cmm-text-caption font-semibold text-emerald-700">
 Mon statut: {toRsvpLabel(event.myRsvpStatus)}
 </p>
 ) : (
 <p className="mt-2 cmm-text-caption cmm-text-muted">
 Aucun RSVP enregistre pour mon compte.
 </p>
 )}
 </>
 );
 })()}
 </article>
 ))}
 {upcomingEvents.length === 0 ? (
 <p className="cmm-text-small cmm-text-secondary">
 Pas de rendez-vous prévu pour l'instant. Revenez bientôt ou proposez votre propre action !
 </p>
 ) : null}
 </div>
 ) : null}

 {!eventsLoading && !eventsLoadError && activeTab ==="mine" ? (
 <div className="mt-4 space-y-2">
 {myEvents.length === 0 ? (
 <p className="cmm-text-small cmm-text-secondary">
 Vous n'avez pas encore d'inscription. Parcourez l'onglet "À venir" pour rejoindre une action.
 </p>
 ) : (
 myEvents.map((event) => (
 <article
 key={event.id}
 className="rounded-xl border border-slate-200 bg-slate-50 p-3 cmm-text-small cmm-text-secondary"
 >
 <p className="font-semibold">{event.title}</p>
 <p className="cmm-text-caption">
 {formatFrDate(event.eventDate)} - {event.locationLabel}
 </p>
 <p className="cmm-text-caption font-semibold text-emerald-700">
 Statut: {event.myRsvpStatus ? toRsvpLabel(event.myRsvpStatus) :"Aucun"}
 </p>
 </article>
 ))
 )}
 </div>
 ) : null}

 {!eventsLoading && !eventsLoadError && activeTab ==="past" ? (
 <div className="mt-4 space-y-3">
 {pastEvents.map((event) => (
 <article
 key={event.id}
 className="rounded-xl border border-slate-200 bg-slate-50 p-3"
 >
 {(() => {
 const organizer = organizerView(event);
 return (
 <>
 <p className="cmm-text-small font-semibold cmm-text-primary">{event.title}</p>
 <p className="cmm-text-caption cmm-text-secondary">
 {formatFrDate(event.eventDate)} - {event.locationLabel}
 </p>
 <p className="cmm-text-caption cmm-text-secondary">
 RSVP total: {event.rsvpCounts.total}
 </p>
 <div className="mt-1 flex flex-wrap items-center gap-2 cmm-text-caption">
 <span className="font-semibold cmm-text-secondary">
 Organisateur: {organizer.displayName}
 </span>
 <IdentityBadge
 icon={organizer.roleBadge.icon}
 label={organizer.roleBadge.label}
 tone="role"
 />
 <IdentityBadge
 icon={organizer.profileBadge.icon}
 label={organizer.profileBadge.label}
 tone="profile"
 />
 </div>
 <p className="cmm-text-caption cmm-text-secondary">
 Conversion evenement: RSVP-&gt;presence{""}
 {formatPct(
 conversionByEventId.get(event.id)?.rsvpToAttendanceRate ??
 null,
 )}{""}
 | presence-&gt;action{""}
 {formatPct(
 conversionByEventId.get(event.id)?.attendanceToActionRate ??
 null,
 )}
 </p>
 <Link
 href={`/actions/new?fromEventId=${event.id}`}
 className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 Déclarer une action post-événement
 </Link>

 <div className="mt-3 grid gap-2 md:grid-cols-2">
 <label className="flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Presence constatee
 <input
 type="number"
 min={0}
 value={getOpsDraft(event).attendanceCount}
 onChange={(input) =>
 updateOpsDraft(event.id, {
 attendanceCount: input.target.value,
 })
 }
 className="rounded-lg border border-slate-300 px-2 py-1.5 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 </div>
 <label className="mt-2 flex flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Post-mortem
 <textarea
 rows={4}
 value={getOpsDraft(event).postMortem}
 onChange={(input) =>
 updateOpsDraft(event.id, {
 postMortem: input.target.value,
 })
 }
 className="rounded-lg border border-slate-300 px-2 py-1.5 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 <button
 onClick={() => void onSaveEventOps(event)}
 disabled={isUpdatingEventOpsId === event.id}
 className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:cmm-text-muted"
 >
 {isUpdatingEventOpsId === event.id
 ?"Sauvegarde..."
 :"Enregistrer suivi evenement"}
 </button>
 </>
 );
 })()}
 </article>
 ))}
 {pastEvents.length === 0 ? (
 <p className="cmm-text-small cmm-text-secondary">L'historique des événements est vide pour le moment.</p>
 ) : null}
 </div>
 ) : null}
 </div>
 );
 }

 export { CommunityEventsTabsCard };
