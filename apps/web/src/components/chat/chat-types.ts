import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatMessageKind, ChatRelatedEvent } from "@/lib/chat/announcements";
import type { ChatPollOption } from "@/lib/chat/polls";
import type { ChatHistoryCursor } from "@/lib/chat/chat-pagination";
export type { ChatHistoryCursor } from "@/lib/chat/chat-pagination";
export type { ChatSearchResponse, ChatSearchResult } from "@/lib/chat/chat-search";

export type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  channel_type: ChatChannelType;
  topic_id: ChatTopicId | null;
  message_kind: ChatMessageKind;
  related_event_id: string | null;
  related_event: ChatRelatedEvent | null;
  poll_options: ChatPollOption[];
  totalVotes?: number;
  selectedOptionId?: string | null;
  attachment_url?: string;
  attachment_type?: string | null;
  attachment_expires_at?: string | null;
  created_at: string;
  sender: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
};

export type ChatUser = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
};

export type ChatMessagesResponse = {
  messages: ChatMessage[];
  previousCursor: ChatHistoryCursor | null;
  hasMore: boolean;
  targetMessageId?: string | null;
  targetStatus?: "found" | "unavailable";
};

export type ChatUsersResponse = {
  users: ChatUser[];
};

export type DmConversation = {
  peer: ChatUser;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    direction: "sent" | "received";
  };
  unreadCount: number;
};

export type DmInboxResponse = {
  conversations: DmConversation[];
};
