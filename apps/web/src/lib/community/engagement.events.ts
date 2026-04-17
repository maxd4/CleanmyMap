import type { ActionListItem } from "../actions/types";
import type { CommunityEventItem } from "./http";
import {
  extractEventRefFromAction,
  parseEventDateMs,
  percent,
} from "./engagement.helpers";
import type {
  EventConversionRow,
  EventConversionSummary,
  EventReminder,
  EventStaffingRow,
  EventStaffingSummary,
} from "./engagement.types";

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

export function computeEventRelances(
  events: CommunityEventItem[],
  now: Date = new Date(),
): EventReminder[] {
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const reminders: EventReminder[] = [];

  for (const event of events) {
    const eventMs = parseEventDateMs(event.eventDate);
    if (eventMs === null) {
      continue;
    }
    const daysToEvent = Math.floor((eventMs - nowMs) / dayMs);
    if (daysToEvent < 0 || daysToEvent > 14) {
      continue;
    }

    const yes = event.rsvpCounts.yes;
    const maybe = event.rsvpCounts.maybe;
    const fill = percent(yes, event.capacityTarget ?? 0);
    let priority: EventReminder["priority"] = "faible";
    let reason = "Maintenir le rythme de mobilisation.";

    if (daysToEvent <= 2 && (fill === null ? yes < 8 : fill < 85)) {
      priority = "haute";
      reason = "Evenement imminent avec remplissage insuffisant.";
    } else if (daysToEvent <= 5 && (fill === null ? yes < 10 : fill < 65)) {
      priority = "moyenne";
      reason = "Mobilisation a renforcer cette semaine.";
    } else if (daysToEvent <= 10 && maybe > yes) {
      priority = "moyenne";
      reason = "Beaucoup d'indecis: relance de confirmation necessaire.";
    } else if (fill !== null && fill < 80) {
      priority = "faible";
      reason = "Capacite non atteinte, relance preventive utile.";
    } else {
      continue;
    }

    const message =
      `Relance ${priority.toUpperCase()} - ${event.title} (${event.eventDate}) a ${event.locationLabel}. ` +
      `RSVP oui: ${yes}, maybe: ${maybe}${fill === null ? "" : `, remplissage: ${fill}%`}. ` +
      "Merci de confirmer votre presence et de partager a votre equipe.";

    reminders.push({
      eventId: event.id,
      priority,
      daysToEvent,
      reason,
      message,
    });
  }

  const priorityRank: Record<EventReminder["priority"], number> = {
    haute: 3,
    moyenne: 2,
    faible: 1,
  };
  return reminders.sort(
    (a, b) =>
      priorityRank[b.priority] - priorityRank[a.priority] ||
      a.daysToEvent - b.daysToEvent,
  );
}

export function computeEventStaffingPlan(
  events: CommunityEventItem[],
  now: Date = new Date(),
): {
  rows: EventStaffingRow[];
  summary: EventStaffingSummary;
} {
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const rows = events
    .map((event) => {
      const eventMs = parseEventDateMs(event.eventDate);
      if (eventMs === null) {
        return null;
      }
      const daysToEvent = Math.floor((eventMs - nowMs) / dayMs);
      if (daysToEvent < 0 || daysToEvent > 45) {
        return null;
      }

      const yes = event.rsvpCounts.yes;
      const maybe = event.rsvpCounts.maybe;
      const expectedParticipants = Math.max(2, Math.round(yes + maybe * 0.4));
      const recommendedStaff = Math.max(2, Math.ceil(expectedParticipants / 6));
      const confirmedStaff = Math.max(0, Math.ceil(yes / 7));
      const staffingGap = Math.max(0, recommendedStaff - confirmedStaff);
      const fill = percent(yes, event.capacityTarget ?? 0);

      let riskLevel: EventStaffingRow["riskLevel"] = "vert";
      let priority: EventStaffingRow["priority"] = "faible";
      let reason =
        "Dimensionnement staffing coherent avec la mobilisation actuelle.";

      if (
        (daysToEvent <= 3 && staffingGap > 0) ||
        (fill !== null && fill < 45 && daysToEvent <= 5)
      ) {
        riskLevel = "rouge";
        priority = "haute";
        reason =
          "Evenement proche: renforcer les referents et relancer les confirmations.";
      } else if (staffingGap >= 2 || (fill !== null && fill < 65)) {
        riskLevel = "orange";
        priority = "moyenne";
        reason = "Mobilisation insuffisante pour absorber le volume cible.";
      }

      return {
        eventId: event.id,
        title: event.title,
        eventDate: event.eventDate,
        locationLabel: event.locationLabel,
        priority,
        expectedParticipants,
        recommendedStaff,
        confirmedStaff,
        staffingGap,
        riskLevel,
        reason,
      };
    })
    .filter((row): row is EventStaffingRow => row !== null)
    .sort((a, b) => {
      const priorityRank = { haute: 3, moyenne: 2, faible: 1 };
      return (
        priorityRank[b.priority] - priorityRank[a.priority] ||
        a.eventDate.localeCompare(b.eventDate)
      );
    });

  const summary = {
    eventsCount: rows.length,
    atRiskCount: rows.filter((row) => row.riskLevel !== "vert").length,
    totalRecommendedStaff: rows.reduce(
      (acc, row) => acc + row.recommendedStaff,
      0,
    ),
    totalConfirmedStaff: rows.reduce((acc, row) => acc + row.confirmedStaff, 0),
    totalStaffingGap: rows.reduce((acc, row) => acc + row.staffingGap, 0),
  };

  return { rows, summary };
}
