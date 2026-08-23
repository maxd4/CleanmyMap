import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";
import { computeCommunityEngagementMetrics } from "@/lib/reports/report-model";

export function computeCommunityMetrics(actions: ActionListItem[], events: CommunityEventItem[]) {
  const rsvp = events.reduce(
    (acc, event) => {
      acc.yes += event.rsvpCounts.yes;
      acc.maybe += event.rsvpCounts.maybe;
      acc.no += event.rsvpCounts.no;
      return acc;
    },
    { yes: 0, maybe: 0, no: 0 },
  );

  const rsvpTotal = rsvp.yes + rsvp.maybe + rsvp.no;
  const participationRate = rsvpTotal > 0 ? (rsvp.yes / rsvpTotal) * 100 : 0;

  const engagement = computeCommunityEngagementMetrics({
    leaderboardItems: actions,
    sourceItems: actions,
    leaderboardLimit: 10,
  });

  return {
    engagement: {
      totalEvents: events.length,
      rsvp,
      participationRate,
    },
    recognition: {
      topLeaderboard: engagement.topLeaderboard,
      badgeConfirmed: engagement.badgeConfirmed,
      badgeExpert: engagement.badgeExpert,
    },
    distribution: {
      sourceBuckets: engagement.sourceBuckets,
    }
  };
}
