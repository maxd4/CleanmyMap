"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ChatChannelType } from "@/lib/chat/channels";
import type {
  CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatShellComposerMode } from "./use-chat-shell-composer";
import type { ChatUser } from "../chat-types";
import {
  getChatShellNavigationKey,
  type ChatShellNavigationState,
} from "../chat-navigation";

type UseChatShellNavigationParams = {
  navigationState: ChatShellNavigationState | null;
  onNavigationChange?: (state: ChatShellNavigationState) => void;
  initialRecipient?: ChatUser | null;
  initialContactRequestId: string | null;
  initialAnnouncementTemplate: CommunityAnnouncementTemplateKey | null;
  initialEventId: string | null;
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  handleAnnouncementTemplateChange: (
    template: CommunityAnnouncementTemplateKey,
  ) => void;
  handleComposerModeChange: (mode: ChatShellComposerMode) => void;
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedActionId: string | null;
  selectedRecipient: ChatUser | null;
  selectedZone: string;
  territoryFocus: number | null;
  targetMessageIdForScope: string | null;
  activeFeedbackId: string | null;
  setActiveChannelType: Dispatch<SetStateAction<ChatChannelType>>;
  setSelectedActionId: Dispatch<SetStateAction<string | null>>;
  setActiveTopicId: Dispatch<SetStateAction<ChatTopicId | null>>;
  setSelectedRecipient: Dispatch<SetStateAction<ChatUser | null>>;
  setSelectedZone: Dispatch<SetStateAction<string>>;
  setActiveFeedbackId: Dispatch<SetStateAction<string | null>>;
};

export function useChatShellNavigation({
  navigationState,
  onNavigationChange,
  initialRecipient,
  initialContactRequestId,
  initialAnnouncementTemplate,
  initialEventId,
  announcementTemplate,
  handleAnnouncementTemplateChange,
  handleComposerModeChange,
  activeChannelType,
  activeTopicId,
  selectedActionId,
  selectedRecipient,
  selectedZone,
  territoryFocus,
  targetMessageIdForScope,
  activeFeedbackId,
  setActiveChannelType,
  setSelectedActionId,
  setActiveTopicId,
  setSelectedRecipient,
  setSelectedZone,
  setActiveFeedbackId,
}: UseChatShellNavigationParams) {
  const navigationStateKey = navigationState
    ? getChatShellNavigationKey(navigationState)
    : null;
  const appliedNavigationStateKeyRef = useRef<string | null>(null);
  const restoringNavigationRef = useRef(false);

  useEffect(() => {
    if (
      !navigationState ||
      !navigationStateKey ||
      appliedNavigationStateKeyRef.current === navigationStateKey
    ) {
      return;
    }

    if (appliedNavigationStateKeyRef.current !== null) {
      restoringNavigationRef.current = true;
    }
    appliedNavigationStateKeyRef.current = navigationStateKey;
    setActiveChannelType(navigationState.activeChannelType);
    setSelectedActionId(
      navigationState.activeChannelType === "action"
        ? navigationState.selectedActionId
        : null,
    );
    setActiveTopicId(navigationState.activeTopicId);
    setSelectedRecipient(navigationState.selectedRecipient);
    setSelectedZone(navigationState.selectedZone);
    setActiveFeedbackId(navigationState.feedbackId);
    if (navigationState.announcementTemplate) {
      handleAnnouncementTemplateChange(navigationState.announcementTemplate);
    } else if (announcementTemplate) {
      handleComposerModeChange("message");
    }
  }, [
    announcementTemplate,
    handleAnnouncementTemplateChange,
    handleComposerModeChange,
    navigationState,
    navigationStateKey,
    setActiveChannelType,
    setActiveTopicId,
    setSelectedActionId,
    setSelectedRecipient,
    setSelectedZone,
    setActiveFeedbackId,
  ]);

  const navigationChangeRef = useRef(onNavigationChange);
  useEffect(() => {
    navigationChangeRef.current = onNavigationChange;
  }, [onNavigationChange]);

  useEffect(() => {
    if (restoringNavigationRef.current) {
      restoringNavigationRef.current = false;
      return;
    }
    navigationChangeRef.current?.({
      activeChannelType,
      activeTopicId,
      selectedActionId,
      selectedRecipient,
      selectedZone,
      territoryFocus,
      messageId: targetMessageIdForScope,
      feedbackId: activeFeedbackId,
      contactRequestId:
        selectedRecipient?.id === initialRecipient?.id
          ? initialContactRequestId
          : null,
      announcementTemplate,
      eventId:
        announcementTemplate && announcementTemplate === initialAnnouncementTemplate
          ? initialEventId
          : null,
    });
  }, [
    activeChannelType,
    activeFeedbackId,
    activeTopicId,
    announcementTemplate,
    initialAnnouncementTemplate,
    initialContactRequestId,
    initialEventId,
    initialRecipient?.id,
    selectedActionId,
    selectedRecipient,
    selectedZone,
    territoryFocus,
    targetMessageIdForScope,
  ]);
}
