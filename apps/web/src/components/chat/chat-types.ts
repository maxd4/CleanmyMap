import type { ChatChannelType } from "@/lib/chat/channels";

export type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  channel_type: ChatChannelType;
  attachment_url?: string;
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
};

export type ChatUsersResponse = {
  users: ChatUser[];
};
