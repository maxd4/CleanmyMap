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
import { KitSection } from "@/components/sections/rubriques/kit-section";
import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";
import { ChatShell } from "@/components/chat/chat-shell";

function CommunitySection() {
  const model = useCommunitySection();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Hub unifié inspiré de l&apos;approche cleanwalk.org : ressources terrain
        (matériel, méthodes, checklists), coordination des événements
        collectifs et **Centrale App** pour la discussion en direct.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* GAUCHE : Coordination et événements */}
        <div className="space-y-6">
          
          {/* NOUVEAU : Messagerie Pro et Discussion Locale */}
          <section id="messagerie">
             <ChatShell initialArrondissement={11} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Ressources terrain standardisées
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Standardiser les pratiques pour professionnaliser les actions locales.
            </p>
            <div className="mt-3">
              <KitSection />
            </div>
          </section>

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

          <div className="pt-8">
            <NewsletterSignup />
          </div>
        </div>

        {/* DROITE : Historique des actions */}
        <div className="space-y-4 sticky top-4">
          <ActionsHistoryList />
        </div>
      </div>
    </div>
  );
}

export { CommunitySection };
