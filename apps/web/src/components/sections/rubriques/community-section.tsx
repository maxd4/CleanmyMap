"use client";

import { useEffect, useRef, useState } from "react";
import { ActionsHistoryList } from"@/components/actions/actions-history-list";
import { CommunityConversionKpiGrid } from"@/components/sections/rubriques/community/conversion-kpi-grid";
import { CommunityCreateEventCard } from"@/components/sections/rubriques/community/create-event-card";
import { CommunityEventsTabsCard } from"@/components/sections/rubriques/community/events-tabs-card";
import { CommunityFunnelExportCard } from"@/components/sections/rubriques/community/funnel-export-card";
import { CommunityHighlightsCard } from"@/components/sections/rubriques/community/highlights-card";
import { CommunityPostEventLoopCard } from"@/components/sections/rubriques/community/post-event-loop-card";
import { CommunityRemindersCard } from"@/components/sections/rubriques/community/reminders-card";
import { CommunityStaffingCard } from"@/components/sections/rubriques/community/staffing-card";
import { useCommunitySection } from"@/components/sections/rubriques/community/use-community-section";
import { WeatherSection } from"@/components/sections/rubriques/weather-section";
import { NewsletterSignup } from"@/components/newsletter/newsletter-signup";
import { ExternalHubSection } from "@/components/sections/rubriques/community/external-hub-section";
import { CleanupGuideCard } from "@/components/sections/rubriques/community/cleanup-guide-card";
import { CampaignsSection } from "@/components/sections/rubriques/community/campaigns-section";
import { MissionZeroSection } from "@/components/sections/rubriques/mission-zero-section";
import { FAQSection } from "@/components/sections/rubriques/faq-section";
import { LegalSection } from "@/components/sections/rubriques/legal-section";
import { ChatShell } from"@/components/chat/chat-shell";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { ErrorMessage } from"@/components/ui/error-message";
import { PermissionErrorState } from"@/components/ui/permission-error-state";
import { ServerErrorCard } from"@/components/ui/server-error-card";
import { notifyNetworkToast } from"@/lib/errors/network-toast";
import type { AppError } from"@/lib/errors/app-errors";

