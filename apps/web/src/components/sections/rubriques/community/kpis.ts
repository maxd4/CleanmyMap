import type { EventConversionSummary } from "@/lib/community/engagement";

export type ConversionKpiCard = {
  id: "rsvp_to_attendance" | "attendance_to_action" | "rsvp_to_action";
  title: string;
  value: string;
  subtitle: string;
};

export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${value.toFixed(1)}%`;
}

export function buildConversionKpiCards(
  summary: EventConversionSummary,
): ConversionKpiCard[] {
  return [
    {
      id: "rsvp_to_attendance",
      title: "Conversion RSVP -> presence",
      value: formatPct(summary.rsvpToAttendanceRate),
      subtitle: `${summary.rsvpYesTotal} RSVP oui / ${summary.attendanceTotalKnown} presences connues`,
    },
    {
      id: "attendance_to_action",
      title: "Conversion presence -> action",
      value: formatPct(summary.attendanceToActionRate),
      subtitle: `${summary.linkedActionsTotal} actions liees a des evenements`,
    },
    {
      id: "rsvp_to_action",
      title: "Conversion RSVP -> action",
      value: formatPct(summary.rsvpToActionRate),
      subtitle: `${summary.eventsCount} evenement(s) suivis`,
    },
  ];
}
