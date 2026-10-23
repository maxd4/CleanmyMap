"use client";

import { memo } from "react";
import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { formatCleanupSupportLabel, formatCleanupWasteTypesLabel } from "@/lib/community/event-ops";
import { CommunityEventItem, CommunityRsvpStatus } from "@/lib/community/http";
import { formatFrDate, toRsvpLabel } from "./helpers";
import { ErrorMessage } from "@/components/ui/error-message";
import { AppError } from "@/lib/errors/app-errors";
import type { OpsDraft } from "./types";
import { buildCommunityEventHref } from "@/lib/community/event-links";

function cleanupNeedLabel(event: CommunityEventItem): string | null {
  if (!event.cleanupSupportLevel) {
    return null;
  }
  return `Besoin de bénévoles · ${formatCleanupSupportLabel(event.cleanupSupportLevel)}`;
}

export const EventListStates = memo(function EventListStates({
  eventsLoading,
  eventsLoadError,
  onRetry,
}: {
  eventsLoading: boolean;
  eventsLoadError: AppError | null;
  onRetry?: () => void;
}) {
  if (eventsLoading) {
    return (
      <p className="cmm-text-small cmm-text-muted" role="status" aria-live="polite">
        Missions en cours de chargement…
      </p>
    );
  }

  if (eventsLoadError) {
    const message = "Les missions ne sont pas disponibles pour le moment.";

    return (
      <ErrorMessage
        className="mt-3"
        kind={eventsLoadError.kind}
        title="Impossible d’afficher les missions"
        message={message}
        actions={
          onRetry ? (
            <CmmButton type="button" onClick={onRetry} tone="primary" variant="pill">
              Réessayer
            </CmmButton>
          ) : null
        }
      />
    );
  }

  return null;
});

