import type { ActionPhase } from "@/lib/actions/types";

export const ACTION_DISCUSSION_PUSH_PREFERENCES = [
  "off",
  "important_only",
  "all",
] as const;

export type ActionDiscussionPushPreference =
  (typeof ACTION_DISCUSSION_PUSH_PREFERENCES)[number];

export const DEFAULT_ACTION_DISCUSSION_PUSH_PREFERENCE: ActionDiscussionPushPreference =
  "off";

export const ACTION_DISCUSSION_MESSAGE_IMPORTANCES = ["normal", "important"] as const;
export type ActionDiscussionMessageImportance =
  (typeof ACTION_DISCUSSION_MESSAGE_IMPORTANCES)[number];

export type ActionDiscussionNotificationEvent = {
  domain: "action_discussion";
  recipientUserId: string;
  actionId: string;
  commentId: string;
  actionPhase: ActionPhase;
  importance: ActionDiscussionMessageImportance;
};

export type NotificationDeliveryChannel = "in_app" | "mobile_push";

export type ActionDiscussionDeliveryDecision = {
  inApp: true;
  mobilePush: boolean;
};

export const ACTION_DISCUSSION_PUSH_METADATA_KEY = "actionDiscussionPush";
export const NOTIFICATION_PREFERENCES_METADATA_KEY = "notificationPreferences";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeActionDiscussionPushPreference(
  value: unknown,
): ActionDiscussionPushPreference {
  return value === "important_only" || value === "all" || value === "off"
    ? value
    : DEFAULT_ACTION_DISCUSSION_PUSH_PREFERENCE;
}

export function normalizeActionDiscussionMessageImportance(
  value: unknown,
): ActionDiscussionMessageImportance {
  return value === "important" ? "important" : "normal";
}

/** Missing or malformed values fail closed to no mobile push. */
export function readActionDiscussionPushPreference(
  metadata: unknown,
): ActionDiscussionPushPreference {
  const root = asRecord(metadata);
  const preferences = asRecord(root?.[NOTIFICATION_PREFERENCES_METADATA_KEY]);
  return normalizeActionDiscussionPushPreference(
    preferences?.[ACTION_DISCUSSION_PUSH_METADATA_KEY] ??
      root?.[ACTION_DISCUSSION_PUSH_METADATA_KEY],
  );
}

/** Preserves unrelated metadata for a future authenticated preference writer. */
export function writeActionDiscussionPushPreference(
  metadata: Record<string, unknown> | null | undefined,
  preference: unknown,
): Record<string, unknown> {
  const root = { ...(metadata ?? {}) };
  const existingPreferences = asRecord(root[NOTIFICATION_PREFERENCES_METADATA_KEY]);
  root[NOTIFICATION_PREFERENCES_METADATA_KEY] = {
    ...(existingPreferences ?? {}),
    [ACTION_DISCUSSION_PUSH_METADATA_KEY]: normalizeActionDiscussionPushPreference(preference),
  };
  return root;
}

/** A future mobile adapter consumes this decision; it does not create another event. */
export function decideActionDiscussionDelivery(
  preference: unknown,
  importance: unknown,
): ActionDiscussionDeliveryDecision {
  const normalizedPreference = normalizeActionDiscussionPushPreference(preference);
  const normalizedImportance = normalizeActionDiscussionMessageImportance(importance);

  return {
    inApp: true,
    mobilePush:
      normalizedPreference === "all" ||
      (normalizedPreference === "important_only" && normalizedImportance === "important"),
  };
}
