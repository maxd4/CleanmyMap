export type CommunityEventJourneyTab = "future" | "past";

export function buildCommunityEventHref(
  eventId: string,
  tab: CommunityEventJourneyTab,
): string {
  return `/sections/rejoindre-une-action?tab=${tab}&communityEventId=${encodeURIComponent(eventId)}`;
}

export function migrateLegacyCommunityEventHref(href: string): string | null {
  try {
    const url = new URL(href, "https://cleanmymap.invalid");
    if (
      url.origin !== "https://cleanmymap.invalid" ||
      !["/community", "/sections/community"].includes(url.pathname)
    ) {
      return null;
    }

    const eventId = url.searchParams.get("eventId")?.trim();
    if (!eventId) return null;

    return buildCommunityEventHref(
      eventId,
      url.searchParams.get("tab") === "past" ? "past" : "future",
    );
  } catch {
    return null;
  }
}
