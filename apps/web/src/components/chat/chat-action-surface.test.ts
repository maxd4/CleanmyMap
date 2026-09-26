import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import { getChatActionDisplayState } from "./chat-action-surface";

function action(overrides: Partial<ActionListItem>): ActionListItem {
  return {
    id: "action-1",
    created_at: "2026-09-26T08:00:00.000Z",
    actor_name: null,
    action_date: "2026-09-26",
    location_label: "Paris",
    latitude: null,
    longitude: null,
    waste_kg: null,
    cigarette_butts: null,
    volunteers_count: 1,
    duration_minutes: 60,
    notes: null,
    status: "approved",
    contract: {
      id: "contract-1",
      type: "action",
      status: "approved",
      source: "test",
      location: { label: "Paris", latitude: null, longitude: null },
      geometry: { kind: "point", coordinates: [], geojson: null, confidence: null, geometrySource: "manual", origin: "manual" },
      dates: { observedAt: "2026-09-26", createdAt: null, importedAt: null, validatedAt: null, eventStartTime: "10:00", eventEndTime: "11:00" },
      metadata: { actorName: null, notes: null, notesPlain: null, groupJoinEnabled: null, wasteKg: null, cigaretteButts: null, volunteersCount: 1, durationMinutes: 60 },
    },
    ...overrides,
  } as ActionListItem;
}

describe("ChatActionSurface action ordering", () => {
  it("distinguishes upcoming, ongoing and past actions", () => {
    const now = new Date("2026-09-26T08:30:00.000Z");

    expect(getChatActionDisplayState(action({ action_date: "2026-09-27" }), now)).toBe("upcoming");
    expect(getChatActionDisplayState(action({ action_date: "2026-09-26" }), now)).toBe("ongoing");
    expect(getChatActionDisplayState(action({ action_date: "2026-09-25" }), now)).toBe("past");
  });
});
