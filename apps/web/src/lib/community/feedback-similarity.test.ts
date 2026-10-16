import { describe, expect, it } from "vitest";
import { findPotentiallySimilarFeedback } from "./feedback-similarity";

describe("findPotentiallySimilarFeedback", () => {
  it("returns bounded suggestions without rejecting the query", () => {
    const result = findPotentiallySimilarFeedback(
      { id: "new", title: "Carte des déchets", text: "La carte des déchets ne se charge pas" },
      [
        { id: "same", title: "Carte déchets", text: "La carte des déchets reste vide" },
        { id: "different", title: "Compte", text: "Modifier mon profil" },
      ],
    );

    expect(result.map((item) => item.id)).toEqual(["same"]);
    expect(result[0].score).toBeGreaterThanOrEqual(0.4);
  });

  it("does not expose a match for an underspecified query", () => {
    expect(
      findPotentiallySimilarFeedback(
        { id: "new", title: "Bug", text: "" },
        [{ id: "old", title: "Bug", text: "Carte" }],
      ),
    ).toEqual([]);
  });
});
