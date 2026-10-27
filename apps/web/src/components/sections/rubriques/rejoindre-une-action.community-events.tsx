"use client";

import { useState } from "react";
import { QRCodeDialog } from "@/components/ui/qrcode-dialog";
import { CmmButton } from "@/components/ui/cmm-button";
import type { AppError } from "@/lib/errors/app-errors";
import { ErrorMessage } from "@/components/ui/error-message";
import {
  EventArticlePast,
  EventArticleUpcoming,
  EventListStates,
} from "./community/community-events-components";
import type {
  CommunityEventItem,
  CommunityRsvpStatus,
} from "@/lib/community/http";
import { buildCommunityEventHref } from "@/lib/community/event-links";
import type { OpsDraft } from "./community/types";

type JoinCommunityEventsPanelProps = {
  fr: boolean;
  events: CommunityEventItem[];
  loading: boolean;
  error: AppError | null;
  focusedEventId: string | null;
  rsvpLoadingEventId?: string | null;
  onRsvp?: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  onRetry?: () => Promise<unknown> | void;
  mutationError?: AppError | null;
  successMessage?: string | null;
  isUpdatingEventOpsId?: string | null;
  getOpsDraft?: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft?: (event: CommunityEventItem, patch: Partial<OpsDraft>) => void;
  onSaveEventOps?: (event: CommunityEventItem) => Promise<void>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => Promise<unknown> | void;
  tab: "future" | "past";
};

function CommunityEventsHeader({ fr, isFuture }: { fr: boolean; isFuture: boolean }) {
  return <div className="space-y-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black tracking-tight text-pink-950">{isFuture ? (fr ? "Missions communautaires à venir" : "Upcoming community missions") : (fr ? "Événements communautaires passés" : "Past community events")}</h2><span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-pink-800">{fr ? "Événements communautaires" : "Community events"}</span></div><p className="text-sm leading-relaxed text-slate-800">{isFuture ? (fr ? "Ces missions restent des événements communautaires : leurs RSVP ne créent pas d’inscription à une action canonique." : "These remain community events: their RSVPs do not create registration for a canonical action.") : (fr ? "Ces événements sont consultables séparément des actions canoniques et conservent leur historique de RSVP." : "These events remain distinct from canonical actions and retain their RSVP history.")}</p></div>;
}

function CommunityEventsFeedback({ fr, isFuture, mutationError, successMessage }: Pick<JoinCommunityEventsPanelProps, "fr" | "mutationError" | "successMessage"> & { isFuture: boolean }) {
  return <>{mutationError ? <ErrorMessage kind={mutationError.kind} title={isFuture ? (fr ? "Le RSVP n’a pas été enregistré" : "The RSVP was not saved") : (fr ? "Le suivi de la mission n’a pas été enregistré" : "The mission follow-up was not saved")} message={mutationError.message} /> : null}{successMessage ? <p role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{successMessage}</p> : null}</>;
}

function CommunityEventsList({ events, fr, isFuture, loading, error, focusedEventId, onRsvp, rsvpLoadingEventId, setShareEvent, isUpdatingEventOpsId, getOpsDraft, updateOpsDraft, onSaveEventOps }: Pick<JoinCommunityEventsPanelProps, "events" | "fr" | "focusedEventId" | "onRsvp" | "rsvpLoadingEventId" | "isUpdatingEventOpsId" | "getOpsDraft" | "updateOpsDraft" | "onSaveEventOps"> & { isFuture: boolean; loading: boolean; error: AppError | null; setShareEvent: (event: CommunityEventItem) => void }) {
  return <>{!loading && !error && events.length === 0 ? <p className="rounded-xl border border-dashed border-pink-200 bg-white px-4 py-4 text-sm text-slate-600">{isFuture ? (fr ? "Aucune mission communautaire à venir pour le moment." : "No upcoming community mission yet.") : (fr ? "Aucun événement communautaire passé disponible." : "No past community event is available.")}</p> : null}<div className="grid gap-3">{events.map((event) => <div key={event.id} id={`join-community-event-${event.id}`} className={focusedEventId === event.id ? "rounded-2xl ring-2 ring-pink-400 ring-offset-2" : undefined}>{isFuture && onRsvp ? <EventArticleUpcoming event={event} locale={fr ? "fr" : "en"} onRsvp={onRsvp} rsvpLoading={rsvpLoadingEventId === event.id} onShare={setShareEvent} /> : <EventArticlePast event={event} isUpdating={isUpdatingEventOpsId === event.id} getOpsDraft={getOpsDraft} updateOpsDraft={updateOpsDraft} onSaveEventOps={onSaveEventOps} onShare={setShareEvent} />}</div>)}</div></>;
}

export function JoinCommunityEventsPanel({
  fr,
  events,
  loading,
  error,
  focusedEventId,
  rsvpLoadingEventId = null,
  onRsvp,
  onRetry,
  mutationError = null,
  successMessage = null,
  isUpdatingEventOpsId = null,
  getOpsDraft,
  updateOpsDraft,
  onSaveEventOps,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  tab,
}: JoinCommunityEventsPanelProps) {
  const [shareEvent, setShareEvent] = useState<CommunityEventItem | null>(null);
  const isFuture = tab === "future";

  return (
    <section className="space-y-4 rounded-[1.25rem] border border-pink-100 bg-pink-50/35 p-4 md:p-5">
      <CommunityEventsHeader fr={fr} isFuture={isFuture} />
      <EventListStates eventsLoading={loading} eventsLoadError={error} onRetry={onRetry ? () => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onRetry(); } : undefined} />
      <CommunityEventsFeedback fr={fr} isFuture={isFuture} mutationError={mutationError} successMessage={successMessage} />
      <CommunityEventsList events={events} fr={fr} isFuture={isFuture} loading={loading} error={error} focusedEventId={focusedEventId} onRsvp={onRsvp} rsvpLoadingEventId={rsvpLoadingEventId} setShareEvent={(event) => setShareEvent(event)} isUpdatingEventOpsId={isUpdatingEventOpsId} getOpsDraft={getOpsDraft} updateOpsDraft={updateOpsDraft} onSaveEventOps={onSaveEventOps} />
      {hasMore && onLoadMore ? (
        <div className="flex justify-center">
          <CmmButton
            type="button"
            tone="secondary"
            variant="pill"
            loading={loadingMore}
            disabled={loadingMore}
            onClick={() => { void /* fire-and-forget -- pagination owner handles the continuation cursor. */ onLoadMore(); }}
          >
            {loadingMore ? (fr ? "Chargement…" : "Loading…") : (fr ? "Afficher plus d’événements" : "Show more events")}
          </CmmButton>
        </div>
      ) : null}

      <QRCodeDialog
        isOpen={shareEvent !== null}
        onClose={() => setShareEvent(null)}
        value={shareEvent ? `${typeof window !== "undefined" ? window.location.origin : ""}${buildCommunityEventHref(shareEvent.id, tab)}` : ""}
        title={shareEvent?.title ?? ""}
        description={fr ? "Scannez pour consulter cet événement" : "Scan to view this event"}
      />
    </section>
  );
}
