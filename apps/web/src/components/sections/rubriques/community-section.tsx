"use client";

import { useEffect, useRef, useState } from "react";
import { useCommunitySection } from "@/components/sections/rubriques/community/use-community-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { AppError } from "@/lib/errors/app-errors";
import {
  CommunityHubNav,
  CommunityAgirView,
  CommunityMissionsView,
  CommunitySolutionsView,
  HubCategory,
} from "./community-section-components";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Info, Sparkles, MapPin, Target } from "lucide-react";

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
  const lastToastRef = useRef<string | null>(null);

  // États du Hub Opérationnel
  const [hubCategory, setHubCategory] = useState<HubCategory>("missions");
  const [hubZone, setHubZone] = useState("paris");

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
      title={fr ? "Hub Communautaire" : "Community Hub"}
      subtitle={fr ? "Coordonnez vos actions, gérez les missions et découvrez des solutions durables." : "Coordinate your actions, manage missions and discover sustainable solutions."}
      icon={Users}
    >
      <div className="space-y-12 pb-20">
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
      </div>
    </SectionShell>
  );
}
