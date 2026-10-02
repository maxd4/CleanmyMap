import type { CommunityEventItem } from "@/lib/community/http";

export type ReportRsvpSummary = {
  yes: number;
  maybe: number;
  no: number;
};

export function computeReportRsvpSummary(
  events: readonly CommunityEventItem[],
): { rsvp: ReportRsvpSummary; participationRate: number } {
  const rsvp = events.reduce<ReportRsvpSummary>(
    (acc, event) => {
      acc.yes += event.rsvpCounts.yes;
      acc.maybe += event.rsvpCounts.maybe;
      acc.no += event.rsvpCounts.no;
      return acc;
    },
    { yes: 0, maybe: 0, no: 0 },
  );

  const rsvpTotal = rsvp.yes + rsvp.maybe + rsvp.no;
  return {
    rsvp,
    participationRate: rsvpTotal > 0 ? (rsvp.yes / rsvpTotal) * 100 : 0,
  };
}
