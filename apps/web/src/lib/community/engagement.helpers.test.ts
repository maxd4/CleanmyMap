import { describe, expect, it } from "vitest";
import type { ActionListItem } from "../actions/types";
import {
  badgeFromQuality,
  extractArea,
  extractEventRefFromAction,
  nextActionFromPartner,
  percent,
} from "./engagement.helpers";

const ACTION_DEFAULTS: ActionListItem = {
  id: "a-1",
  created_at: "2026-04-01T10:00:00.000Z",
  actor_name: "Alice",
  action_date: "2026-04-01",
  location_label: "Lyon 10e",
  latitude: 48.87,
  longitude: 2.36,
  waste_kg: 10,
  cigarette_butts: 100,
  volunteers_count: 3,
  duration_minutes: 60,
  notes: null,
  status: "approved",
};

function makeAction(partial: Partial<ActionListItem>): ActionListItem {
  return { ...ACTION_DEFAULTS, ...partial };
}

describe("engagement helpers", () => {
  it("computes percentages safely", () => {
    expect(percent(20, 100)).toBe(20);
    expect(percent(1, 0)).toBeNull();
  });

  it("extracts area labels from arrondissement strings", () => {
    expect(extractArea("Lyon 11e")).toBe("11e");
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
