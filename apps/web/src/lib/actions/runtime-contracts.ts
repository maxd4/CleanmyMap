import type {
  ActionParticipantRow,
  ActionRegistrationRow,
} from "@/types/database";
import {
  isActionRecord,
  isNullableString,
} from "./query";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export type ActionInvitationLinkMetadataRow = {
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
};

export function isActionInvitationLinkMetadataRow(
  value: unknown,
): value is ActionInvitationLinkMetadataRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.created_at) &&
    isNullableString(value.revoked_at) &&
    isNullableString(value.expires_at);
}

export type ActionInvitationLinkResolutionRow = {
  action_id: string;
  revoked_at: string | null;
  expires_at: string | null;
};

export function isActionInvitationLinkResolutionRow(
  value: unknown,
): value is ActionInvitationLinkResolutionRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.action_id) &&
    isNullableString(value.revoked_at) &&
    isNullableString(value.expires_at);
}

export type PublicCommunityEventRow = {
  id: string;
  title: string;
  event_date: string;
  location_label: string;
};

export function isPublicCommunityEventRow(
  value: unknown,
): value is PublicCommunityEventRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.event_date) &&
    isNonEmptyString(value.location_label);
}

export type PublishedActionRow = {
  id: string;
  published_at: string | null;
};

export function isPublishedActionRow(value: unknown): value is PublishedActionRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.id) &&
    isNullableString(value.published_at);
}

export type PendingRegistrationRequestRow = {
  registration_id: string;
  action_id: string;
};

export function isPendingRegistrationRequestRow(
  value: unknown,
): value is PendingRegistrationRequestRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.registration_id) &&
    isNonEmptyString(value.action_id);
}

export type PendingPostActionClaimRow = {
  participation_id: string;
  action_id: string;
};

export function isPendingPostActionClaimRow(
  value: unknown,
): value is PendingPostActionClaimRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.participation_id) &&
    isNonEmptyString(value.action_id);
}

export type PendingActionResultPromptRow = {
  notification_id: string;
  action_id: string;
};

export function isPendingActionResultPromptRow(
  value: unknown,
): value is PendingActionResultPromptRow {
  return isActionRecord(value) &&
    isNonEmptyString(value.notification_id) &&
    isNonEmptyString(value.action_id);
}

export type ActionInvitationDecisionRow = {
  status: "accepted" | "rejected" | "unavailable";
  registration_id: string;
  action_id: string | null;
};

export function isActionInvitationDecisionRow(
  value: unknown,
): value is ActionInvitationDecisionRow {
  return isActionRecord(value) &&
    isOneOf(value.status, ["accepted", "rejected", "unavailable"] as const) &&
    isNonEmptyString(value.registration_id) &&
    isNullableString(value.action_id);
}

export type ActionResultPromptDecisionRow = {
  status: "claimed" | "declined" | "unavailable";
  action_id: string;
};

export function isActionResultPromptDecisionRow(
  value: unknown,
): value is ActionResultPromptDecisionRow {
  return isActionRecord(value) &&
    isOneOf(value.status, ["claimed", "declined", "unavailable"] as const) &&
    isNonEmptyString(value.action_id);
}

const REGISTRATION_STATUSES = ["pending", "confirmed", "cancelled"] as const;
const PARTICIPATION_STATUSES = ["pending", "confirmed", "cancelled"] as const;

export type ActionParticipantStateRow = Pick<
  ActionParticipantRow,
  "participation_status" | "participation_source"
>;

export function isActionParticipantStateRow(
  value: unknown,
): value is ActionParticipantStateRow {
  return isActionRecord(value) &&
    isOneOf(value.participation_status, PARTICIPATION_STATUSES) &&
    isNonEmptyString(value.participation_source);
}

export type ActionRegistrationStateRow = Pick<
  ActionRegistrationRow,
  "registration_status" | "registration_source" | "registration_cancellation_reason"
>;

export function isActionRegistrationStateRow(
  value: unknown,
): value is ActionRegistrationStateRow {
  return isActionRecord(value) &&
    isOneOf(value.registration_status, REGISTRATION_STATUSES) &&
    isNonEmptyString(value.registration_source) &&
    (value.registration_cancellation_reason === null ||
      typeof value.registration_cancellation_reason === "string" ||
      value.registration_cancellation_reason === undefined);
}

export type PrivateActionRegistrationRow = {
  registration_status: "pending" | "confirmed" | "cancelled";
};

export function isPrivateActionRegistrationRow(
  value: unknown,
): value is PrivateActionRegistrationRow {
  return isActionRecord(value) &&
    isOneOf(value.registration_status, REGISTRATION_STATUSES);
}
