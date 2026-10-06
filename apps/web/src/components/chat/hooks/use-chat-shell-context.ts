"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatUser } from "../chat-types";
import { useChatState } from "./use-chat-state";
import { useChatShellRuntimeContext } from "./use-chat-shell-runtime-context";
import { useChatShellData } from "./use-chat-shell-data";
import {
  getChatShellFeatureFlags,
  resolveActiveChannelType,
  resolveSelectedRecipient,
} from "../chat-shell.behavior";

type UseChatShellContextParams = {
  initialChannelType: ChatChannelType;
  initialArrondissement?: number | null;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialTopicId?: ChatTopicId | null;
  initialMessage?: string;
  initialActionId?: string | null;
  initialMessageId?: string | null;
  messagerieMode: boolean;
  activeFeedbackId: string | null;
  setActiveFeedbackId: Dispatch<SetStateAction<string | null>>;
};

export function useChatShellContext({
  initialChannelType,
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialTopicId,
  initialMessage,
  initialActionId,
  initialMessageId,
  messagerieMode,
  activeFeedbackId,
  setActiveFeedbackId,
}: UseChatShellContextParams) {
  const state = useChatState({
    initialChannelType,
    initialArrondissement,
    initialZoneName,
    initialRecipient,
    initialTopicId,
    initialMessage,
    initialActionId,
  });
  const {
    setActiveChannelType: setActiveChannelTypeState,
    setSelectedRecipient: setSelectedRecipientState,
  } = state;
  const setActiveChannelType = useCallback(
    (nextValue: Parameters<typeof setActiveChannelTypeState>[0]) => {
      setActiveChannelTypeState((currentValue) => resolveActiveChannelType({
        nextValue,
        currentValue,
        clearFeedback: () => setActiveFeedbackId(null),
      }));
    },
    [setActiveChannelTypeState, setActiveFeedbackId],
  );
  const setSelectedRecipient = useCallback(
    (nextValue: Parameters<typeof setSelectedRecipientState>[0]) => {
      setSelectedRecipientState((currentValue) => resolveSelectedRecipient({
        nextValue,
        currentValue,
        initialRecipient,
        clearFeedback: () => setActiveFeedbackId(null),
      }));
    },
    [initialRecipient, setActiveFeedbackId, setSelectedRecipientState],
  );

  const runtime = useChatShellRuntimeContext({
    selectedZone: state.selectedZone,
    initialArrondissement,
  });
  const featureFlags = getChatShellFeatureFlags({
    messagerieMode,
    activeChannelType: state.activeChannelType,
    isBugReportChannel: state.isBugReportChannel,
    isLoaded: runtime.isLoaded,
    isSignedIn: runtime.isSignedIn,
  });
  const data = useChatShellData({
    state,
    runtime,
    featureFlags,
    initialChannelType,
    initialTopicId,
    initialRecipient,
    initialMessageId: initialMessageId ?? null,
    activeFeedbackId,
    setActiveFeedbackId,
  });

  return {
    ...state,
    ...runtime,
    featureFlags,
    setActiveChannelType,
    setSelectedRecipient,
    ...data,
  };
}
