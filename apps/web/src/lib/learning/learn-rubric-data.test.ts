import { describe, expect, it } from "vitest";

import { LEARN_PROGRESS_ORDER } from "./learn-progress";
import { LEARN_OVERVIEW_CARDS, LEARN_PRACTICE_LINKS } from "./learn-rubric-data";

const EXPECTED_OVERVIEW_ROUTES = [
  "/learn/comprendre",
  "/learn/sentrainer",
  "/learn/bonnes-pratiques",
];

const EXPECTED_PRACTICE_ROUTES = [
  "/sections/recycling",
  "/sections/compost",
  "/actions/new",
  "/actions/map",
  "/sections/trash-spotter",
];

describe("learn rubric inventory", () => {
  it("keeps the expected progression order", () => {
    expect(LEARN_PROGRESS_ORDER).toEqual([
      "comprendre",
      "sentrainer",
      "bonnes-pratiques",
    ]);
  });

  it("keeps the learn overview cards ordered and aligned across locales", () => {
    expect(LEARN_OVERVIEW_CARDS.fr.map((card) => card.href)).toEqual(EXPECTED_OVERVIEW_ROUTES);
    expect(LEARN_OVERVIEW_CARDS.en.map((card) => card.href)).toEqual(EXPECTED_OVERVIEW_ROUTES);

    EXPECTED_OVERVIEW_ROUTES.forEach((href, index) => {
      const frCard = LEARN_OVERVIEW_CARDS.fr[index];
      const enCard = LEARN_OVERVIEW_CARDS.en[index];

      expect(frCard.href).toBe(href);
      expect(enCard.href).toBe(href);
      expect(frCard.title).not.toHaveLength(0);
      expect(enCard.title).not.toHaveLength(0);
      expect(frCard.detail).not.toHaveLength(0);
      expect(enCard.detail).not.toHaveLength(0);
      expect(frCard.visual.badge.fr).not.toHaveLength(0);
      expect(enCard.visual.badge.en).not.toHaveLength(0);
      expect(frCard.visual.chips.length).toBeGreaterThan(0);
      expect(enCard.visual.chips.length).toBeGreaterThan(0);
    });
  });

  it("keeps the practice cards aligned with the learn shortcuts", () => {
    expect(LEARN_PRACTICE_LINKS.fr.map((card) => card.href)).toEqual(EXPECTED_PRACTICE_ROUTES);
    expect(LEARN_PRACTICE_LINKS.en.map((card) => card.href)).toEqual(EXPECTED_PRACTICE_ROUTES);

    EXPECTED_PRACTICE_ROUTES.forEach((href, index) => {
      expect(LEARN_PRACTICE_LINKS.fr[index].href).toBe(href);
      expect(LEARN_PRACTICE_LINKS.en[index].href).toBe(href);
    });
  });
});
