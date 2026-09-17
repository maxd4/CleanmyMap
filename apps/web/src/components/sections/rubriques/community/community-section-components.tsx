"use client";

import { memo } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { CommunityCreateEventCard } from "@/components/sections/rubriques/community/create-event-card";
import { CommunityEventsTabsCard } from "@/components/sections/rubriques/community/events-tabs-card";
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
  | "createForm"
  | "updateCreateForm"
  | "onCreateEvent"
  | "isCreatingEvent"
>) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <section className="min-w-0 space-y-4" aria-labelledby="community-missions-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="rounded-xl border border-pink-200 bg-pink-50 p-2 text-pink-700">
            <Calendar size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 id="community-missions-title" className="text-xl font-bold text-slate-950">
              {fr ? "Missions communautaires" : "Community missions"}
            </h2>
            <p className="cmm-text-small cmm-text-secondary">
              {fr
                ? "Consultez les missions et choisissez votre niveau de participation."
              : "Browse missions and choose how you want to participate."}
            </p>
          </div>
          </div>
          <nav aria-label={fr ? "Destinations de suivi" : "Tracking destinations"} className="flex flex-wrap gap-2">
            <Link href="/actions/history" className="cmm-text-caption rounded-full border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:border-pink-300 hover:text-pink-700">
              {fr ? "Historique terrain" : "Field history"}
            </Link>
            <Link href="/reports" className="cmm-text-caption rounded-full border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:border-pink-300 hover:text-pink-700">
              {fr ? "Rapports d’impact" : "Impact reports"}
            </Link>
          </nav>
        </div>

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

      <aside className="min-w-0">
        <CommunityCreateEventCard
          createForm={createForm}
          updateCreateForm={updateCreateForm}
          onCreateEvent={onCreateEvent}
          isCreatingEvent={isCreatingEvent}
        />
      </aside>
    </div>
  );
});
