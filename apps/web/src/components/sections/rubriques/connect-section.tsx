"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DeferredChatShell } from "@/components/chat/deferred-chat-shell";
import type { ChatShellNavigationState } from "@/components/chat/chat-navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  synchronizeConnectNavigationParams,
  useConnectData,
} from "./use-connect-data";
import { ConnectTabs } from "./connect-components";
import type { ConnectTab } from "./connect-types";

export function ConnectSection({ defaultTab = "discussions" }: { defaultTab?: ConnectTab }) {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const fr = locale === "fr";
  const tabParam = searchParams.get("tab");
  const initialTab: ConnectTab =
    tabParam === "dm" || tabParam === "discussions" ? tabParam : defaultTab;

  const {
    activeTab,
    setActiveTab,
    initialChannelType,
    initialActionId,
    initialTopicId,
    initialComposerMode,
    initialAnnouncementTemplate,
    initialMessage,
    initialRelatedEvent,
    announcementEventRequested,
    announcementEventLoading,
    announcementEventError,
    initialRecipient,
    initialFeedbackId,
    initialArrondissement,
    initialZoneName,
    initialMessageId,
    initialEventId,
    initialContactRequestId,
  } = useConnectData(initialTab);

  const discussionChannelType = initialChannelType === "dm" ? "community" : initialChannelType;
  const discussionTopicId = initialChannelType === "dm" ? null : initialTopicId;
  const discussionRecipient = initialChannelType === "dm" ? null : initialRecipient;
  const discussionMessageId = initialChannelType === "dm" ? null : initialMessageId;

  const initialDiscussionNavigation = useMemo<ChatShellNavigationState>(
    () => ({
      activeChannelType: discussionChannelType,
      activeTopicId: discussionTopicId,
      selectedActionId:
        discussionChannelType === "action" ? initialActionId : null,
      selectedRecipient: null,
      selectedZone: initialZoneName ?? "",
      territoryFocus: initialArrondissement,
      messageId: discussionMessageId,
      feedbackId: null,
      contactRequestId: null,
      announcementTemplate: initialAnnouncementTemplate,
      eventId: initialAnnouncementTemplate ? initialEventId : null,
    }),
    [
      discussionChannelType,
      discussionMessageId,
      discussionTopicId,
      initialActionId,
      initialAnnouncementTemplate,
      initialArrondissement,
      initialEventId,
      initialZoneName,
    ],
  );
  const initialDmNavigation = useMemo<ChatShellNavigationState>(
    () => ({
      activeChannelType: "dm",
      activeTopicId: null,
      selectedActionId: null,
      selectedRecipient: initialChannelType === "dm" ? initialRecipient : null,
      selectedZone: initialZoneName ?? "",
      territoryFocus: initialArrondissement,
      messageId: initialChannelType === "dm" ? initialMessageId : null,
      feedbackId: initialChannelType === "dm" ? initialFeedbackId : null,
      contactRequestId:
        initialChannelType === "dm" ? initialContactRequestId : null,
      announcementTemplate: null,
      eventId: null,
    }),
    [
      initialArrondissement,
      initialChannelType,
      initialContactRequestId,
      initialFeedbackId,
      initialMessageId,
      initialRecipient,
      initialZoneName,
    ],
  );
  const navigationByTabRef = useRef<
    Record<"discussions" | "dm", ChatShellNavigationState>
  >({
    discussions: initialDiscussionNavigation,
    dm: initialDmNavigation,
  });
  const navigationInitializedRef = useRef<Record<ConnectTab, boolean>>({
    discussions: false,
    dm: false,
  });
  const activeTabRef = useRef(activeTab);
  const currentSearchRef = useRef(searchParams.toString());

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    currentSearchRef.current = searchParams.toString();
  }, [searchParams]);

  const writeNavigationToUrl = useCallback(
    (
      tab: ConnectTab,
      state: ChatShellNavigationState,
      historyMode: "push" | "replace" = "push",
    ) => {
      const nextParams = synchronizeConnectNavigationParams(
        currentSearchRef.current,
        tab,
        state,
      );
      const nextSearch = nextParams.toString();
      if (nextSearch === currentSearchRef.current) {
        return;
      }
      currentSearchRef.current = nextSearch;
      const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
      router[historyMode](nextUrl, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const handleNavigationChange = useCallback(
    (tab: ConnectTab, state: ChatShellNavigationState) => {
      navigationByTabRef.current[tab] = state;
      if (activeTabRef.current === tab) {
        const historyMode = navigationInitializedRef.current[tab]
          ? "push"
          : "replace";
        navigationInitializedRef.current[tab] = true;
        writeNavigationToUrl(tab, state, historyMode);
      }
    },
    [writeNavigationToUrl],
  );

  const handleTabChange = useCallback(
    (nextTab: ConnectTab) => {
      activeTabRef.current = nextTab;
      setActiveTab(nextTab);
      navigationInitializedRef.current[nextTab] = true;
      writeNavigationToUrl(nextTab, navigationByTabRef.current[nextTab]);
    },
    [setActiveTab, writeNavigationToUrl],
  );

  return (
    <section id="connect" className="relative flex min-h-0 flex-col bg-rose-50/40">
      <div className="flex shrink-0 flex-col items-start justify-between gap-3 border-b border-rose-100/60 bg-white/80 px-3 pb-3 pt-3 sm:flex-row sm:items-center sm:px-6 sm:py-4">
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
        <ConnectTabs activeTab={activeTab} setActiveTab={handleTabChange} fr={fr} />
      </div>

      <div className="flex-1">
        <div
          hidden={activeTab !== "discussions"}
          aria-hidden={activeTab !== "discussions"}
          data-connect-panel="discussions"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: activeTab === "discussions" ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className="h-[calc(100dvh-8.5rem)] min-h-0"
          >
            <DeferredChatShell
              initialChannelType={discussionChannelType}
              initialActionId={initialActionId}
              initialTopicId={discussionTopicId}
              initialComposerMode={initialComposerMode}
              initialAnnouncementTemplate={initialAnnouncementTemplate}
              initialEventId={initialEventId}
              initialContactRequestId={initialContactRequestId}
              initialMessage={initialMessage}
              initialRelatedEvent={initialRelatedEvent}
              announcementEventRequested={announcementEventRequested}
              announcementEventLoading={announcementEventLoading}
              announcementEventError={announcementEventError}
              initialArrondissement={initialArrondissement}
              initialZoneName={initialZoneName}
              initialRecipient={discussionRecipient}
              initialMessageId={discussionMessageId}
              navigationState={activeTab === "discussions" ? initialDiscussionNavigation : null}
              onNavigationChange={(state) => handleNavigationChange("discussions", state)}
              tone="light"
              fullHeight
              messagerieMode
            />
          </motion.div>
        </div>
        <div
          hidden={activeTab !== "dm"}
          aria-hidden={activeTab !== "dm"}
          data-connect-panel="dm"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: activeTab === "dm" ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className="h-[calc(100dvh-8.5rem)] min-h-0"
          >
            <DeferredChatShell
              initialChannelType="dm"
              initialRecipient={initialRecipient}
              initialMessageId={initialMessageId}
              initialFeedbackId={initialFeedbackId}
              initialContactRequestId={initialContactRequestId}
              navigationState={activeTab === "dm" ? initialDmNavigation : null}
              onNavigationChange={(state) => handleNavigationChange("dm", state)}
              tone="light"
              fullHeight
              messagerieMode
            />
          </motion.div>
        </div>
      </div>

    </section>
  );
}
