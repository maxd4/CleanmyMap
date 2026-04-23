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
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

function CommunitySection() {
  const model = useCommunitySection();
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 shadow-sm">
        {fr
          ? "Hub unifié inspiré de l&apos;approche cleanwalk.org : ressources terrain (matériel, méthodes, checklists), coordination des événements collectifs et **Centrale App** pour la discussion en direct."
          : "Unified hub inspired by cleanwalk.org: field resources (gear, methods, checklists), event coordination and **Centrale App** for live discussion."}
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.95fr] items-start">
        <div className="space-y-6">
          <section id="messagerie" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md">
            <ChatShell initialArrondissement={11} />
          </section>

          <CommunityCreateEventCard
            createForm={model.createForm}
            updateCreateForm={model.updateCreateForm}
            onCreateEvent={model.onCreateEvent}
            isCreatingEvent={model.isCreatingEvent}
            eventsValidating={model.eventsValidating}
            onReloadEvents={model.reloadEvents}
          />

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
            <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700 shadow-sm">
              {model.communitySuccessMessage}
            </p>
          ) : null}

          {model.communityErrorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-700 shadow-sm">
              {model.communityErrorMessage}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {fr ? "Ce qui est déplacé plus bas" : "What moves below"}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {fr
                ? "Les ressources terrain, l&apos;historique, les exports et la rétention sont maintenus, mais ils ne prennent plus la place du chat ni de la création d&apos;événements."
                : "Field resources, history, exports and retention stay available, but they no longer crowd out chat and event creation."}
            </p>
          </section>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.95fr] items-start">
        <div className="space-y-4">
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
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {fr ? "Ressources terrain standardisées" : "Standardized field resources"}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {fr
                ? "Standardiser les pratiques pour professionnaliser les actions locales."
                : "Standardize practices to professionalize local actions."}
            </p>
            <div className="mt-3">
              <KitSection />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <NewsletterSignup />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <ActionsHistoryList />
          </section>
        </div>
      </section>
    </div>
  );
}

export { CommunitySection };
