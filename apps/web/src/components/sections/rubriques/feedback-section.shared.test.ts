import { describe, expect, it } from "vitest";
import { resolveFeedbackSectionContext } from "./feedback-section.shared";

describe("feedback section URL context", () => {
  it.each(["bug", "idea", "improvement", "collaboration"] as const)(
    "resolves the server deep-link for %s without browser globals",
    (type) => {
      expect(
        resolveFeedbackSectionContext("/sections/feedback", {
          searchParams: { type },
        }),
      ).toMatchObject({
        pagePath: "/sections/feedback",
        initialType: type,
        supportPrefill: null,
        source: "feedback_section",
      });
    },
  );

  it("uses the legacy anchor when no valid type query parameter exists", () => {
    expect(
      resolveFeedbackSectionContext(undefined, {
        pathname: "/sections/feedback",
        searchParams: { type: "not-a-feedback-type" },
        hash: "#collaboration",
      }).initialType,
    ).toBe("collaboration");
  });

  it("selects Bug for a technical prefill and preserves its source", () => {
    expect(
      resolveFeedbackSectionContext("/sections/feedback", {
        searchParams: {
          subject: "Carte bloquée",
          context: "Mobile",
          steps: "Ouvrir la carte",
          expected: "La carte s'affiche",
          source: "feedback_discussion",
        },
      }),
    ).toEqual({
      pagePath: "/sections/feedback",
      initialType: "bug",
      supportPrefill: {
        subject: "Carte bloquée",
        context: "Mobile",
        steps: "Ouvrir la carte",
        expected: "La carte s'affiche",
      },
      source: "feedback_discussion",
    });
  });

  it("defaults malformed or absent URL state to Idea", () => {
    expect(resolveFeedbackSectionContext().initialType).toBe("idea");
    expect(
      resolveFeedbackSectionContext(undefined, {
        searchParams: { type: "invalid", source: "invalid" },
        hash: "#invalid",
      }).initialType,
    ).toBe("idea");
  });
});
