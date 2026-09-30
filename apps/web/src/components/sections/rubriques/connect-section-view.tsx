"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { DeferredChatShell } from "@/components/chat/deferred-chat-shell";
import { PageHeader } from "@/components/ui/page-header";
import type { ChatShellNavigationState } from "@/components/chat/chat-navigation";
import { ConnectTabs } from "./connect-components";
import type { ConnectTab } from "./connect-types";
import { useConnectData } from "./use-connect-data";

type ShellProps = ReturnType<typeof useConnectData>;

export function ConnectSectionView({
  fr,
  activeTab,
  setActiveTab,
  isStaticMotion,
  discussion,
  dmNavigation,
  shell,
  onNavigationChange,
}: {
  fr: boolean;
  activeTab: ConnectTab;
  setActiveTab: (tab: ConnectTab) => void;
  isStaticMotion: boolean;
  discussion: ShellProps & { navigationState: ChatShellNavigationState; recipient: ShellProps["initialRecipient"]; messageId: ShellProps["initialMessageId"] };
  dmNavigation: ChatShellNavigationState;
  shell: ShellProps;
  onNavigationChange: (tab: ConnectTab, state: ChatShellNavigationState) => void;
}) {
  const panel = (tab: ConnectTab, props: React.ComponentProps<typeof DeferredChatShell>) => <div id={`connect-panel-${tab}`} hidden={activeTab !== tab} aria-hidden={activeTab !== tab} aria-labelledby={`connect-tab-${tab}`} role="tabpanel" data-connect-panel={tab}><motion.div initial={false} animate={{ opacity: activeTab === tab ? 1 : 0 }} transition={{ duration: isStaticMotion ? 0 : 0.15 }} className="h-full min-h-0"><DeferredChatShell {...props} onNavigationChange={(state) => onNavigationChange(tab, state)} /></motion.div></div>;
  return <section id="connect" className="relative flex min-h-0 flex-1 flex-col bg-rose-50/40"><PageHeader tone="pink" title={<span className="inline-flex items-center gap-3"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-600" aria-hidden="true"><MessageSquare size={20} /></span><span>{fr ? "Messagerie" : "Messaging"}</span></span>} subtitle={fr ? "Échangez et coordonnez vos actions." : "Exchange and coordinate your actions."} className="w-full max-w-none shrink-0 border-b border-rose-100/60 bg-white/80 px-3 py-3 sm:px-6 sm:py-4" /><div className="shrink-0 border-b border-rose-100/60 bg-white/80 px-3 pb-3 sm:px-6"><ConnectTabs activeTab={activeTab} setActiveTab={setActiveTab} fr={fr} /></div><div className="min-h-0 flex-1">{panel("discussions", { ...shell, initialChannelType: discussion.initialChannelType, initialTopicId: discussion.initialTopicId, initialActionId: discussion.initialActionId, initialRecipient: discussion.recipient, initialMessageId: discussion.messageId, navigationState: discussion.navigationState, tone: "light", fullHeight: true, messagerieMode: true, surfaceActive: activeTab === "discussions" })}{panel("dm", { ...shell, initialChannelType: "dm", initialRecipient: shell.initialRecipient, initialMessageId: shell.initialMessageId, initialFeedbackId: shell.initialFeedbackId, initialContactRequestId: shell.initialContactRequestId, navigationState: activeTab === "dm" ? dmNavigation : null, tone: "light", fullHeight: true, messagerieMode: true, surfaceActive: activeTab === "dm" })}</div></section>;
}
