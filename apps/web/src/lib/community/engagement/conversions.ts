import type { ActionListItem } from "../../actions/types";
import type { CommunityEventItem } from "../http";
import type { EventConversionRow, EventConversionSummary } from "./types";
import { extractEventRefFromAction, percent } from "./shared";

export function computeEventConversions(
  events: CommunityEventItem[],
  actions: ActionListItem[],
): {
  rows: EventConversionRow[];
  summary: EventConversionSummary;
} {
  const linkedByEventId = new Map<string, number>();
  for (const item of actions) {
    const eventId = extractEventRefFromAction(item);
    if (!eventId) {
      continue;
    }
    linkedByEventId.set(eventId, (linkedByEventId.get(eventId) ?? 0) + 1);
  }

  const rows: EventConversionRow[] = events
    .map((event) => {
      const yes = event.rsvpCounts.yes;
      const linkedActions = linkedByEventId.get(event.id) ?? 0;
      const attendance = event.attendanceCount;
      const attendanceBase = attendance ?? yes;
      return {
        eventId: event.id,
        title: event.title,
        eventDate: event.eventDate,
        locationLabel: event.locationLabel,
        capacityTarget: event.capacityTarget,
        rsvpYes: yes,
        rsvpMaybe: event.rsvpCounts.maybe,
        rsvpNo: event.rsvpCounts.no,
        attendanceCount: attendance,
        linkedActions,
        fillRate: percent(yes, event.capacityTarget ?? 0),
        rsvpToAttendanceRate:
          attendance === null ? null : percent(attendance, yes),
        attendanceToActionRate: percent(linkedActions, attendanceBase),
        rsvpToActionRate: percent(linkedActions, yes),
      };
    })
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));

  const rsvpYesTotal = rows.reduce((acc, row) => acc + row.rsvpYes, 0);
  const attendanceTotalKnown = rows.reduce(
    (acc, row) => acc + (row.attendanceCount ?? 0),
    0,
  );
  const linkedActionsTotal = rows.reduce(
    (acc, row) => acc + row.linkedActions,
    0,
  );
  const hasAttendance = rows.some((row) => row.attendanceCount !== null);

  return {
    rows,
    summary: {
      eventsCount: rows.length,
      rsvpYesTotal,
      attendanceTotalKnown,
      linkedActionsTotal,
      rsvpToAttendanceRate: hasAttendance
        ? percent(attendanceTotalKnown, rsvpYesTotal)
        : null,
      attendanceToActionRate: hasAttendance
        ? percent(linkedActionsTotal, attendanceTotalKnown)
        : null,
      rsvpToActionRate: percent(linkedActionsTotal, rsvpYesTotal),
    },
  };
}
