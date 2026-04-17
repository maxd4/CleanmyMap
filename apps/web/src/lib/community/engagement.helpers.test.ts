import { describe, expect, it } from "vitest";
import type { ActionListItem } from "../actions/types";
import {
  badgeFromQuality,
  extractArea,
  extractEventRefFromAction,
  nextActionFromPartner,
  percent,
} from "./engagement.helpers";

function makeAction(partial: Partial<ActionListItem>): ActionListItem {
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

describe("engagement helpers", () => {
  it("computes percentages safely", () => {
    expect(percent(20, 100)).toBe(20);
    expect(percent(1, 0)).toBeNull();
  });

  it("extracts area labels from arrondissement strings", () => {
    expect(extractArea("Paris 11e")).toBe("11e");
    expect(extractArea("Berges de Seine")).toBe("Hors arrondissement");
  });

  it("extracts event reference from notes fallbacks", () => {
    const action = makeAction({
      notes: null,
      notes_plain: "test [EVENT_REF]event-42",
    });

    expect(extractEventRefFromAction(action)).toBe("event-42");
  });

  it("assigns quality badges and partner next action", () => {
    expect(badgeFromQuality(86, 8, 0.5)).toBe("Ambassadeur qualite");
    expect(nextActionFromPartner("Hors arrondissement", 80)).toContain(
      "Preciser la zone",
    );
  });
});
