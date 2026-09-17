"use client";

import { memo } from "react";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { CommunityCreateEventCard } from "@/components/sections/rubriques/community/create-event-card";
import { CommunityEventsTabsCard } from "@/components/sections/rubriques/community/events-tabs-card";
import { ErrorMessage } from "@/components/ui/error-message";
import type { UseCommunitySectionModel } from "./use-community-section";

export const CommunityMissionsView = memo(function CommunityMissionsView({
  fr,
  activeTab,
  setActiveTab,
  eventsLoading,
  eventsLoadError,
  reloadEvents,
  upcomingEvents,
  myEvents,
  pastEvents,
  rsvpLoadingEventId,
  onRsvp,
  isUpdatingEventOpsId,
  getOpsDraft,
  updateOpsDraft,
  onSaveEventOps,
  communitySuccessMessage,
  communityError,
  createForm,
  updateCreateForm,
  onCreateEvent,
  isCreatingEvent,
}: {
  fr: boolean;
} & Pick<
  UseCommunitySectionModel,
  | "activeTab"
  | "setActiveTab"
  | "eventsLoading"
  | "eventsLoadError"
  | "reloadEvents"
  | "upcomingEvents"
  | "myEvents"
  | "pastEvents"
  | "rsvpLoadingEventId"
  | "onRsvp"
  | "isUpdatingEventOpsId"
  | "getOpsDraft"
  | "updateOpsDraft"
  | "onSaveEventOps"
  | "communitySuccessMessage"
  | "communityError"
  | "createForm"
  | "updateCreateForm"
  | "onCreateEvent"
  | "isCreatingEvent"
>) {
  return (
    <div className="space-y-8">
      <section className="min-w-0 space-y-5" aria-labelledby="community-missions-title">
        <div className="flex flex-col gap-4 border-b border-pink-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="community-missions-title" className="text-2xl font-bold tracking-tight text-slate-950">
            {fr ? "Missions à venir" : "Upcoming missions"}
          </h2>
          <CommunityCreateEventCard
            createForm={createForm}
            updateCreateForm={updateCreateForm}
            onCreateEvent={onCreateEvent}
            isCreatingEvent={isCreatingEvent}
          />
        </div>

        {communitySuccessMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
          >
            {communitySuccessMessage}
          </div>
        ) : null}
        {communityError ? (
          <ErrorMessage
            kind={communityError.kind}
            title={fr ? "L’opération n’a pas abouti" : "The operation could not be completed"}
            message={communityError.message}
          />
        ) : null}

        <CommunityEventsTabsCard
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          eventsLoading={eventsLoading}
          eventsLoadError={eventsLoadError}
          onRetry={reloadEvents}
          upcomingEvents={upcomingEvents}
          myEvents={myEvents}
          pastEvents={pastEvents}
          rsvpLoadingEventId={rsvpLoadingEventId}
          onRsvp={onRsvp}
          isUpdatingEventOpsId={isUpdatingEventOpsId}
          getOpsDraft={getOpsDraft}
          updateOpsDraft={updateOpsDraft}
          onSaveEventOps={onSaveEventOps}
        />
      </section>

      <nav
        aria-label={fr ? "Passerelles utiles" : "Useful links"}
        className="flex flex-wrap gap-3 border-t border-pink-100 pt-5"
      >
        <Link
          href="/sections/annuaire"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-pink-400 hover:text-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
        >
          <Search size={16} aria-hidden="true" />
          {fr ? "Trouver des acteurs" : "Find organisations"}
        </Link>
        <Link
          href="/sections/messagerie"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-pink-400 hover:text-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
        >
          <MessageCircle size={16} aria-hidden="true" />
          {fr ? "Ouvrir la messagerie" : "Open messaging"}
        </Link>
      </nav>
    </div>
  );
});
