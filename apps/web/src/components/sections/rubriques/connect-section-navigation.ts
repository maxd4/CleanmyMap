"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ChatShellNavigationState } from "@/components/chat/chat-navigation";
import { synchronizeConnectNavigationParams, useConnectData } from "./use-connect-data";
import type { ConnectTab } from "./connect-types";

type ConnectData = ReturnType<typeof useConnectData>;

export function useConnectNavigation({
  data,
  searchParams,
  pathname,
  router,
}: {
  data: ConnectData;
  searchParams: ReadonlyURLSearchParams;
  pathname: string;
  router: AppRouterInstance;
}) {
  const { activeTab, setActiveTab, initialChannelType, initialActionId, initialTopicId, initialAnnouncementTemplate, initialRecipient, initialZoneName, initialArrondissement, initialMessageId, initialFeedbackId, initialEventId, initialContactRequestId } = data;
  const discussionChannelType = initialChannelType === "dm" ? "community" : initialChannelType;
  const discussionTopicId = initialChannelType === "dm" ? null : initialTopicId;
  const discussionRecipient = initialChannelType === "dm" ? null : initialRecipient;
  const discussionMessageId = initialChannelType === "dm" ? null : initialMessageId;
  const initialDiscussionNavigation = useMemo<ChatShellNavigationState>(() => ({ activeChannelType: discussionChannelType, activeTopicId: discussionTopicId, selectedActionId: discussionChannelType === "action" ? initialActionId : null, selectedRecipient: null, selectedZone: initialZoneName ?? "", territoryFocus: initialArrondissement, messageId: discussionMessageId, feedbackId: null, contactRequestId: null, announcementTemplate: initialAnnouncementTemplate, eventId: initialAnnouncementTemplate ? initialEventId : null }), [discussionChannelType, discussionMessageId, discussionTopicId, initialActionId, initialAnnouncementTemplate, initialArrondissement, initialEventId, initialZoneName]);
  const initialDmNavigation = useMemo<ChatShellNavigationState>(() => ({ activeChannelType: "dm", activeTopicId: null, selectedActionId: null, selectedRecipient: initialChannelType === "dm" ? initialRecipient : null, selectedZone: initialZoneName ?? "", territoryFocus: initialArrondissement, messageId: initialChannelType === "dm" ? initialMessageId : null, feedbackId: initialChannelType === "dm" ? initialFeedbackId : null, contactRequestId: initialChannelType === "dm" ? initialContactRequestId : null, announcementTemplate: null, eventId: null }), [initialArrondissement, initialChannelType, initialContactRequestId, initialFeedbackId, initialMessageId, initialRecipient, initialZoneName]);
  const navigationByTabRef = useRef<Record<ConnectTab, ChatShellNavigationState>>({ discussions: initialDiscussionNavigation, dm: initialDmNavigation });
  const navigationInitializedRef = useRef<Record<ConnectTab, boolean>>({ discussions: false, dm: false });
  const activeTabRef = useRef(activeTab);
  const currentSearchRef = useRef(searchParams.toString());
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { currentSearchRef.current = searchParams.toString(); }, [searchParams]);
  const writeNavigationToUrl = useCallback((tab: ConnectTab, state: ChatShellNavigationState, historyMode: "push" | "replace" = "push") => {
    const nextSearch = synchronizeConnectNavigationParams(currentSearchRef.current, tab, state).toString();
    if (nextSearch === currentSearchRef.current) return;
    currentSearchRef.current = nextSearch;
    router[historyMode](nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router]);
  const handleNavigationChange = useCallback((tab: ConnectTab, state: ChatShellNavigationState) => {
    navigationByTabRef.current[tab] = state;
    if (activeTabRef.current !== tab) return;
    const historyMode = navigationInitializedRef.current[tab] ? "push" : "replace";
    navigationInitializedRef.current[tab] = true;
    writeNavigationToUrl(tab, state, historyMode);
  }, [writeNavigationToUrl]);
  const handleTabChange = useCallback((nextTab: ConnectTab) => {
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
    navigationInitializedRef.current[nextTab] = true;
    writeNavigationToUrl(nextTab, navigationByTabRef.current[nextTab]);
  }, [setActiveTab, writeNavigationToUrl]);
  return { activeTab, discussionChannelType, discussionTopicId, discussionRecipient, discussionMessageId, initialDiscussionNavigation, initialDmNavigation, handleNavigationChange, handleTabChange };
}
