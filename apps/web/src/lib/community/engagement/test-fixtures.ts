import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";

const ACTION_DEFAULTS: ActionListItem = {
  id: "a-1",
  created_at: "2026-04-01T10:00:00.000Z",
  actor_name: "Alice",
  action_date: "2026-04-01",
  location_label: "France",
  latitude: 48.87,
  longitude: 2.36,
  waste_kg: 10,
  cigarette_butts: 100,
  volunteers_count: 3,
  duration_minutes: 60,
  notes: null,
  status: "approved",
};

const EVENT_DEFAULTS: CommunityEventItem = {
  id: "ev-1",
  createdAt: "2026-03-20T09:00:00.000Z",
  organizerClerkId: "org-1",
  title: "Collecte Test",
  eventDate: "2026-04-05",
  locationLabel: "France",
  description: "Description",
  capacityTarget: 20,
  attendanceCount: 10,
  postMortem: null,
  cleanupObjective: null,
  cleanupZone: null,
  cleanupLogisticsNeeds: null,
  cleanupSupportLevel: null,
  cleanupWasteTypesExpected: [],
  rsvpCounts: { yes: 12, maybe: 3, no: 1, total: 16 },
  myRsvpStatus: null,
};

export function makeAction(partial: Partial<ActionListItem>): ActionListItem {
  return { ...ACTION_DEFAULTS, ...partial };
}

export function makeEvent(partial: Partial<CommunityEventItem>): CommunityEventItem {
  return { ...EVENT_DEFAULTS, ...partial };
}
