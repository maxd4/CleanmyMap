import { toFrInt, toFrNumber } from "@/components/reports/web-document/analytics";
import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";

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

  const leaderboard = actions
    .reduce((map, item) => {
      const actor = item.actor_name?.trim() || "Anonyme";
      const previous = map.get(actor) ?? { actions: 0, kg: 0, butts: 0 };
      map.set(actor, {
        actions: previous.actions + 1,
        kg: previous.kg + Number(item.waste_kg || 0),
        butts: previous.butts + Number(item.cigarette_butts || 0),
      });
      return map;
    }, new Map<string, { actions: number; kg: number; butts: number }>())
    .entries();

  const topLeaderboard = [...leaderboard]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.actions - a.actions || b.kg - a.kg)
    .slice(0, 10);

  const sourceBuckets = actions.reduce(
    (acc, item) => {
      const source = (item.source ?? item.contract?.source ?? "web_form").toLowerCase();
      if (source.includes("community")) acc.associatif += 1;
      else if (source.includes("admin") || source.includes("import")) acc.institutionnel += 1;
      else acc.citoyen += 1;
      return acc;
    },
    { citoyen: 0, associatif: 0, institutionnel: 0 },
  );

  return {
    engagement: {
      totalEvents: events.length,
      rsvp,
      participationRate,
    },
    recognition: {
      topLeaderboard,
      badgeConfirmed: topLeaderboard.filter((entry) => entry.actions >= 5).length,
      badgeExpert: topLeaderboard.filter((entry) => entry.actions >= 10).length,
    },
    distribution: {
      sourceBuckets,
    }
  };
}
