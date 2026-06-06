"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCommunitySection } from "@/components/sections/rubriques/community/use-community-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { AppError } from "@/lib/errors/app-errors";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  CommunityHubNav,
  CommunityAgirView,
  CommunityMissionsView,
  CommunitySolutionsView,
  HubCategory,
} from "./community-section-components";
import { PartnersNetworkSection } from "./partners-network-section";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { motion, AnimatePresence } from "framer-motion";
import { Handshake, Info, Sparkles, MapPin, Target, Users } from "lucide-react";

type SurfaceTab = "community" | "partners";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function CommunitySection() {
  const model = useCommunitySection();
  const {
    eventsLoadError,
    highlightsLoadError,
    reloadEvents,
    reloadHighlights,
  } = model;
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastToastRef = useRef<string | null>(null);

  // États du Hub Opérationnel
  const [hubCategory, setHubCategory] = useState<HubCategory>("missions");
  const [hubZone, setHubZone] = useState("paris");
  const surfaceTab: SurfaceTab = searchParams.get("tab") === "partners" ? "partners" : "community";
  const isPartnersTab = surfaceTab === "partners";

  function setSurfaceTab(nextTab: SurfaceTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "partners") {
      params.set("tab", "partners");
    } else {
      params.delete("tab");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  useEffect(() => {
    const error = [eventsLoadError, highlightsLoadError].find(
      (item): item is AppError => {
        if (!item) return false;
        return item.kind === "network";
      },
    );
    if (!error) return;

    const key = `${error.kind}:${error.message}:${error.referenceCode ?? ""}`;
    if (lastToastRef.current === key) return;

    lastToastRef.current = key;
    notifyNetworkToast({
      message: error.message,
      onRetry: error === highlightsLoadError
        ? () => void reloadHighlights()
        : () => void reloadEvents(),
      onRefresh: () => window.location.reload(),
    });
  }, [eventsLoadError, highlightsLoadError, reloadEvents, reloadHighlights]);

  return (
    <SectionShell 
      id="community"
      title={fr ? "Communauté" : "Community"}
      subtitle={fr ? "Coordonnez la vie de la communauté et accédez au réseau de partenaires." : "Coordinate community life and access the partner network."}
      icon={Users}
      hideHeader={isPartnersTab}
    >
      <div className="space-y-12 pb-20">
        <div
          className={[
            "rounded-[2.5rem] p-2 backdrop-blur-2xl shadow-2xl transition-colors",
            isPartnersTab
              ? "border border-violet-200 bg-white/85 shadow-[0_20px_60px_-44px_rgba(79,70,229,0.4)]"
              : "border border-white/10 bg-black/25",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="px-4 pt-2 lg:pt-0">
              <p
                className={[
                  "text-[10px] font-black uppercase tracking-[0.28em]",
                  isPartnersTab ? "text-violet-500/70" : "text-white/45",
                ].join(" ")}
              >
                {fr ? "Navigation de la page" : "Page navigation"}
              </p>
              <p
                className={[
                  "mt-2 text-sm font-semibold",
                  isPartnersTab ? "text-slate-600" : "text-white/70",
                ].join(" ")}
              >
                {surfaceTab === "community"
                  ? (fr ? "Communauté et coordination interne." : "Community coordination and internal operations.")
                  : (fr ? "Partenaires et parcours réseau." : "Partners and network journeys.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CmmButton
                onClick={() => setSurfaceTab("community")}
                tone={surfaceTab === "community" ? "primary" : "tertiary"}
                variant="pill"
                className="px-5 py-3"
              >
                <Users size={16} />
                <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                  {fr ? "Communauté" : "Community"}
                </span>
              </CmmButton>
              <CmmButton
                onClick={() => setSurfaceTab("partners")}
                tone={surfaceTab === "partners" ? "primary" : "tertiary"}
                variant="pill"
                className="px-5 py-3"
              >
                <Handshake size={16} />
                <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                  {fr ? "Partenaires" : "Partners"}
                </span>
              </CmmButton>
            </div>
          </div>
        </div>

        {surfaceTab === "partners" ? (
          <PartnersNetworkSection fr={fr} />
        ) : (
          <>
        {/* Modernized Control Bar */}
        <FamilyRubriqueCard 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          watermarkIcon={Sparkles}
          watermarkSize={80}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8"
        >

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Target size={18} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Pilotage Opérationnel</h3>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <MapPin size={12} className="text-pink-500" />
              <span>Zone : <span className="text-white uppercase">{hubZone}</span></span>
              <div className="w-1 h-1 rounded-full bg-white/10 mx-2" />
              <Info size={12} className="text-pink-500" />
              <span>Inspiration : <span className="text-white">Cleanwalk.org</span></span>
            </div>
          </div>

          <div className="relative z-10">
            <CommunityHubNav
              category={hubCategory}
              setCategory={setHubCategory}
              zone={hubZone}
              setZone={setHubZone}
              fr={fr}
            />
          </div>
        </FamilyRubriqueCard>

        {/* Views Container with Staggered Entrance */}
        <AnimatePresence mode="wait">
          <motion.div
            key={hubCategory}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="min-h-[500px]"
          >
            {hubCategory === "missions" && (
              <motion.div variants={itemVariants}>
                <CommunityMissionsView
                  fr={fr}
                  activeTab={model.activeTab}
                  setActiveTab={model.setActiveTab}
                  eventsLoading={model.eventsLoading}
                  eventsLoadError={model.eventsLoadError}
                  reloadEvents={model.reloadEvents}
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
                  staffingPlan={model.staffingPlan}
                  postEventLoop={model.postEventLoop}
                  createForm={model.createForm}
                  updateCreateForm={model.updateCreateForm}
                  onCreateEvent={model.onCreateEvent}
                  isCreatingEvent={model.isCreatingEvent}
                  eventsValidating={model.eventsValidating}
                  reminders={model.reminders}
                  copyReminderMessage={model.copyReminderMessage}
                />
              </motion.div>
            )}
            {hubCategory === "solutions" && (
              <motion.div variants={itemVariants}>
                <CommunitySolutionsView fr={fr} />
              </motion.div>
            )}
            {hubCategory === "agir" && (
              <motion.div variants={itemVariants}>
                <CommunityAgirView
                  fr={fr}
                  conversionSummary={model.conversionSummary}
                  actionsLoading={model.actionsLoading}
                  highlightsLoadError={model.highlightsLoadError}
                  highlights={model.highlights}
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Community Footer / Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="p-8 rounded-[2rem] border border-white/5 bg-slate-900/20 text-center"
        >
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] italic">
            {fr 
              ? "Rejoignez plus de 15 000 bénévoles pour une ville plus propre." 
              : "Join over 15,000 volunteers for a cleaner city."}
          </p>
        </motion.div>
          </>
        )}
      </div>
    </SectionShell>
  );
}
