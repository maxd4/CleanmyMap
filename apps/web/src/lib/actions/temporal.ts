import { normalizeClockTime } from "./time-contract";
import type { ActionRow } from "@/types/database";
import {
  DEFAULT_ACTION_TIME_ZONE,
  normalizeIanaTimeZone,
  parseDateTimeLocalInTimeZone,
} from "@/lib/time/civil-date";

function getDateTimeParts(now: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
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

/** Returns the calendar date used by an action in its validated IANA timezone. */
export function getActionDateInTimeZone(
  now = new Date(),
  timeZone: string = DEFAULT_ACTION_TIME_ZONE,
): string {
  const values = getDateTimeParts(now, normalizeIanaTimeZone(timeZone));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Compatibility name retained for historical callers and French rows. */
export function getActionParisDate(now = new Date()): string {
  return getActionDateInTimeZone(now, DEFAULT_ACTION_TIME_ZONE);
}

/** A completed declaration cannot describe a calendar day that has not happened yet. */
export function isActionDateInFuture(
  actionDate: string | null | undefined,
  now = new Date(),
  timeZone: string = DEFAULT_ACTION_TIME_ZONE,
): boolean {
  const date = actionDate?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date > getActionDateInTimeZone(now, timeZone);
}

export type ActionPublicFutureCandidate = Pick<
  ActionRow,
  | "action_date"
  | "event_start_time"
  | "action_timezone"
  | "event_start_at"
  | "action_phase"
  | "status"
  | "published_at"
> & {
  moderation_visibility?: "visible" | "hidden" | null;
  review_state?: "not_required" | "draft" | "pending_review" | "approved" | "rejected" | null;
};

function isPublicActionReviewState(
  reviewState: ActionPublicFutureCandidate["review_state"],
): boolean {
  return reviewState === undefined || reviewState === null || reviewState === "not_required" || reviewState === "approved";
}

/**
 * Compares the action's persisted instant when available. Legacy rows are
 * interpreted as a local wall-clock in Europe/Paris, preserving their prior contract.
 */
export function isActionStartInFuture(
  action: Pick<ActionRow, "action_date" | "event_start_time"> &
    Partial<Pick<ActionRow, "action_timezone" | "event_start_at">>,
  now = new Date(),
): boolean {
  if (action.event_start_at) {
    const persisted = new Date(action.event_start_at);
    if (Number.isFinite(persisted.getTime())) return persisted.getTime() > now.getTime();
  }
  const date = action.action_date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timeZone = normalizeIanaTimeZone(action.action_timezone);
  const startTime = normalizeClockTime(action.event_start_time) ?? "00:00";
  try {
    return parseDateTimeLocalInTimeZone(`${date}T${startTime}`, timeZone).getTime() > now.getTime();
  } catch {
    return false;
  }
}

export type ActionTemporalInput = {
  actionDate: string;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  actionTimezone?: string | null;
};

/** Resolves local action fields once, for persistence and validation. */
export function resolveActionTemporalInstants(input: ActionTemporalInput): {
  timeZone: string;
  startAt: Date;
  endAt: Date | null;
} {
  const timeZone = normalizeIanaTimeZone(input.actionTimezone);
  const startTime = normalizeClockTime(input.eventStartTime) ?? "00:00";
  const startAt = parseDateTimeLocalInTimeZone(`${input.actionDate}T${startTime}`, timeZone);
  const endTime = normalizeClockTime(input.eventEndTime);
  const endAt = endTime
    ? parseDateTimeLocalInTimeZone(`${input.actionDate}T${endTime}`, timeZone)
    : null;
  if (endAt && endAt.getTime() < startAt.getTime()) {
    throw new RangeError("The action end must not precede its start.");
  }
  return { timeZone, startAt, endAt };
}

export function isPublishedFuturePreAction(
  action: ActionPublicFutureCandidate,
  now = new Date(),
): boolean {
  return (
    action.action_phase === "pre_action" &&
    (action.status === "pending" || action.status === "approved") &&
    action.moderation_visibility === "visible" &&
    isPublicActionReviewState(action.review_state) &&
    Boolean(action.published_at) &&
    isActionStartInFuture(action, now)
  );
}

export function isFutureActionCancellationEligible(
  action: Pick<
    ActionRow,
    | "action_date"
    | "event_start_time"
    | "action_phase"
    | "status"
    | "published_at"
  > & Partial<Pick<ActionRow, "action_timezone" | "event_start_at">>,
  now = new Date(),
): boolean {
  return (
    action.action_phase === "pre_action" &&
    (action.status === "pending" || action.status === "approved") &&
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
