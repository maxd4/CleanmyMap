import type { CommunityEventItem } from "../http";
import type { EventStaffingRow, EventStaffingSummary } from "./types";
import { parseEventDateMs, percent } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

function buildStaffingAssessment(
  daysToEvent: number,
  staffingGap: number,
  fill: number | null,
): {
  riskLevel: EventStaffingRow["riskLevel"];
  priority: EventStaffingRow["priority"];
  reason: string;
} {
  if (
    (daysToEvent <= 3 && staffingGap > 0) ||
    (fill !== null && fill < 45 && daysToEvent <= 5)
  ) {
    return {
      riskLevel: "rouge",
      priority: "haute",
      reason:
        "Evenement proche: renforcer les referents et relancer les confirmations.",
    };
  }

  if (staffingGap >= 2 || (fill !== null && fill < 65)) {
    return {
      riskLevel: "orange",
      priority: "moyenne",
      reason: "Mobilisation insuffisante pour absorber le volume cible.",
    };
  }

  return {
    riskLevel: "vert",
    priority: "faible",
    reason: "Dimensionnement staffing coherent avec la mobilisation actuelle.",
  };
}

function buildEventStaffingRow(
  event: CommunityEventItem,
  nowMs: number,
): EventStaffingRow | null {
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
  const assessment = buildStaffingAssessment(daysToEvent, staffingGap, fill);

  return {
    eventId: event.id,
    title: event.title,
    eventDate: event.eventDate,
    locationLabel: event.locationLabel,
    priority: assessment.priority,
    expectedParticipants,
    recommendedStaff,
    confirmedStaff,
    staffingGap,
    riskLevel: assessment.riskLevel,
    reason: assessment.reason,
  };
}

export function computeEventStaffingPlan(
  events: CommunityEventItem[],
  now: Date = new Date(),
): {
  rows: EventStaffingRow[];
  summary: EventStaffingSummary;
} {
  const nowMs = now.getTime();

  const rows = events
    .map((event) => buildEventStaffingRow(event, nowMs))
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
