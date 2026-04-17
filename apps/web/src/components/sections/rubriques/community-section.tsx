"use client";

import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { CommunityConversionKpiGrid } from "@/components/sections/rubriques/community/conversion-kpi-grid";
import { CommunityCreateEventCard } from "@/components/sections/rubriques/community/create-event-card";
import { CommunityEventsTabsCard } from "@/components/sections/rubriques/community/events-tabs-card";
import { CommunityFunnelExportCard } from "@/components/sections/rubriques/community/funnel-export-card";
import { CommunityHighlightsCard } from "@/components/sections/rubriques/community/highlights-card";
import { CommunityPostEventLoopCard } from "@/components/sections/rubriques/community/post-event-loop-card";
import { CommunityRemindersCard } from "@/components/sections/rubriques/community/reminders-card";
import { CommunityStaffingCard } from "@/components/sections/rubriques/community/staffing-card";
import { useCommunitySection } from "@/components/sections/rubriques/community/use-community-section";

function CommunitySection() {
  const model = useCommunitySection();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Rassemblements and agenda: suivi de mobilisation, calendrier terrain et
        inscriptions partagees entre appareils.
      </div>

      <CommunityCreateEventCard
        createForm={model.createForm}
        updateCreateForm={model.updateCreateForm}
        onCreateEvent={model.onCreateEvent}
        isCreatingEvent={model.isCreatingEvent}
        eventsValidating={model.eventsValidating}
        onReloadEvents={model.reloadEvents}
      />

      <CommunityHighlightsCard
        loading={model.actionsLoading}
        errorMessage={model.highlightsLoadError}
        highlights={model.highlights}
      />

      <CommunityConversionKpiGrid summary={model.conversionSummary} />
      <CommunityFunnelExportCard />
      <CommunityStaffingCard staffingPlan={model.staffingPlan} />
      <CommunityRemindersCard
        reminders={model.reminders}
        onCopyReminderMessage={model.copyReminderMessage}
      />
      <CommunityPostEventLoopCard postEventLoop={model.postEventLoop} />

      <CommunityEventsTabsCard
        activeTab={model.activeTab}
        setActiveTab={model.setActiveTab}
        eventsLoading={model.eventsLoading}
        eventsLoadError={model.eventsLoadError}
        upcomingEvents={model.upcomingEvents}
        myEvents={model.myEvents}
        pastEvents={model.pastEvents}
        conversionByEventId={model.conversionByEventId}
        remindersByEventId={model.remindersByEventId}
        staffingByEventId={model.staffingByEventId}
        rsvpLoadingEventId={model.rsvpLoadingEventId}
        onRsvp={model.onRsvp}
        getOpsDraft={model.getOpsDraft}
        updateOpsDraft={model.updateOpsDraft}
        onSaveEventOps={model.onSaveEventOps}
        isUpdatingEventOpsId={model.isUpdatingEventOpsId}
      />

      {model.communitySuccessMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {model.communitySuccessMessage}
        </p>
      ) : null}

      {model.communityErrorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {model.communityErrorMessage}
        </p>
      ) : null}

      <ActionsHistoryList />
    </div>
  );
}

export { CommunitySection };
