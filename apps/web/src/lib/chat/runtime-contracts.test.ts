import { describe, expect, it } from "vitest";
import {
  isChatActionExclusionRuntimeRow,
  isChatActionShareRequestCreationRuntimeRow,
  isChatActionShareRequestDecisionRuntimeRow,
  isChatContactRequestRuntimeRow,
  isChatMessageRuntimeRow,
  isChatPollOptionRuntimeRow,
  isChatRelatedEventRuntimeRow,
  isCurrentChatProfileRuntimeRow,
  isDiscussionRateLimitRuntimeRow,
  isDmInboxRuntimeRow,
} from "./runtime-contracts";

type ContractCase = {
  name: string;
  guard: (value: unknown) => boolean;
  valid: unknown;
  invalid: unknown[];
};

const cases: ContractCase[] = [
  {
    name: "chat message",
    guard: isChatMessageRuntimeRow,
    valid: { id: "message-1", created_at: "2026-10-01T10:00:00Z", content: "Bonjour" },
    invalid: [
      { id: 0, created_at: "2026-10-01T10:00:00Z" },
      { id: "message-1", created_at: null },
      ["message-1", "2026-10-01T10:00:00Z"],
    ],
  },
  {
    name: "related event",
    guard: isChatRelatedEventRuntimeRow,
    valid: { id: "event-1", title: "Nettoyage", event_date: "2026-10-01", location_label: "Paris" },
    invalid: [
      { id: "event-1", title: null, event_date: "2026-10-01", location_label: "Paris" },
      { id: "event-1", title: "Nettoyage", event_date: 1, location_label: "Paris" },
      { id: "event-1", title: "Nettoyage", event_date: "2026-10-01", location_label: null },
    ],
  },
  {
    name: "current profile",
    guard: isCurrentChatProfileRuntimeRow,
    valid: { id: "user-1", display_name: null, handle: "max", paris_arrondissement: 5, role_label: null, metadata: { locale: "fr" } },
    invalid: [
      { id: "user-1", display_name: null, handle: "max", paris_arrondissement: Number.NaN, role_label: null, metadata: null },
      { id: "user-1", display_name: null, handle: "max", paris_arrondissement: 5, role_label: null, metadata: [] },
      { id: "user-1", display_name: 42, handle: "max", paris_arrondissement: null, role_label: null, metadata: null },
    ],
  },
  {
    name: "DM inbox",
    guard: isDmInboxRuntimeRow,
    valid: { peer_id: "peer-1", peer_display_name: null, peer_handle: "peer", peer_avatar_url: null, last_message_id: "message-1", last_message_content: "Salut", last_message_created_at: "2026-10-01T10:00:00Z", last_message_sender_id: "peer-1", last_message_direction: "received", unread_count: "2" },
    invalid: [
      { peer_id: "peer-1", peer_display_name: null, peer_handle: null, peer_avatar_url: null, last_message_id: "message-1", last_message_content: "Salut", last_message_created_at: "date", last_message_sender_id: "peer-1", last_message_direction: "other", unread_count: 2 },
      { peer_id: "peer-1", peer_display_name: null, peer_handle: null, peer_avatar_url: null, last_message_id: "message-1", last_message_content: "Salut", last_message_created_at: "date", last_message_sender_id: "peer-1", last_message_direction: "sent", unread_count: {} },
      { peer_id: "peer-1", peer_display_name: null, peer_handle: null, peer_avatar_url: null, last_message_id: "message-1", last_message_content: 4, last_message_created_at: "date", last_message_sender_id: "peer-1", last_message_direction: "sent", unread_count: null },
    ],
  },
  {
    name: "contact request",
    guard: isChatContactRequestRuntimeRow,
    valid: { request_id: "request-1", created_at: "2026-10-01T10:00:00Z", sender_id: "sender-1", sender_display_name: "Alex", sender_handle: null, sender_avatar_url: null, action_id: "action-1", content: "Bonjour" },
    invalid: [
      { request_id: "request-1", created_at: "date", sender_id: "sender-1", sender_display_name: "Alex", sender_handle: null, sender_avatar_url: null, action_id: "action-1", content: null },
      { request_id: "request-1", created_at: "date", sender_id: "sender-1", sender_display_name: [], sender_handle: null, sender_avatar_url: null, action_id: "action-1", content: "Bonjour" },
      { request_id: "request-1", created_at: "date", sender_id: "sender-1", sender_display_name: null, sender_handle: null, sender_avatar_url: null, action_id: 0, content: "Bonjour" },
    ],
  },
  {
    name: "poll option",
    guard: isChatPollOptionRuntimeRow,
    valid: { id: "option-1", position: 0, label: "Oui" },
    invalid: [
      { id: "option-1", position: Number.NaN, label: "Oui" },
      { id: "option-1", position: 0, label: "Oui", voteCount: Infinity },
      { id: "option-1", position: 0, label: 42 },
    ],
  },
  {
    name: "action exclusion",
    guard: isChatActionExclusionRuntimeRow,
    valid: { user_id: "user-1", excluded_by_user_id: "user-2", excluded_at: "2026-10-01T10:00:00Z", reason: null, active: true, reinstated_at: null, reinstated_by_user_id: null },
    invalid: [
      { user_id: "user-1", excluded_by_user_id: "user-2", excluded_at: "date", reason: null, active: "true", reinstated_at: null, reinstated_by_user_id: null },
      { user_id: "user-1", excluded_by_user_id: "user-2", excluded_at: "date", reason: 3, active: true, reinstated_at: null, reinstated_by_user_id: null },
      { user_id: "user-1", excluded_by_user_id: "user-2", excluded_at: "date", reason: null, active: true, reinstated_at: null, reinstated_by_user_id: 7 },
    ],
  },
  {
    name: "discussion rate limit",
    guard: isDiscussionRateLimitRuntimeRow,
    valid: { allowed: false, reason: "cooldown", retry_after_seconds: 18, messages_today: 2, remaining_today: 8 },
    invalid: [
      { allowed: "false", reason: "cooldown", retry_after_seconds: 18, messages_today: 2, remaining_today: 8 },
      { allowed: false, reason: "cooldown", retry_after_seconds: Number.NaN, messages_today: 2, remaining_today: 8 },
      { allowed: false, reason: "cooldown", retry_after_seconds: null, messages_today: Infinity, remaining_today: 8 },
    ],
  },
  {
    name: "share request creation",
    guard: isChatActionShareRequestCreationRuntimeRow,
    valid: { result: "created", request_id: "request-1", retry_after_seconds: null },
    invalid: [
      { result: "created", request_id: 3, retry_after_seconds: null },
      { result: "created", request_id: null, retry_after_seconds: Infinity },
      { result: null, request_id: null, retry_after_seconds: null },
    ],
  },
  {
    name: "share request decision",
    guard: isChatActionShareRequestDecisionRuntimeRow,
    valid: { status: "accepted", message_id: null, action_id: "action-1", sender_id: "sender-1" },
    invalid: [
      { status: 1, message_id: null, action_id: "action-1", sender_id: "sender-1" },
      { status: "accepted", message_id: {}, action_id: null, sender_id: null },
      { status: "accepted", message_id: null, action_id: null, sender_id: [] },
    ],
  },
];

describe("Chat runtime row contracts", () => {
  it.each(cases)("accepts a valid $name row", ({ guard, valid }) => {
    expect(guard(valid)).toBe(true);
  });

  it.each(cases.flatMap(({ name, guard, invalid }) =>
    invalid.map((value, index) => ({ name: `${name} invalid variant ${index + 1}`, guard, value }))))(
    "rejects $name",
    ({ guard, value }) => {
      expect(guard(value)).toBe(false);
    },
  );
});
