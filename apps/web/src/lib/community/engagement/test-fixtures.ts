import type { ActionListItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";

export function makeAction(partial: Partial<ActionListItem>): ActionListItem {
  return {
    id: partial.id ?? "a-1",
    created_at: partial.created_at ?? "2026-04-01T10:00:00.000Z",
    actor_name: partial.actor_name ?? "Alice",
    action_date: partial.action_date ?? "2026-04-01",
    location_label: partial.location_label ?? "Paris 10e",
    latitude: partial.latitude ?? 48.87,
    longitude: partial.longitude ?? 2.36,
    waste_kg: partial.waste_kg ?? 10,
    cigarette_butts: partial.cigarette_butts ?? 100,
    volunteers_count: partial.volunteers_count ?? 3,
    duration_minutes: partial.duration_minutes ?? 60,
    notes: partial.notes ?? null,
    status: partial.status ?? "approved",
    ...partial,
  };
}

export function makeEvent(partial: Partial<CommunityEventItem>): CommunityEventItem {
  return {
    id: partial.id ?? "ev-1",
    createdAt: partial.createdAt ?? "2026-03-20T09:00:00.000Z",
    organizerClerkId: partial.organizerClerkId ?? "org-1",
    title: partial.title ?? "Collecte Test",
    eventDate: partial.eventDate ?? "2026-04-05",
    locationLabel: partial.locationLabel ?? "Paris 10e",
    description: partial.description ?? "Description",
    capacityTarget: partial.capacityTarget ?? 20,
    attendanceCount: partial.attendanceCount ?? 10,
    postMortem: partial.postMortem ?? null,
    rsvpCounts: partial.rsvpCounts ?? { yes: 12, maybe: 3, no: 1, total: 16 },
    myRsvpStatus: partial.myRsvpStatus ?? null,
  };
}
