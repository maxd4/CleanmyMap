import { describe, expect, it } from "vitest";

import { insertAdaptiveReinforcement } from "./quiz-adaptive";

describe("quiz adaptive reinforcements", () => {
  it("moves a same-theme follow-up closer after an error", () => {
    const deck = [
      { id: "a", category: "Plage" },
      { id: "b", category: "Ville" },
      { id: "c", category: "Tri, compost, comportements" },
      { id: "d", category: "Plage" },
      { id: "e", category: "Cas limites" },
    ];

    const nextDeck = insertAdaptiveReinforcement(
      deck,
      0,
      deck[0],
      1,
      (item) => item.category,
    );

    expect(nextDeck.map((item) => item.id)).toEqual(["a", "b", "d", "c", "e"]);
  });

  it("keeps the deck stable when no follow-up can be found", () => {
    const deck = [
      { id: "a", category: "Unique" },
      { id: "b", category: "Other" },
    ];

    const nextDeck = insertAdaptiveReinforcement(
      deck,
      0,
      deck[0],
      2,
      (item) => item.category,
    );

    expect(nextDeck.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
