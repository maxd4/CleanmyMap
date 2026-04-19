import type { CommunityEventItem } from "../http";
import type { EventStaffingRow, EventStaffingSummary } from "./types";
import { parseEventDateMs, percent } from "./shared";

export function computeEventStaffingPlan(
  events: CommunityEventItem[],
  now: Date = new Date(),
): {
  rows: EventStaffingRow[];
  summary: EventStaffingSummary;
} {
  const nowMs = now.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const rows = events
    .map((event) => {
      const eventMs = parseEventDateMs(event.eventDate);
      if (eventMs === null) {
        return null;
      }
      const daysToEvent = Math.floor((eventMs - nowMs) / DAY_MS);
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
