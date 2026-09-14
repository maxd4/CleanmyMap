import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import { isPastPublicAction, resolveJoinActionTab, sortPastActions } from "./rejoindre-une-action.model";

function makeItem(overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id: "action",
    created_at: "2026-09-01T10:00:00.000Z",
    actor_name: "Alex",
    action_date: "2026-09-13",
    location_label: "Quai de Seine",
    latitude: null,
    longitude: null,
    waste_kg: 3,
    cigarette_butts: 12,
    volunteers_count: 4,
    duration_minutes: 60,
    notes: null,
    status: "approved",
    record_type: "action",
    contract: {
      id: "action",
      type: "action",
      status: "approved",
      source: "actions",
      location: { label: "Quai de Seine", latitude: null, longitude: null },
      geometry: { kind: "point", coordinates: [], geojson: null, confidence: null, geometrySource: "fallback_point", origin: "fallback_point" },
      dates: { observedAt: "2026-09-13", createdAt: null, importedAt: null, validatedAt: null, eventStartTime: null, eventEndTime: null },
      metadata: { actorName: "Alex", groupJoinEnabled: false, actionPhase: "post_action_complete", notes: null, notesPlain: null, wasteKg: 3, cigaretteButts: 12, volunteersCount: 4, durationMinutes: 60, manualDrawing: null },
    },
    ...overrides,
  };
}

describe("join action model", () => {
  it("defaults to future and accepts only the past tab", () => {
    expect(resolveJoinActionTab(null)).toBe("future");
    expect(resolveJoinActionTab("past")).toBe("past");
    expect(resolveJoinActionTab("future")).toBe("future");
  });

  it("requires a completed public action and derives past from time", () => {
    const now = new Date("2026-09-14T12:00:00+02:00");
    expect(isPastPublicAction(makeItem(), now)).toBe(true);
    expect(isPastPublicAction(makeItem({ status: "pending" }), now)).toBe(false);
    expect(
      isPastPublicAction(
        makeItem({ action_date: "2099-09-13", contract: { ...makeItem().contract!, dates: { ...makeItem().contract!.dates, observedAt: "2099-09-13" } } }),
        now,
      ),
    ).toBe(false);
  });

  it("sorts the most recent completed action first", () => {
    expect(sortPastActions([
      makeItem({ id: "old", action_date: "2026-08-01" }),
      makeItem({ id: "new", action_date: "2026-09-13" }),
    ]).map((item) => item.id)).toEqual(["new", "old"]);
  });
});
