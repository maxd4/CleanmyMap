import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ActionShareContactRequest, ChatMessage, ChatUser } from "./chat-types";
import type { SendChatMessageParams } from "./hooks/use-chat-data";

export function resolveStateValue<T>(
  nextValue: T | ((currentValue: T) => T),
  currentValue: T,
): T {
  return typeof nextValue === "function"
    ? (nextValue as (currentValue: T) => T)(currentValue)
    : nextValue;
}

export function resolveActiveChannelType({
  nextValue,
  currentValue,
  clearFeedback,
}: {
  nextValue: ChatChannelType | ((currentValue: ChatChannelType) => ChatChannelType);
  currentValue: ChatChannelType;
  clearFeedback: () => void;
}): ChatChannelType {
  const resolvedValue = resolveStateValue(nextValue, currentValue);
  if (resolvedValue !== "dm") {
    clearFeedback();
  }
  return resolvedValue;
}

export function resolveSelectedRecipient({
  nextValue,
  currentValue,
  initialRecipient,
  clearFeedback,
}: {
  nextValue: ChatUser | null | ((currentValue: ChatUser | null) => ChatUser | null);
  currentValue: ChatUser | null;
  initialRecipient?: ChatUser | null;
  clearFeedback: () => void;
}): ChatUser | null {
  const resolvedValue = resolveStateValue(nextValue, currentValue);
  if (resolvedValue?.id !== initialRecipient?.id) {
    clearFeedback();
  }
  return resolvedValue;
}

export function shouldOpenPublicThreadOnMobile({
  messagerieMode,
  initialChannelType,
  initialTopicId,
  initialActionId,
  initialMessageId,
}: {
  messagerieMode: boolean;
  initialChannelType: ChatChannelType;
  initialTopicId?: ChatTopicId | null;
  initialActionId?: string | null;
  initialMessageId?: string | null;
}): boolean {
  return !messagerieMode
    || initialChannelType !== "community"
    || Boolean(initialTopicId || initialActionId || initialMessageId);
}

export function getChatShellFeatureFlags({
  messagerieMode,
  activeChannelType,
  isBugReportChannel,
  isLoaded,
  isSignedIn,
}: {
  messagerieMode: boolean;
  activeChannelType: ChatChannelType;
  isBugReportChannel: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
}) {
  const canAccessProtectedChat = isLoaded && isSignedIn;
  return {
    canAccessProtectedChat,
    actionDiscussionsEnabled: messagerieMode && isLoaded,
    chatSearchEnabled: messagerieMode && !isBugReportChannel && canAccessProtectedChat,
    dmInboxEnabled: messagerieMode && activeChannelType === "dm",
    contactRequestsEnabled: messagerieMode && activeChannelType === "dm" && canAccessProtectedChat,
    notificationsEnabled: messagerieMode && canAccessProtectedChat,
    searchVisible: messagerieMode && !isBugReportChannel && activeChannelType !== "action",
  };
}

export function getFeedbackIdForSubmit({
  activeChannelType,
  selectedRecipient,
  initialRecipient,
  activeFeedbackId,
  isInitialRecipient,
}: {
  activeChannelType: ChatChannelType;
  selectedRecipient: ChatUser | null;
  initialRecipient?: ChatUser | null;
  activeFeedbackId: string | null;
  isInitialRecipient: (selectedRecipient: ChatUser | null, initialRecipient?: ChatUser | null) => boolean;
}): string | null {
  return activeChannelType === "dm" && isInitialRecipient(selectedRecipient, initialRecipient)
    ? activeFeedbackId
    : null;
}

export async function sendChatMessageAndRefreshInbox({
  params,
  sendChatMessage,
  activeFeedbackId,
  setActiveFeedbackId,
  refreshInbox,
  consumeFeedbackId,
}: {
  params: SendChatMessageParams;
  sendChatMessage: (params: SendChatMessageParams) => Promise<ChatMessage>;
  activeFeedbackId: string | null;
  setActiveFeedbackId: (value: string | null) => void;
  refreshInbox: () => Promise<unknown>;
  consumeFeedbackId: () => void;
}) {
  const sentMessage = await sendChatMessage(params);
  if (params.body.feedbackId === activeFeedbackId) {
    setActiveFeedbackId(null);
    consumeFeedbackId();
  }
  if (params.body.channelType === "dm") {
    try {
      await refreshInbox();
    } catch {
      // API accepted; inbox refresh is best-effort.
    }
  }
  return sentMessage;
}

export async function respondToActionShareContactRequestAndOpenDm({
  request,
  decision,
  respond,
  refreshInbox,
  selectRecipient,
}: {
  request: ActionShareContactRequest;
  decision: "accept" | "reject" | "ignore";
  respond: (requestId: string, decision: "accept" | "reject" | "ignore") => Promise<void>;
  refreshInbox: () => Promise<unknown>;
  selectRecipient: (recipient: ChatUser) => void;
}) {
  await respond(request.id, decision);
  if (decision === "accept") {
    await refreshInbox();
    selectRecipient(request.sender);
  }
}

export function applyChatStarterPrompt({
  prompt,
  activeChannelType,
  selectedRecipient,
  setMessage,
  setShowMentions,
  setSendError,
  setIsRecipientPickerOpen,
}: {
  prompt: string;
  activeChannelType: ChatChannelType;
  selectedRecipient: ChatUser | null;
  setMessage: (value: string) => void;
  setShowMentions: (value: boolean) => void;
  setSendError: (value: string | null) => void;
  setIsRecipientPickerOpen: (value: boolean) => void;
}) {
  setMessage(prompt);
  setShowMentions(false);
  setSendError(null);
  if (activeChannelType === "dm" && !selectedRecipient) {
    setIsRecipientPickerOpen(true);
  }
}
