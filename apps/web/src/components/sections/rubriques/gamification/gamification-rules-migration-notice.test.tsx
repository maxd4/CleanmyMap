import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { GamificationRulesMigrationNotice } from "./gamification-rules-migration-notice";

const summary = {
  rulesMigration: { hasUnacknowledgedChanges: true, currentAppliedRulesRevision: 13 },
  progressions: [{ isNewSinceLastRulesMigration: true }],
  milestones: [{ isNewSinceLastRulesMigration: true }],
} as unknown as GamificationSummary;

describe("GamificationRulesMigrationNotice", () => {
  it("keeps acknowledgement explicit and separate from catalogue navigation", () => {
    const markup = renderToStaticMarkup(
      <GamificationRulesMigrationNotice summary={summary} locale="fr" onAcknowledged={() => undefined} />,
    );

    expect(markup).toContain("J’ai vu les nouveautés");
    expect(markup).not.toContain("href=\"#progression-");
    expect(markup).not.toContain("href=\"#milestone-");
  });
});
