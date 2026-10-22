export type CommunityEventJourneyTab = "future" | "past";

export function buildCommunityEventHref(
  eventId: string,
  tab: CommunityEventJourneyTab,
): string {
  return `/sections/rejoindre-une-action?tab=${tab}&communityEventId=${encodeURIComponent(eventId)}`;
}