function CommunitySection() {
 const model = useCommunitySection();
 const {
 eventsLoadError,
 highlightsLoadError,
 reloadEvents,
 reloadHighlights,
 } = model;
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
  const lastToastRef = useRef<string | null>(null);

  // Nouveaux états du Hub Opérationnel
  const [hubCategory, setHubCategory] = useState<"agir" | "missions" | "solutions">("missions");
  const [hubZone, setHubZone] = useState("paris");

  const handleExportCSV = () => {
    // Logique d'export basique (Blob CSV)
    const csvContent = "data:text/csv;charset=utf-8,Titre,Date,Statut\nMission CleanMyMap,2026-06-01,En cours";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_missions_${hubZone}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 useEffect(() => {
 const error = [eventsLoadError, highlightsLoadError].find(
 (item): item is AppError => {
 if (!item) {
 return false;
 }
 return item.kind ==="network";
 },
 );
 if (!error) {
 return;
 }
 const key = `${error.kind}:${error.message}:${error.referenceCode ?? ""}`;
 if (lastToastRef.current === key) {
 return;
 }
 lastToastRef.current = key;
 notifyNetworkToast({
 message: error.message,
 onRetry:
 error === highlightsLoadError
 ? () => void reloadHighlights()
 : () => void reloadEvents(),
 onRefresh: () => window.location.reload(),
 });
 }, [eventsLoadError, highlightsLoadError, reloadEvents, reloadHighlights]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 cmm-text-small text-emerald-900 shadow-sm">
        {fr
          ? "Hub unifié inspiré de l'approche cleanwalk.org : ressources terrain (matériel, méthodes, checklists), coordination des événements collectifs et Centrale App pour la discussion en direct."
          : "Unified hub inspired by cleanwalk.org: field resources (gear, methods, checklists), event coordination and Centrale App for live discussion."}
      </div>

      {/* NOUVEAU : Barre de Navigation du Hub */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-2 shadow-xl shadow-slate-200/50 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          <button 
            onClick={() => setHubCategory("agir")} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${hubCategory === "agir" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105" : "text-slate-500 hover:bg-slate-100"}`}
          >
            📍 {fr ? "Agir" : "Act"}
          </button>
          <button 
            onClick={() => setHubCategory("missions")} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${hubCategory === "missions" ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" : "text-slate-500 hover:bg-slate-100"}`}
          >
            📅 {fr ? "Missions" : "Missions"}
          </button>
          <button 
            onClick={() => setHubCategory("solutions")} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${hubCategory === "solutions" ? "bg-rose-600 text-white shadow-lg shadow-rose-200 scale-105" : "text-slate-500 hover:bg-slate-100"}`}
          >
            💡 {fr ? "Solutions" : "Solutions"}
          </button>
        </div>
        
        <div className="px-4 py-2">
          <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-2 ring-1 ring-slate-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zone</span>
            <select 
              value={hubZone} 
              onChange={(e) => setHubZone(e.target.value)} 
              className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="paris">Paris</option>
              <option value="idf">IDF</option>
              <option value="france">France</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENU CONDITIONNEL : Agir à Paris */}
      {hubCategory === "agir" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ExternalHubSection />
          <CleanupGuideCard />
          <div className="grid gap-6 md:grid-cols-2">
            <MissionZeroSection />
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm flex flex-col justify-center">
              <WeatherSection />
            </div>
          </div>
          <FAQSection />
          <LegalSection />
        </div>
      )}

      {/* CONTENU CONDITIONNEL : Missions & Événements */}
      {hubCategory === "missions" && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.95fr] items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            
            <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-800">Missions Actives ({hubZone === "paris" ? "Paris" : hubZone === "idf" ? "IDF" : "France"})</h3>
                <p className="text-xs text-slate-500">Gérez vos participations et organisez de nouveaux événements.</p>
              </div>
              <button 
                onClick={handleExportCSV} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2 text-slate-700 shadow-sm transition-colors"
              >
                 ⬇️ Exporter (CSV)
              </button>
            </div>

            <section id="messagerie" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md">
              <ChatShell initialChannelType="community" initialArrondissement={11} />
            </section>

            <CommunityCreateEventCard
              createForm={model.createForm}
              updateCreateForm={model.updateCreateForm}
              onCreateEvent={model.onCreateEvent}
              isCreatingEvent={model.isCreatingEvent}
              eventsValidating={model.eventsValidating}
              onReloadEvents={model.reloadEvents}
            />

            {model.communityError ? (
              model.communityError.kind === "permission" ? (
                <PermissionErrorState
                  title="Vous n'avez pas accès à cette action."
                  message={model.communityError.message}
                  className="mt-2"
                />
              ) : model.communityError.kind === "server" ? (
                <ServerErrorCard
                  title="Une action communautaire a échoué."
                  message={model.communityError.message}
                  onRetry={() => window.location.reload()}
                  className="mt-2"
                />
              ) : (
                <ErrorMessage
                  kind={model.communityError.kind}
                  title={model.communityError.kind === "validation" ? "Corrigez les champs" : "Connexion perdue"}
                  message={model.communityError.message}
                  className="mt-2"
                  actions={<button type="button" onClick={() => window.location.reload()} className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">Réessayer</button>}
                />
              )
            ) : null}

            <CommunityEventsTabsCard
              activeTab={model.activeTab}
              setActiveTab={model.setActiveTab}
              eventsLoading={model.eventsLoading}
              eventsLoadError={model.eventsLoadError}
              onRetry={model.reloadEvents}
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
              <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 cmm-text-small text-emerald-700 shadow-sm">
                {model.communitySuccessMessage}
              </p>
            ) : null}
          </div>

          <aside className="space-y-4">
            <CommunityHighlightsCard
              loading={model.actionsLoading}
              error={model.highlightsLoadError}
              highlights={model.highlights}
              onRetry={model.reloadHighlights}
            />
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <NewsletterSignup />
            </section>
            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <ActionsHistoryList />
            </section>
          </aside>
        </section>
      )}

      {/* CONTENU CONDITIONNEL : Solutions Déchets */}
      {hubCategory === "solutions" && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.95fr] items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <CampaignsSection />
            <CommunityFunnelExportCard />
            <CommunityStaffingCard staffingPlan={model.staffingPlan} />
            <CommunityRemindersCard
              reminders={model.reminders}
              onCopyReminderMessage={model.copyReminderMessage}
            />
            <CommunityPostEventLoopCard postEventLoop={model.postEventLoop} />
          </div>

          <div className="space-y-6">
            <CommunityConversionKpiGrid summary={model.conversionSummary} />
          </div>
        </section>
      )}

    </div>
  );
}

export { CommunitySection };