function MissionDetails({ event, fr }: { event: CommunityEventItem; fr: boolean }) {
  return (
    <div className="space-y-4">
      {event.description ? <p className="cmm-text-body leading-6 text-slate-800">{event.description}</p> : null}
      <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        {event.cleanupObjective ? (
          <div>
            <dt className="font-semibold text-slate-950">Objectif</dt>
            <dd>{event.cleanupObjective}</dd>
          </div>
        ) : null}
        {event.cleanupZone ? (
          <div>
            <dt className="font-semibold text-slate-950">Zone</dt>
            <dd>{event.cleanupZone}</dd>
          </div>
        ) : null}
        {event.cleanupLogisticsNeeds ? (
          <div>
            <dt className="font-semibold text-slate-950">Logistique</dt>
            <dd>{event.cleanupLogisticsNeeds}</dd>
          </div>
        ) : null}
        {event.cleanupWasteTypesExpected.length > 0 ? (
          <div>
            <dt className="font-semibold text-slate-950">Déchets attendus</dt>
            <dd>{formatCleanupWasteTypesLabel(event.cleanupWasteTypesExpected)}</dd>
          </div>
        ) : null}
        {cleanupNeedLabel(event) ? (
          <div>
            <dt className="font-semibold text-slate-950">Mobilisation</dt>
            <dd>{cleanupNeedLabel(event)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <span className="cmm-text-small text-slate-600">
          {event.rsvpCounts.yes} {fr ? "inscription(s) confirmée(s)" : "confirmed registration(s)"}
        </span>
      </div>
    </div>
  );
}

export const EventArticleUpcoming = memo(function EventArticleUpcoming({
  event,
  locale,
  onRsvp,
  rsvpLoading,
  onShare,
}: {
  event: CommunityEventItem;
  locale: string;
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  rsvpLoading: boolean;
  onShare: (event: CommunityEventItem) => void;
}) {
  const fr = locale === "fr";
  const participationLabel = event.myRsvpStatus === "yes" ? "Inscrit" : "Participer";

  return (
    <article className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-950">{event.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 cmm-text-small cmm-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={15} className="text-pink-600" aria-hidden="true" />
              {formatFrDate(event.eventDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} className="text-pink-600" aria-hidden="true" />
              {event.locationLabel}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start cmm-text-small text-slate-600">
          <Users size={15} className="text-pink-600" aria-hidden="true" />
          {event.rsvpCounts.yes} {fr ? "inscrit(s)" : "registered"}
        </span>
      </div>
      {event.myRsvpStatus ? (
        <p className="mt-3 inline-flex rounded-full bg-pink-50 px-3 py-1 cmm-text-small font-semibold text-pink-800">
          RSVP : {toRsvpLabel(event.myRsvpStatus)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CmmDisclosure summary="Détails et actions" tone="rose" size="sm" className="order-2 sm:order-1">
          <div className="space-y-4 pt-3">
            <MissionDetails event={event} fr={fr} />
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <CmmButton
                onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onRsvp(event.id, "maybe"); }}
                disabled={rsvpLoading}
                tone="secondary"
                variant="pill"
                className="min-h-10"
              >
                {fr ? "Je peux aider" : "I can help"}
              </CmmButton>
              <CmmButton
                onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onRsvp(event.id, "no"); }}
                disabled={rsvpLoading}
                tone="tertiary"
                variant="pill"
                className="min-h-10"
              >
                {fr ? "Décliner" : "Decline"}
              </CmmButton>
              <Link
                href={`/sections/messagerie?tab=discussions&channel=community&template=diffusion&topicId=demande_diffusion&eventId=${encodeURIComponent(event.id)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {fr ? "Relayer" : "Share"}
              </Link>
              <Link
                href={buildCommunityEventHref(event.id, "future")}
                className="inline-flex min-h-10 items-center rounded-full border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {fr ? "Voir l'événement" : "View event"}
              </Link>
              <Link
                href={`/actions/new?mode=complete&fromEventId=${event.id}`}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {fr ? "Créer l’action terrain" : "Create field action"}
              </Link>
              <CmmButton onClick={() => onShare(event)} tone="tertiary" variant="pill" className="min-h-10">
                QR Code
              </CmmButton>
            </div>
          </div>
        </CmmDisclosure>
        <CmmButton
          onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onRsvp(event.id, "yes"); }}
          disabled={rsvpLoading}
          loading={rsvpLoading}
          tone="primary"
          variant="pill"
          className="order-1 min-h-11 w-full px-5 sm:order-2 sm:w-auto"
        >
          {rsvpLoading ? "Inscription…" : participationLabel}
        </CmmButton>
      </div>
    </article>
  );
});


export const EventArticlePast = memo(function EventArticlePast({
  event,
  isUpdating,
  getOpsDraft,
  updateOpsDraft,
  onSaveEventOps,
  onShare,
}: {
  event: CommunityEventItem;
  isUpdating: boolean;
  getOpsDraft?: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft?: (event: CommunityEventItem, patch: Partial<OpsDraft>) => void;
  onSaveEventOps?: (event: CommunityEventItem) => Promise<void>;
  onShare?: (event: CommunityEventItem) => void;
}) {
  const opsDraft = getOpsDraft?.(event) ?? null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{event.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 cmm-text-small cmm-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} aria-hidden="true" /> {formatFrDate(event.eventDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} aria-hidden="true" /> {event.locationLabel}
            </span>
          </div>
        </div>
        <span className="cmm-text-small cmm-text-secondary">
          {event.rsvpCounts.total} inscription(s)
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildCommunityEventHref(event.id, "past")}
          className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          Voir l&apos;événement
        </Link>
        {onShare ? (
          <CmmButton type="button" onClick={() => onShare(event)} tone="tertiary" variant="pill" className="min-h-10">
            QR Code
          </CmmButton>
        ) : null}
        {event.myRsvpStatus ? (
          <span className="inline-flex min-h-10 items-center rounded-full bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-800">
            RSVP : {toRsvpLabel(event.myRsvpStatus)}
          </span>
        ) : null}
      </div>
      {event.canEditOwnOps && onSaveEventOps && updateOpsDraft && opsDraft ? (
        <CmmDisclosure summary="Suivi de ma mission" tone="rose" size="sm" className="mt-4">
          <div className="grid gap-3 pt-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <label className="cmm-text-small font-semibold text-slate-700">
              Présence constatée
              <input
                type="number"
                min="0"
                max="200000"
                step="1"
                value={opsDraft.attendanceCount}
                onChange={(inputEvent) => updateOpsDraft(event, { attendanceCount: inputEvent.target.value })}
                className="cmm-input mt-1 w-full"
              />
            </label>
            <label className="cmm-text-small font-semibold text-slate-700">
              Retour d&apos;expérience
              <textarea
                value={opsDraft.postMortem}
                onChange={(inputEvent) => updateOpsDraft(event, { postMortem: inputEvent.target.value })}
                className="cmm-input mt-1 min-h-28 w-full"
                rows={5}
              />
            </label>
          </div>
          <CmmButton
            type="button"
            className="mt-3"
            tone="primary"
            variant="pill"
            disabled={isUpdating}
            loading={isUpdating}
            onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onSaveEventOps(event); }}
          >
            {isUpdating ? "Enregistrement…" : "Enregistrer le suivi"}
          </CmmButton>
        </CmmDisclosure>
      ) : null}
    </article>
  );
});
