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
      <div className="flex flex-col items-start justify-between gap-4 border-b border-rose-100/60 bg-white/80 px-6 pb-4 pt-6 sm:flex-row sm:items-center">
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
              className="h-[calc(100vh-140px)] min-h-[500px]"
            >
              <DeferredChatShell
                key={discussionShellKey}
                initialChannelType={initialChannelType}
                initialArrondissement={initialArrondissement}
                initialZoneName={initialZoneName}
                initialRecipient={initialRecipient}
                tone="light"
                fullHeight
              />
            </motion.div>
          ) : (
            <motion.div
              key="dm-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-[calc(100vh-140px)] min-h-[500px]"
            >
              <DeferredChatShell
                key={dmShellKey}
                initialChannelType="dm"
                initialRecipient={initialRecipient}
                tone="light"
                fullHeight
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-rose-100/60 bg-white/80 px-6 py-6">
        <div className="mb-4 flex items-center gap-4">
          <h3 className="text-base font-black text-slate-800">Agir facilement</h3>
          <p className="text-sm text-slate-500">Choisissez une action pour mobiliser, informer ou coordonner.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <button className="group flex items-center rounded-2xl border border-rose-100 bg-white p-3.5 text-left shadow-sm transition-colors hover:bg-rose-50">
            <div className="mr-3 rounded-xl bg-rose-50 p-2.5 text-rose-500">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800">Publier en communauté</p>
              <p className="text-[10px] text-slate-500">Partagez une information utile</p>
            </div>
            <span className="text-rose-400 transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button className="group flex items-center rounded-2xl border border-fuchsia-100 bg-white p-3.5 text-left shadow-sm transition-colors hover:bg-fuchsia-50">
            <div className="mr-3 rounded-xl bg-fuchsia-50 p-2.5 text-fuchsia-500">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800">Écrire en privé</p>
              <p className="text-[10px] text-slate-500">Contactez directement un membre</p>
            </div>
            <span className="text-fuchsia-400 transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button className="group flex items-center rounded-2xl border border-rose-100 bg-white p-3.5 text-left shadow-sm transition-colors hover:bg-rose-50">
            <div className="mr-3 rounded-xl bg-rose-50 p-2.5 text-rose-500">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800">Ancrer un sujet local</p>
              <p className="text-[10px] text-slate-500">Créez un point de discussion</p>
            </div>
            <span className="text-rose-400 transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button className="group flex items-center rounded-2xl border border-fuchsia-100 bg-white p-3.5 text-left shadow-sm transition-colors hover:bg-fuchsia-50">
            <div className="mr-3 rounded-xl bg-fuchsia-50 p-2.5 text-fuchsia-500">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800">Préparer un message de relai</p>
              <p className="text-[10px] text-slate-500">Rédigez une annonce à relayer</p>
            </div>
            <span className="text-fuchsia-400 transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
