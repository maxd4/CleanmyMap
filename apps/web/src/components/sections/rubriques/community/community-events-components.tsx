"use client";

import { memo, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Calendar, MapPin, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { cn } from "@/lib/utils";
import { formatCleanupSupportLabel, formatCleanupWasteTypesLabel } from "@/lib/community/event-ops";
import { CommunityEventItem, CommunityRsvpStatus } from "@/lib/community/http";
import { formatFrDate, toRsvpLabel } from "./helpers";
import { ErrorMessage } from "@/components/ui/error-message";
import { AppError } from "@/lib/errors/app-errors";
import { redirectToCommunitySignIn } from "./mutation-auth";
import type { CommunityTab, OpsDraft } from "./types";

export function cleanupNeedLabel(event: CommunityEventItem): string | null {
  if (!event.cleanupSupportLevel) {
    return null;
  }
  return `Besoin de bénévoles · ${formatCleanupSupportLabel(event.cleanupSupportLevel)}`;
}

const TAB_ITEMS: Array<{ id: CommunityTab; fr: string; en: string }> = [
  { id: "upcoming", fr: "À venir", en: "Upcoming" },
  { id: "mine", fr: "Mes inscriptions", en: "My registrations" },
  { id: "past", fr: "Passées", en: "Past" },
];

export const EventTabsHeader = memo(function EventTabsHeader({
  activeTab,
  setActiveTab,
  locale,
}: {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
  locale: string;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const nextIndex = (index + TAB_ITEMS.length) % TAB_ITEMS.length;
    const nextTab = TAB_ITEMS[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TAB_ITEMS.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={locale === "fr" ? "Missions communautaires" : "Community missions"}
      className="flex flex-wrap gap-1 rounded-2xl border border-pink-100 bg-pink-50/70 p-1"
    >
      {TAB_ITEMS.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <CmmButton
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`community-tab-${tab.id}`}
            ariaControls="community-missions-panel"
            ariaSelected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            tone={isActive ? "primary" : "tertiary"}
            variant="pill"
            className={cn(
              "min-h-10 px-4 py-2 text-sm font-semibold",
              isActive ? "bg-pink-600 text-white" : "text-slate-600 hover:bg-white hover:text-pink-700",
            )}
          >
            {locale === "fr" ? tab.fr : tab.en}
          </CmmButton>
        );
      })}
    </div>
  );
});

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
    const message =
      eventsLoadError.kind === "permission"
        ? "La consultation des missions nécessite une connexion."
        : "Les missions ne sont pas disponibles pour le moment.";

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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CmmDisclosure summary="Détails et actions" tone="rose" size="sm" className="order-2 sm:order-1">
          <div className="space-y-4 pt-3">
            <MissionDetails event={event} fr={fr} />
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <CmmButton
                onClick={() => void onRsvp(event.id, "maybe")}
                disabled={rsvpLoading}
                tone="secondary"
                variant="pill"
                className="min-h-10"
              >
                {fr ? "Je peux aider" : "I can help"}
              </CmmButton>
              <CmmButton
                onClick={() => void onRsvp(event.id, "no")}
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
          onClick={() => void onRsvp(event.id, "yes")}
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

export const EventArticleMine = memo(function EventArticleMine({
  event,
}: {
  event: CommunityEventItem;
}) {
  return (
    <article className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
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
        <span className="rounded-full bg-pink-50 px-3 py-1 cmm-text-small font-semibold text-pink-800">
          {toRsvpLabel(event.myRsvpStatus ?? "no")}
        </span>
      </div>
    </article>
  );
});

export function AnonymousRegistrationState() {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();

  if (!isLoaded || isSignedIn) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-5">
      <h3 className="font-semibold text-slate-950">Mes inscriptions</h3>
      <p className="mt-1 cmm-text-small leading-6 cmm-text-secondary">
        Connectez-vous pour retrouver les missions auxquelles vous êtes inscrit.
      </p>
      <CmmButton
        type="button"
        tone="primary"
        variant="pill"
        className="mt-4 min-h-11"
        onClick={() => redirectToCommunitySignIn(redirectToSignIn)}
      >
        Se connecter
      </CmmButton>
    </div>
  );
}

export const EventArticlePast = memo(function EventArticlePast({
  event,
  isUpdating,
  getOpsDraft,
  updateOpsDraft,
  onSaveEventOps,
}: {
  event: CommunityEventItem;
  isUpdating: boolean;
  getOpsDraft: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
}) {
  const { userId } = useAuth();
  const canEditOwnEvent = Boolean(userId && event.organizerClerkId === userId);
  const opsDraft = getOpsDraft(event);

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
      {canEditOwnEvent ? (
        <CmmDisclosure summary="Suivi de ma mission" tone="rose" size="sm" className="mt-4">
          <div className="grid gap-3 pt-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <label className="cmm-text-small font-semibold text-slate-700">
              Présence constatée
              <input
                type="number"
                min="0"
                step="1"
                value={opsDraft.attendanceCount}
                onChange={(inputEvent) => updateOpsDraft(event.id, { attendanceCount: inputEvent.target.value })}
                className="cmm-input mt-1 w-full"
              />
            </label>
            <label className="cmm-text-small font-semibold text-slate-700">
              Retour d&apos;expérience
              <textarea
                value={opsDraft.postMortem}
                onChange={(inputEvent) => updateOpsDraft(event.id, { postMortem: inputEvent.target.value })}
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
            onClick={() => void onSaveEventOps(event)}
          >
            {isUpdating ? "Enregistrement…" : "Enregistrer le suivi"}
          </CmmButton>
        </CmmDisclosure>
      ) : null}
    </article>
  );
});
