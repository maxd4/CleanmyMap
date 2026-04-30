import { getRoleBadge, getProfileBadge } from "@/lib/authz";
import { listPromotionRequests } from "@/lib/admin/promotion-requests-store";
import { listCommunityBugReports } from "@/lib/community/bug-reports-store";
import {
  buildEventInboxItem,
  buildFeedbackInboxItem,
  buildPartnerInboxItem,
  buildPromotionInboxItem,
  type CreatorInboxItem,
} from "@/lib/community/creator-inbox";
import { listPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getClerkService } from "@/lib/services/clerk";

export async function loadCreatorInboxItems(): Promise<CreatorInboxItem[]> {
  const [feedback, promotion, partner, events] = await Promise.all([
    listCommunityBugReports(200).catch(() => []),
    listPromotionRequests(200).catch(() => []),
    listPartnerOnboardingRequests(200).catch(() => []),
    loadCreatorInboxEvents().catch(() => []),
  ]);

  const items = [
    ...feedback.map((item) => buildFeedbackInboxItem(item)),
    ...promotion.map((item) => buildPromotionInboxItem(item)),
    ...partner.map((item) => buildPartnerInboxItem(item)),
    ...events,
  ];

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function loadCreatorInboxEvents(): Promise<CreatorInboxItem[]> {
  const supabase = getSupabaseServerClient();
  const eventsResult = await supabase
    .from("community_events")
    .select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (eventsResult.error || !eventsResult.data || eventsResult.data.length === 0) {
    return [];
  }

  const clerk = await getClerkService();
  const organizerIds = Array.from(
    new Set(
      eventsResult.data
        .map((event) => event.organizer_clerk_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const organizerMap = await clerk.resolveUsers(organizerIds);

  return eventsResult.data.map((event) => {
    const organizer =
      organizerMap.get(event.organizer_clerk_id) ?? {
        userId: null,
        displayName: "Membre",
        roleBadge: getRoleBadge("benevole"),
        profileBadge: getProfileBadge("benevole"),
      };
    return buildEventInboxItem(
      {
        id: event.id,
        created_at: event.created_at,
        organizer_clerk_id: event.organizer_clerk_id,
        title: event.title,
        event_date: event.event_date,
        location_label: event.location_label,
        description: event.description,
      },
      organizer,
    );
  });
}
