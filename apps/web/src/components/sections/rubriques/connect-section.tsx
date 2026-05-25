"use client";

import { MessageSquare, Sparkles } from "lucide-react";
import { ChatShell } from "@/components/chat/chat-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { DiscussionBadgesPanel } from "./discussion-badges-panel";
import { useConnectData } from "./use-connect-data";
import {
  ConnectHero,
  ConnectTabs,
  ConnectGuide,
  ConnectAnnouncement,
} from "./connect-components";
import type { ConnectTab } from "./connect-types";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { motion, AnimatePresence } from "framer-motion";

export function ConnectSection({ defaultTab = "discussions" }: { defaultTab?: ConnectTab }) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const {
    activeTab,
    setActiveTab,
    initialChannelType,
    initialRecipient,
    initialArrondissement,
    initialZoneName,
    announcementTemplate,
    setAnnouncementTemplate,
    communityInitialMessage,
    discussionShellKey,
    dmShellKey,
  } = useConnectData(defaultTab);

  return (
    <SectionShell
      id="connect"
      title={fr ? "Espace Communautaire" : "Community Hub"}
      subtitle={fr ? "Échangez, collaborez et coordonnez vos actions sur le terrain." : "Exchange, collaborate, and coordinate your field actions."}
      icon={MessageSquare}
      gradient="from-rose-500/20 via-pink-500/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        <ConnectHero fr={fr} />

        <div className="space-y-12 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-4 z-30 flex justify-center"
          >
            <ConnectTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              fr={fr}
            />
          </motion.div>

          <div className="space-y-12">
            <ConnectGuide
              activeTab={activeTab}
              locale={locale}
              fr={fr}
            />

            <AnimatePresence mode="wait">
              {activeTab === "discussions" && (
                <motion.div
                  key="announcement"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <ConnectAnnouncement
                    announcementTemplate={announcementTemplate}
                    setAnnouncementTemplate={setAnnouncementTemplate}
                    communityInitialMessage={communityInitialMessage}
                    fr={fr}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              layout
              className="mx-auto max-w-6xl w-full"
            >
              <AnimatePresence mode="wait">
                {activeTab === "discussions" ? (
                  <motion.div
                    key="discussions-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                  >
                    <DiscussionBadgesPanel />
                    <div className="rounded-[2.5rem] border border-white/10 bg-black/30 backdrop-blur-3xl overflow-hidden shadow-2xl relative transition-colors hover:bg-black/40">
                      <div className="absolute inset-x-0 top-0 h-[3px] z-10 bg-rose-500" />
                      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Sparkles size={80} className="text-rose-400" />
                      </div>
                      <ChatShell
                        key={discussionShellKey}
                        initialChannelType={initialChannelType}
                        initialArrondissement={initialArrondissement}
                        initialZoneName={initialZoneName}
                        initialRecipient={initialRecipient}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="dm-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="rounded-[2.5rem] border border-white/10 bg-black/30 backdrop-blur-3xl overflow-hidden shadow-2xl relative transition-colors hover:bg-black/40"
                  >
                     <div className="absolute inset-x-0 top-0 h-[3px] z-10 bg-rose-500" />
                     <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <MessageSquare size={80} className="text-pink-400" />
                      </div>
                    <ChatShell
                      key={dmShellKey}
                      initialChannelType="dm"
                      initialRecipient={initialRecipient}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
