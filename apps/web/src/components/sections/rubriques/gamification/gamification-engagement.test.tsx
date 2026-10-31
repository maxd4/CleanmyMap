import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MeResponse } from "./gamification-types";
import { EngagementPanel } from "./gamification-engagement";

type NextLevel = MeResponse["progression"]["nextLevel"];

function progression(overrides: Partial<MeResponse["progression"]> = {}): MeResponse["progression"] {
  return {
    engagementStatus: { id: "observateur", label: "Observateur", minimumLevel: 1 },
    recognition: { currentContributor: null, topContributors: [] },
    nextLevel: { requirements: { missing: [], satisfied: [] } },
    ...overrides,
  } as MeResponse["progression"];
}

describe("EngagementPanel", () => {
  it("renders loading and unavailable states without inventing a role or contribution", () => {
    const loading = renderToStaticMarkup(
      <EngagementPanel progression={undefined} loading error={undefined} locale="fr" />,
    );
    const unavailable = renderToStaticMarkup(
      <EngagementPanel progression={undefined} loading={false} error={new Error("offline")} locale="fr" />,
    );

    expect(loading).toContain("animate-pulse");
    expect(loading).not.toContain("Observateur");
    expect(unavailable).toContain("Parcours d&#x27;engagement");
    expect(unavailable).toContain("n&#x27;est pas disponible");
    expect(unavailable).not.toContain("actions vérifiées");
  });

  it("derives the visible status from validated contributions and keeps pending facts out", () => {
    const observerMarkup = renderToStaticMarkup(
      <EngagementPanel
        progression={progression()}
        loading={false}
        error={undefined}
        locale="fr"
      />,
    );
    const contributorMarkup = renderToStaticMarkup(
      <EngagementPanel
        progression={progression({
          engagementStatus: { id: "referent", label: "Référent", minimumLevel: 6 },
          recognition: {
            currentContributor: {
              userId: "user-1",
              actorName: "Anonymous contributor",
              associationName: "CleanMyMap",
              verifiedContributions: 3,
              qualityAverage: 1,
              topZone: "Zone",
              contributionType: "terrain",
              regularityLabel: "Régulier",
              activeMonths: 1,
              mentorEligible: false,
              lastContributionDate: "2026-10-30",
              highlight: "Contribution validée",
              thanksMessage: "Merci",
              badges: [],
              score: 3,
            } as NonNullable<MeResponse["progression"]["recognition"]["currentContributor"]>,
          },
          nextLevel: {
            requirements: {
              missing: [{ id: "minVerifiedContributions", current: 3, required: 5, met: false }],
              satisfied: [],
            } as unknown as NextLevel["requirements"],
          } as NextLevel,
        })}
        loading={false}
        error={undefined}
        locale="fr"
      />
    );

    expect(observerMarkup).toContain("Observateur");
    expect(observerMarkup).toContain("Aucune contribution validée pour le moment.");
    expect(observerMarkup).not.toContain("user-1");
    expect(contributorMarkup).toContain("Référent");
    expect(contributorMarkup).toContain("3 actions vérifiées");
    expect(contributorMarkup).toContain("Contributions vérifiées: 3/5");
    expect(contributorMarkup).not.toContain("XP en attente");
  });
});
