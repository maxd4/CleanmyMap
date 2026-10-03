import type { CommunityEventRsvpSummary } from "./event-rsvp-summaries";
import { parseCommunityEventDescription } from "./event-ops";
import type { CommunityEventLocationSource } from "./event-location";
import type { CommunityEventItem, CommunityRsvpStatus } from "./http";

export type CommunityEventProjectionRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string | null;
  title: string;
  event_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  location_source: CommunityEventLocationSource | null;
  description: string | null;
};

export type CommunityEventOrganizer = NonNullable<CommunityEventItem["organizer"]>;

export type CommunityEventProjectionOptions = {
  canEditOwnOps: boolean;
  organizer?: CommunityEventOrganizer;
  organizerClerkId?: string | null;
  myRsvpStatus?: CommunityRsvpStatus | null;
};

export function toCommunityEventItem(
  event: CommunityEventProjectionRow,
  summary: CommunityEventRsvpSummary | null,
  options: CommunityEventProjectionOptions,
): CommunityEventItem {
  const parsedDescription = parseCommunityEventDescription(event.description);
  const {
    canEditOwnOps,
    organizer,
    organizerClerkId = event.organizer_clerk_id,
    myRsvpStatus = summary?.myRsvpStatus ?? null,
  } = options;
  const ops = parsedDescription.ops;

  return {
    id: event.id,
    createdAt: event.created_at,
    organizerClerkId,
    canEditOwnOps,
    title: event.title,
    eventDate: event.event_date,
    locationLabel: event.location_label,
    location: {
      label: event.location_label,
      latitude: event.latitude,
      longitude: event.longitude,
      source: event.location_source,
    },
    description: parsedDescription.plainDescription,
    capacityTarget: ops.capacityTarget,
    attendanceCount: ops.attendanceCount,
    postMortem: ops.postMortem,
    cleanupObjective: ops.cleanupObjective,
    cleanupZone: ops.cleanupZone,
    cleanupLogisticsNeeds: ops.cleanupLogisticsNeeds,
    cleanupSupportLevel: ops.cleanupSupportLevel,
    cleanupWasteTypesExpected: ops.cleanupWasteTypesExpected,
    rsvpCounts: {
      yes: summary?.yesCount ?? 0,
      maybe: summary?.maybeCount ?? 0,
      no: summary?.noCount ?? 0,
      total: summary?.totalCount ?? 0,
    },
    myRsvpStatus,
    ...(organizer ? { organizer } : {}),
  };
}
