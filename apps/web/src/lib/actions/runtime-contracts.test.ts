import { describe, expect, it } from "vitest";
import {
  isActionInvitationDecisionRow,
  isActionInvitationLinkMetadataRow,
  isActionInvitationLinkResolutionRow,
  isActionParticipantStateRow,
  isActionRegistrationStateRow,
  isActionResultPromptDecisionRow,
  isPendingActionResultPromptRow,
  isPendingPostActionClaimRow,
  isPendingRegistrationRequestRow,
  isPrivateActionRegistrationRow,
  isPublishedActionRow,
  isPublicCommunityEventRow,
} from "./runtime-contracts";

type ContractCase = {
  name: string;
  guard: (value: unknown) => boolean;
  valid: unknown;
  invalid: unknown[];
};

const cases: ContractCase[] = [
  {
    name: "invitation link metadata",
    guard: isActionInvitationLinkMetadataRow,
    valid: { created_at: "2026-10-01T10:00:00Z", revoked_at: null, expires_at: "2026-11-01T10:00:00Z" },
    invalid: [
      { created_at: "", revoked_at: null, expires_at: null },
      { created_at: null, revoked_at: null, expires_at: null },
      { created_at: "date", revoked_at: 42, expires_at: null },
    ],
  },
  {
    name: "invitation link resolution",
    guard: isActionInvitationLinkResolutionRow,
    valid: { action_id: "action-1", revoked_at: null, expires_at: null },
    invalid: [
      { action_id: "", revoked_at: null, expires_at: null },
      { action_id: "action-1", revoked_at: {}, expires_at: null },
      { action_id: "action-1", revoked_at: null, expires_at: false },
    ],
  },
  {
    name: "public community event",
    guard: isPublicCommunityEventRow,
    valid: { id: "event-1", title: "Nettoyage", event_date: "2026-10-01", location_label: "Paris" },
    invalid: [
      { id: "event-1", title: "", event_date: "2026-10-01", location_label: "Paris" },
      { id: "event-1", title: "Nettoyage", event_date: 1, location_label: "Paris" },
      { id: "event-1", title: "Nettoyage", event_date: "2026-10-01", location_label: null },
    ],
  },
  {
    name: "published action",
    guard: isPublishedActionRow,
    valid: { id: "action-1", published_at: null },
    invalid: [
      { id: "", published_at: null },
      { id: "action-1", published_at: 123 },
      ["action-1", null],
    ],
  },
  {
    name: "pending registration request",
    guard: isPendingRegistrationRequestRow,
    valid: { registration_id: "registration-1", action_id: "action-1" },
    invalid: [
      { registration_id: "", action_id: "action-1" },
      { registration_id: "registration-1", action_id: undefined },
      { registration_id: "registration-1", action_id: 7 },
    ],
  },
  {
    name: "pending post-action claim",
    guard: isPendingPostActionClaimRow,
    valid: { participation_id: "participation-1", action_id: "action-1" },
    invalid: [
      { participation_id: null, action_id: "action-1" },
      { participation_id: "participation-1", action_id: "" },
      { participation_id: "participation-1", action_id: { id: "action-1" } },
    ],
  },
  {
    name: "pending result prompt",
    guard: isPendingActionResultPromptRow,
    valid: { notification_id: "notification-1", action_id: "action-1" },
    invalid: [
      { notification_id: "", action_id: "action-1" },
      { notification_id: "notification-1", action_id: null },
      { notification_id: "notification-1" },
    ],
  },
  {
    name: "invitation decision",
    guard: isActionInvitationDecisionRow,
    valid: { status: "accepted", registration_id: "registration-1", action_id: null },
    invalid: [
      { status: "pending", registration_id: "registration-1", action_id: null },
      { status: "accepted", registration_id: "", action_id: null },
      { status: "rejected", registration_id: "registration-1", action_id: 42 },
    ],
  },
  {
    name: "result prompt decision",
    guard: isActionResultPromptDecisionRow,
    valid: { status: "claimed", action_id: "action-1" },
    invalid: [
      { status: "accepted", action_id: "action-1" },
      { status: "declined", action_id: "" },
      { status: "unavailable", action_id: null },
    ],
  },
  {
    name: "participant state",
    guard: isActionParticipantStateRow,
    valid: { participation_status: "confirmed", participation_source: "invitation" },
    invalid: [
      { participation_status: "accepted", participation_source: "invitation" },
      { participation_status: "pending", participation_source: "" },
      { participation_status: "cancelled", participation_source: 1 },
    ],
  },
  {
    name: "registration state",
    guard: isActionRegistrationStateRow,
    valid: { registration_status: "cancelled", registration_source: "private", registration_cancellation_reason: undefined },
    invalid: [
      { registration_status: "accepted", registration_source: "private", registration_cancellation_reason: null },
      { registration_status: "pending", registration_source: "", registration_cancellation_reason: null },
      { registration_status: "confirmed", registration_source: "private", registration_cancellation_reason: 1 },
    ],
  },
  {
    name: "private registration",
    guard: isPrivateActionRegistrationRow,
    valid: { registration_status: "pending" },
    invalid: [
      { registration_status: "accepted" },
      { registration_status: null },
      "confirmed",
    ],
  },
];

describe("Action runtime row contracts", () => {
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
