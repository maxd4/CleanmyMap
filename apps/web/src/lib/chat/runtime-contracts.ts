import { isChatRecord } from "./postgrest";

export type ChatMessageRuntimeRow = Record<string, unknown> & {
  id: string;
  created_at: string;
};

export type ChatRelatedEventRuntimeRow = {
  id: string;
  title: string;
  event_date: string;
  location_label: string;
};

export type CurrentChatProfileRuntimeRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

export type DmInboxRuntimeRow = {
  peer_id: string;
  peer_display_name: string | null;
  peer_handle: string | null;
  peer_avatar_url: string | null;
  last_message_id: string;
  last_message_content: string;
  last_message_created_at: string;
  last_message_sender_id: string;
  last_message_direction: "sent" | "received";
  unread_count: number | string | null;
};

export type ChatContactRequestRuntimeRow = {
  request_id: string;
  created_at: string;
  sender_id: string;
  sender_display_name: string | null;
  sender_handle: string | null;
  sender_avatar_url: string | null;
  action_id: string;
  content: string;
};

export type ChatPollOptionRuntimeRow = {
  id: string;
  position: number;
  label: string;
  voteCount?: number;
};

export type ChatActionExclusionRuntimeRow = {
  user_id: string;
  excluded_by_user_id: string;
  excluded_at: string;
  reason: string | null;
  active: boolean;
  reinstated_at: string | null;
  reinstated_by_user_id: string | null;
};

export type DiscussionRateLimitRuntimeRow = {
  allowed: boolean;
  reason: string;
  retry_after_seconds: number | null;
  messages_today: number;
  remaining_today: number;
};

export type ChatActionShareRequestCreationRuntimeRow = {
  result: string;
  request_id: string | null;
  retry_after_seconds: number | null;
};

export type ChatActionShareRequestDecisionRuntimeRow = {
  status: string;
  message_id: string | null;
  action_id: string | null;
  sender_id: string | null;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNullableRecord(value: unknown): value is Record<string, unknown> | null {
  return value === null || isChatRecord(value);
}

export function isChatMessageRuntimeRow(value: unknown): value is ChatMessageRuntimeRow {
  return isChatRecord(value) &&
    typeof value.id === "string" &&
    typeof value.created_at === "string";
}

export function isChatRelatedEventRuntimeRow(value: unknown): value is ChatRelatedEventRuntimeRow {
  return isChatRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.event_date === "string" &&
    typeof value.location_label === "string";
}

export function isCurrentChatProfileRuntimeRow(value: unknown): value is CurrentChatProfileRuntimeRow {
  return isChatRecord(value) &&
    typeof value.id === "string" &&
    isNullableString(value.display_name) &&
    isNullableString(value.handle) &&
    isNullableFiniteNumber(value.paris_arrondissement) &&
    isNullableString(value.role_label) &&
    isNullableRecord(value.metadata);
}

export function isDmInboxRuntimeRow(value: unknown): value is DmInboxRuntimeRow {
  return isChatRecord(value) &&
    typeof value.peer_id === "string" &&
    isNullableString(value.peer_display_name) &&
    isNullableString(value.peer_handle) &&
    isNullableString(value.peer_avatar_url) &&
    typeof value.last_message_id === "string" &&
    typeof value.last_message_content === "string" &&
    typeof value.last_message_created_at === "string" &&
    typeof value.last_message_sender_id === "string" &&
    (value.last_message_direction === "sent" || value.last_message_direction === "received") &&
    (value.unread_count === null || typeof value.unread_count === "number" || typeof value.unread_count === "string");
}

export function isChatContactRequestRuntimeRow(value: unknown): value is ChatContactRequestRuntimeRow {
  return isChatRecord(value) &&
    typeof value.request_id === "string" &&
    typeof value.created_at === "string" &&
    typeof value.sender_id === "string" &&
    isNullableString(value.sender_display_name) &&
    isNullableString(value.sender_handle) &&
    isNullableString(value.sender_avatar_url) &&
    typeof value.action_id === "string" &&
    typeof value.content === "string";
}

export function isChatPollOptionRuntimeRow(value: unknown): value is ChatPollOptionRuntimeRow {
  return isChatRecord(value) &&
    typeof value.id === "string" &&
    typeof value.position === "number" && Number.isFinite(value.position) &&
    typeof value.label === "string" &&
    (value.voteCount === undefined || (typeof value.voteCount === "number" && Number.isFinite(value.voteCount)));
}

export function isChatActionExclusionRuntimeRow(value: unknown): value is ChatActionExclusionRuntimeRow {
  return isChatRecord(value) &&
    typeof value.user_id === "string" &&
    typeof value.excluded_by_user_id === "string" &&
    typeof value.excluded_at === "string" &&
    isNullableString(value.reason) &&
    typeof value.active === "boolean" &&
    isNullableString(value.reinstated_at) &&
    isNullableString(value.reinstated_by_user_id);
}

export function isDiscussionRateLimitRuntimeRow(value: unknown): value is DiscussionRateLimitRuntimeRow {
  return isChatRecord(value) &&
    typeof value.allowed === "boolean" &&
    typeof value.reason === "string" &&
    isNullableFiniteNumber(value.retry_after_seconds) &&
    typeof value.messages_today === "number" && Number.isFinite(value.messages_today) &&
    typeof value.remaining_today === "number" && Number.isFinite(value.remaining_today);
}

export function isChatActionShareRequestCreationRuntimeRow(
  value: unknown,
): value is ChatActionShareRequestCreationRuntimeRow {
  return isChatRecord(value) &&
    typeof value.result === "string" &&
    isNullableString(value.request_id) &&
    isNullableFiniteNumber(value.retry_after_seconds);
}

export function isChatActionShareRequestDecisionRuntimeRow(
  value: unknown,
): value is ChatActionShareRequestDecisionRuntimeRow {
  return isChatRecord(value) &&
    typeof value.status === "string" &&
    isNullableString(value.message_id) &&
    isNullableString(value.action_id) &&
    isNullableString(value.sender_id);
}
