import { describe, expect, it } from "vitest";
import { buildPartnerCards } from "./partners";
import { makeAction } from "./test-fixtures";

describe("buildPartnerCards (module)", () => {
  it("builds actionable cards with role, zone and next action", () => {
    const cards = buildPartnerCards([
      makeAction({
        id: "a1",
        actor_name: "Association X",
        location_label: "Paris 10e",
      }),
      makeAction({
        id: "a2",
        actor_name: "Association X",
        location_label: "Paris 10e",
      }),
      makeAction({
        id: "a3",
        actor_name: "Collectif Y",
        location_label: "Paris 11e",
      }),
    ]);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.role).toBeTruthy();
    expect(cards[0]?.zone).toBeTruthy();
    expect(cards[0]?.contact).toContain("Canal");
    expect(cards[0]?.capacity).toBeTruthy();
    expect(cards[0]?.nextAction).toBeTruthy();
  });
});
