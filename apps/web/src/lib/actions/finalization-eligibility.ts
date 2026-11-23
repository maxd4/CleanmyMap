import type { ActionRow } from "@/types/database";
import { formatCivilDateInTimeZone, isCivilDate, normalizeIanaTimeZone } from "@/lib/time/civil-date";

export type FinalizationAction = Pick<
  ActionRow,
  "action_date" | "action_phase" | "status" | "event_end_at" | "action_timezone"
>;

export type ActionFinalizationDeadline = Pick<FinalizationAction, "action_date" | "event_end_at" | "action_timezone">;

export function hasActionEventEnded(action: ActionFinalizationDeadline, now = new Date()): boolean {
  if (action.event_end_at) {
    const eventEnd = new Date(action.event_end_at);
    return Number.isFinite(eventEnd.getTime()) && eventEnd.getTime() <= now.getTime();
  }

  if (!isCivilDate(action.action_date)) return false;
  const timeZone = normalizeIanaTimeZone(action.action_timezone);
  return action.action_date < formatCivilDateInTimeZone(now, timeZone);
}

/** A report can be started only after the event has ended (or its local date has passed). */
export function isActionFinalizationEligible(action: FinalizationAction, now = new Date()): boolean {
  if (action.status === "cancelled" || action.status === "rejected" || action.action_phase === "post_action_complete") {
    return false;
  }

  return hasActionEventEnded(action, now);
}
