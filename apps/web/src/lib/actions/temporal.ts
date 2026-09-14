import { normalizeClockTime } from "./time-contract";
import type { ActionRow } from "@/types/database";

const ACTION_TIME_ZONE = "Europe/Paris";

function getParisDateTimeKey(now: Date): string {
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
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

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
  action: Pick<
    ActionRow,
    | "action_date"
    | "event_start_time"
    | "action_phase"
    | "status"
    | "moderation_visibility"
    | "published_at"
  >,
  now = new Date(),
): boolean {
  return (
    action.action_phase === "pre_action" &&
    (action.status === "pending" || action.status === "approved") &&
    action.moderation_visibility !== "hidden" &&
    Boolean(action.published_at) &&
    isActionStartInFuture(action, now)
  );
}
