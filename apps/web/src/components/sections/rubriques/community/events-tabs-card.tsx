"use client";

import Link from"next/link";
import type { AppError } from "@/lib/errors/app-errors";
import type {
 EventConversionRow,
 EventReminder,
 EventStaffingRow,
} from"@/lib/community/engagement";
import {
 formatCleanupSupportLabel,
 formatCleanupWasteTypesLabel,
 } from"@/lib/community/event-ops";
import type {
 CommunityEventItem,
 CommunityRsvpStatus,
} from"@/lib/community/http";
import { formatFrDate, toRsvpLabel } from"@/components/sections/rubriques/community/helpers";
import { formatPct } from"@/components/sections/rubriques/community/kpis";
import type { CommunityTab, OpsDraft } from"@/components/sections/rubriques/community/types";
import { ErrorMessage } from"@/components/ui/error-message";
import { PermissionErrorState } from"@/components/ui/permission-error-state";
import { ServerErrorCard } from"@/components/ui/server-error-card";
import { IdentityBadge } from"@/components/ui/identity-badge";
import { QRCodeDialog } from "@/components/ui/qrcode-dialog";
import { useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type CommunityEventsTabsCardProps = {
 activeTab: CommunityTab;
 setActiveTab: (tab: CommunityTab) => void;
 eventsLoading: boolean;
 eventsLoadError: AppError | null;
 onRetry?: () => Promise<unknown> | void;
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

function CommunityEventsTabsCard(props: CommunityEventsTabsCardProps) {
 const [shareEvent, setShareEvent] = useState<CommunityEventItem | null>(null);
 const { locale } = useSitePreferences();

 const {
 activeTab,
 setActiveTab,
 eventsLoading,
 eventsLoadError,
 onRetry,
 upcomingEvents,
 myEvents,
 pastEvents,
 conversionByEventId,
 remindersByEventId,
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

  function cleanupNeedLabel(event: CommunityEventItem): string | null {
    if (!event.cleanupSupportLevel) {
      return null;
    }
    return `Besoin de bénévoles · ${formatCleanupSupportLabel(event.cleanupSupportLevel)}`;
  }

 return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/50 p-1.5 shadow-sm backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === "upcoming" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {locale === "fr" ? "À venir" : "Upcoming"}
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === "mine" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {locale === "fr" ? "Mes inscriptions" : "My events"}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === "past" ? "bg-slate-600 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {locale === "fr" ? "Passé" : "Past"}
          </button>
        </div>
      </div>

 {eventsLoading ? (
 <p className="mt-3 cmm-text-small cmm-text-muted">
 Chargement agenda communautaire...
 </p>
 ) : null}
 {eventsLoadError ? (
 eventsLoadError.kind ==="permission" ? (
 <PermissionErrorState
 className="mt-3"
 title="Vous n'avez pas accès à l'agenda communautaire."
 message="Connectez-vous avec un compte autorisé pour consulter ou modifier les événements."
 />
 ) : eventsLoadError.kind ==="server" ? (
 <ServerErrorCard
 className="mt-3"
 title="Impossible de charger l'agenda communautaire."
 message={eventsLoadError.message}
 onRetry={onRetry ? () => void onRetry() : undefined}
 />
 ) : (
 <ErrorMessage
 className="mt-3"
 kind={eventsLoadError.kind}
 title="Connexion perdue"
 message={eventsLoadError.message}
 actions={onRetry ? <button type="button" onClick={() => void onRetry()} className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">Réessayer</button> : null}
 />
 )
 ) : null}

  {!eventsLoading && !eventsLoadError && activeTab === "upcoming" ? (
    <div className="grid gap-4 sm:grid-cols-1">
      {upcomingEvents.map((event) => {
        const reminder = remindersByEventId.get(event.id);
        
        return (
          <article
            key={event.id}
            className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:shadow-xl sm:p-6"
          >
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {locale === "fr" ? "Mission active" : "Active mission"}
                  </span>
                  {reminder && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                      {reminder.reason}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {event.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      📅 {formatFrDate(event.eventDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      📍 {event.locationLabel}
                    </span>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                  {event.description || (locale === "fr" ? "Pas de description détaillée." : "No detailed description.")}
                </p>

                <div className="flex flex-wrap gap-2">
                  {event.cleanupObjective ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                      Objectif: {event.cleanupObjective}
                    </span>
                  ) : null}
                  {event.cleanupZone ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                      Zone: {event.cleanupZone}
                    </span>
                  ) : null}
                  {cleanupNeedLabel(event) ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      {cleanupNeedLabel(event)}
                    </span>
                  ) : null}
                  {event.cleanupLogisticsNeeds ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Logistique: {event.cleanupLogisticsNeeds}
                    </span>
                  ) : null}
                  {event.cleanupWasteTypesExpected.length > 0 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                      Déchets: {formatCleanupWasteTypesLabel(event.cleanupWasteTypesExpected)}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(3, event.rsvpCounts.yes))].map((_, i) => (
                      <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-200" />
                    ))}
                    {event.rsvpCounts.yes > 3 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500">
                        +{event.rsvpCounts.yes - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {event.rsvpCounts.yes} {locale === "fr" ? "participants confirmés" : "confirmed participants"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:w-48">
                <button
                  onClick={() => void onRsvp(event.id, "yes")}
                  disabled={rsvpLoadingEventId === event.id}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {event.myRsvpStatus === "yes" ? "✓ Je viens" : "Je viens"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void onRsvp(event.id, "maybe")}
                    disabled={rsvpLoadingEventId === event.id}
                    className="rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    Je peux aider
                  </button>
                  <button
                    onClick={() => void onRsvp(event.id, "no")}
                    disabled={rsvpLoadingEventId === event.id}
                    className="rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-400 transition-all hover:bg-slate-50"
                  >
                    Je ne peux pas
                  </button>
                </div>
                <Link
                  href="#messagerie"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 py-2 text-[11px] font-bold text-emerald-700 transition-all hover:bg-emerald-100"
                >
                  📣 Je relaie
                </Link>
                <Link
                  href={`/actions/new?mode=complete&fromEventId=${event.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50/80 py-2 text-[11px] font-bold text-sky-700 transition-all hover:bg-sky-100"
                >
                  🧾 Clôturer + caractériser
                </Link>
                <button 
                  onClick={() => setShareEvent(event)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 py-2 text-[11px] font-bold text-slate-500 transition-all hover:bg-slate-100"
                >
                  🔗 Partager / QR Code
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  ) : null}

  <QRCodeDialog
    isOpen={!!shareEvent}
    onClose={() => setShareEvent(null)}
    value={shareEvent ? `${window.location.origin}/missions/${shareEvent.id}` : ""}
    title={shareEvent?.title || ""}
    description={locale === "fr" ? "Scannez pour rejoindre cette mission" : "Scan to join this mission"}
  />


 {!eventsLoading && !eventsLoadError && activeTab ==="upcoming" && upcomingEvents.length === 0 ? (
 <p className="cmm-text-small cmm-text-secondary">
 {activeTab ==="upcoming"
 ? "Aucun événement à venir sur cette vue. Revenez plus tard ou ouvrez l'onglet Passé pour relier une action à un événement clôturé."
 : "Aucun événement à venir ne correspond à cette vue."}
 </p>
 ) : null}
  {!eventsLoading && !eventsLoadError && activeTab ==="mine" ? (
  <div className="mt-4 space-y-2">
{myEvents.length === 0 ? (
 <p className="cmm-text-small cmm-text-secondary">
 Vous n&apos;avez pas encore d&apos;inscription sur cette période. Ouvrez l&apos;onglet &quot;À venir&quot; pour rejoindre une action disponible.
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
 href={`/actions/new?mode=complete&fromEventId=${event.id}`}
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
 <p className="cmm-text-small cmm-text-secondary">Aucun événement passé n&apos;est encore disponible sur cette période. Les suivis apparaîtront ici une fois les événements clôturés.</p>
 ) : null}
 </div>
 ) : null}
 </div>
 );
 }

 export { CommunityEventsTabsCard };
