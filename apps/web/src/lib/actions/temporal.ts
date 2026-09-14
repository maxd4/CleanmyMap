import { normalizeClockTime } from "./time-contract";
import type { ActionRow } from "@/types/database";

const ACTION_TIME_ZONE = "Europe/Paris";

function getParisDateTimeParts(now: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return values;
}

/** Returns the calendar date used by action contracts in Europe/Paris. */
export function getActionParisDate(now = new Date()): string {
  const values = getParisDateTimeParts(now);
  return `${values.year}-${values.month}-${values.day}`;
}

function getParisDateTimeKey(now: Date): string {
  const values = getParisDateTimeParts(now);
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export type ActionPublicFutureCandidate = Pick<
  ActionRow,
  | "action_date"
  | "event_start_time"
  | "action_phase"
  | "status"
  | "published_at"
> & {
  moderation_visibility?: "visible" | "hidden" | null;
};

/** The action start is a local Paris date, with 00:00 as the known fallback. */
export function isActionStartInFuture(
  action: Pick<ActionRow, "action_date" | "event_start_time">,
  now = new Date(),
): boolean {
  const date = action.action_date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const startTime = normalizeClockTime(action.event_start_time) ?? "00:00";
  return `${date}T${startTime}` > getParisDateTimeKey(now);
}

export function isPublishedFuturePreAction(
  action: ActionPublicFutureCandidate,
  now = new Date(),
): boolean {
  return (
    action.action_phase === "pre_action" &&
    (action.status === "pending" || action.status === "approved") &&
    action.moderation_visibility === "visible" &&
    Boolean(action.published_at) &&
    isActionStartInFuture(action, now)
  );
}

/** A public future pre-action is joinable only when its group form is open. */
export function isJoinableFuturePreAction(
  action: ActionPublicFutureCandidate,
  metadata: { groupJoinEnabled: boolean },
  now = new Date(),
): boolean {
  return (
    metadata.groupJoinEnabled === true &&
    isPublishedFuturePreAction(action, now)
  );
}
