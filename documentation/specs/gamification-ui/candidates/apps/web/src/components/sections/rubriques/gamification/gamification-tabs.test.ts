import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GamificationSummary } from "@/lib/gamification/progression/gamification-summary";
import { GamificationTabs, tabForGamificationTarget } from "./gamification-tabs";

const summary = {
  progressions: [{ id: "participation", state: "in_progress" }, { id: "exploration", state: "not_started" }],
  milestones: [{ id: "parcours_documente", state: "completed" }, { id: "boucle_bouclee", state: "in_progress" }, { id: "mobilisateur", state: "not_started" }],
} as GamificationSummary;

describe("Gamification navigation", () => {
  it("routes receipt links to their actual applicable catalog item", () => {
    expect(tabForGamificationTarget("progression-participation", summary)).toBe("active");
    expect(tabForGamificationTarget("progression-exploration", summary)).toBe("discover");
    expect(tabForGamificationTarget("milestone-parcours_documente", summary)).toBe("acquired");
    expect(tabForGamificationTarget("milestone-boucle_bouclee", summary)).toBe("active");
    expect(tabForGamificationTarget("milestone-mobilisateur", summary)).toBe("discover");
    expect(tabForGamificationTarget("progression-moderation", summary)).toBeNull();
    expect(tabForGamificationTarget("gamification-reconciliation-history", summary)).toBe("acquired");
    expect(tabForGamificationTarget("spogomi-collection", summary)).toBe("badges");
  });
  it("renders five accessible tabs and mounts only the acquired panel initially", () => {
    const markup = renderToStaticMarkup(createElement(GamificationTabs, { locale: "fr", summary, receiptId: null, renderPanel: (tab) => createElement("p", null, "body:" + tab) }));
    expect((markup.match(/role="tab"/g) ?? []).length).toBe(5);
    expect((markup.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect(markup).toContain("body:acquired");
    expect(markup).not.toContain("body:community");
    expect(markup).not.toContain("body:badges");
  });
});
