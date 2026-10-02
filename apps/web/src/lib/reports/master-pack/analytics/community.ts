import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";
import { computeCommunityEngagementMetrics } from "@/lib/reports/report-model/metrics";
import { computeReportRsvpSummary } from "@/lib/reports/report-model/community";

export function computeCommunityMetrics(actions: ActionListItem[], events: CommunityEventItem[]) {
  const { rsvp, participationRate } = computeReportRsvpSummary(events);

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
