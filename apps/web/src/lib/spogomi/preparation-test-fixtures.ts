import type { EventRow } from "./preparation-service";

export function spogomiPreparationEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "event-1",
    action_id: "action-1",
    created_by_clerk_id: "organizer-1",
    name: "SPOGOMI synthétique",
    location_label: "Cachan",
    mode: "casual",
    state: "registration_open",
    starts_at: "2026-10-20T09:00:00.000Z",
    ends_at: null,
    official_timezone: "Europe/Paris",
    team_size_config: { casual: { minMembers: 2, maxMembers: 4 } },
    creation_state: "ready",
    event_slug: "spogomi-synthetic",
    public_visibility: "private",
    public_results_visibility: "hidden",
    composition_revision: 7,
    ...overrides,
  };
}
