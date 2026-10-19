import { toActionListItem, type ActionDataContract } from "@/lib/actions/data-contract";
import {
  computeEventConversions,
  computeEventRelances,
  computeEventStaffingPlan,
  type EventReminder,
  type EventStaffingSummary,
} from "@/lib/community/engagement";
import { extractEventRefFromAction } from "@/lib/community/engagement/shared";
import type { CommunityEventItem } from "@/lib/community/http";
import { loadCachedPilotageCommunityEvents } from "@/lib/community/report-events";

type PilotagePostEventLoopRow = {
  event: CommunityEventItem;
  closed: boolean;
  hasAttendance: boolean;
  hasPostMortem: boolean;
  hasLinkedAction: boolean;
  hasWasteCharacterization: boolean;
};

export type PilotageCommunityOperations = {
  availability: "available" | "partial";
  staffingPlan: {
    rows: ReturnType<typeof computeEventStaffingPlan>["rows"];
    summary: EventStaffingSummary;
  };
  reminders: EventReminder[];
  postEventLoop: {
    rows: PilotagePostEventLoopRow[];
    closedCount: number;
    total: number;
    completionRate: number | null;
    missing: PilotagePostEventLoopRow[];
  };
};

export type PilotageCommunityOperationsState =
  | "NOT_REQUESTED"
  | "AVAILABLE"
  | "PARTIAL"
  | "UNAVAILABLE";

function hasWasteCharacterization(action: ReturnType<typeof toActionListItem>): boolean {
  return Boolean(
    action.waste_breakdown && Object.keys(action.waste_breakdown).length > 0,
  );
}

export async function loadPilotageCommunityOperations(
  contracts: ActionDataContract[],
  userId: string,
  now = new Date(),
): Promise<PilotageCommunityOperations> {
  const normalizedUserId = userId.trim();
  const actions = contracts.map((contract) => toActionListItem(contract));
  const linkedEventIds = new Set(
    actions
      .map((action) => extractEventRefFromAction(action))
      .filter((eventId): eventId is string => Boolean(eventId)),
  );
  const eventResult = await loadCachedPilotageCommunityEvents(
    normalizedUserId,
    [...linkedEventIds],
    120,
  );
  const events = eventResult.items;
  const conversion = computeEventConversions(events, actions);
  const upcomingEvents = events.filter((event) => event.eventDate >= now.toISOString().slice(0, 10));
  const staffingPlan = computeEventStaffingPlan(upcomingEvents, now);
  const reminders = computeEventRelances(upcomingEvents, now);

  const rows = events
    .filter((event) => event.eventDate < now.toISOString().slice(0, 10))
    .map((event) => {
      const conversionRow = conversion.rows.find((row) => row.eventId === event.id);
      const linkedActions = actions.filter(
        (action) => extractEventRefFromAction(action) === event.id,
      );
      const row: PilotagePostEventLoopRow = {
        event,
        closed:
          event.attendanceCount !== null &&
          Boolean(event.postMortem?.trim()) &&
          linkedActions.length > 0 &&
          linkedActions.some(hasWasteCharacterization),
        hasAttendance: event.attendanceCount !== null,
        hasPostMortem: Boolean(event.postMortem?.trim()),
        hasLinkedAction: (conversionRow?.linkedActions ?? 0) > 0 && linkedEventIds.has(event.id),
        hasWasteCharacterization: linkedActions.some(hasWasteCharacterization),
      };
      return row;
    });

  const closedCount = rows.filter((row) => row.closed).length;
  return {
    availability: eventResult.availability === "partial" ? "partial" : "available",
    staffingPlan,
    reminders,
    postEventLoop: {
      rows,
      closedCount,
      total: rows.length,
      completionRate:
        eventResult.availability === "partial"
          ? null
          : rows.length === 0
            ? 100
            : (closedCount / rows.length) * 100,
      missing: rows.filter((row) => !row.closed),
    },
  };
}
