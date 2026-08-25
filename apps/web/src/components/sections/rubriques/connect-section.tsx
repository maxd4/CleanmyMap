"use client";

import { MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { DeferredChatShell } from "@/components/chat/deferred-chat-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useConnectData } from "./use-connect-data";
import { ConnectTabs } from "./connect-components";
import type { ConnectTab } from "./connect-types";

export function ConnectSection({ defaultTab = "discussions" }: { defaultTab?: ConnectTab }) {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const tabParam = searchParams?.get("tab");
  const initialTab: ConnectTab =
    tabParam === "dm" || tabParam === "discussions" ? tabParam : defaultTab;

  const {
    activeTab,
    setActiveTab,
    initialChannelType,
    initialRecipient,
    initialArrondissement,
    initialZoneName,
    discussionShellKey,
    dmShellKey,
  } = useConnectData(initialTab);

  return (
    <section id="connect" className="relative flex flex-col bg-rose-50/40">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-rose-100/60 bg-white/80 px-4 pb-4 pt-5 sm:flex-row sm:items-center sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-100 p-2.5 text-rose-500">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {fr ? "Messagerie" : "Messaging"}
            </h1>
            <p className="text-sm text-slate-500">
              {fr ? "Échangez et coordonnez vos actions." : "Exchange and coordinate your actions."}
            </p>
          </div>
        </div>
        <ConnectTabs activeTab={activeTab} setActiveTab={setActiveTab} fr={fr} />
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === "discussions" ? (
            <motion.div
              key="discussions-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-[calc(100dvh-140px)] min-h-[500px]"
            >
              <DeferredChatShell
                key={discussionShellKey}
                initialChannelType={initialChannelType}
                initialArrondissement={initialArrondissement}
                initialZoneName={initialZoneName}
                initialRecipient={initialRecipient}
                tone="light"
                fullHeight
                messagerieMode
              />
            </motion.div>
          ) : (
            <motion.div
              key="dm-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-[calc(100dvh-140px)] min-h-[500px]"
            >
              <DeferredChatShell
                key={dmShellKey}
                initialChannelType="dm"
                initialRecipient={initialRecipient}
                tone="light"
                fullHeight
                messagerieMode
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </section>
  );
}
