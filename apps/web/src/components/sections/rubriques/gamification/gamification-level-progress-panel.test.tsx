import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MeResponse } from "./gamification-types";
import { GamificationLevelProgressPanel } from "./gamification-level-progress-panel";

function progression(overrides: Partial<MeResponse["progression"]> = {}): MeResponse["progression"] {
  return {
    currentLevel: 2,
    potentialLevel: 2,
    xpValidated: 2,
    xpPending: 1,
    nextLevel: {
      level: 3,
      xpRequired: 3,
      xpRemaining: 1,
      frozen: false,
      requirements: {
        level: 3,
        met: true,
        eligible: true,
        rulesVersion: "progression-rules-v2",
        xp: { current: 2, required: 3, met: false },
        potentialLevel: 2,
        currentLevel: 2,
        conditions: [],
        satisfied: [],
        missing: [],
        thresholds: {
          minVerifiedContributions: 1,
          minDiversityTypes: 1,
          minCollectiveEvents: 0,
          minQualityAverage: null,
          minValidationRatio: null,
        },
        current: {
          verifiedContributions: 1,
          verifiedContributionFamilies: [],
          validatedActions: 1,
          diversityTypes: 1,
          collectiveEvents: 0,
          qualityAverage: 0,
          validationRatio: 1,
        },
      },
    },
    monthlyMilestone: null,
    ...overrides,
  } as MeResponse["progression"];
}

function render(overrides: Partial<MeResponse["progression"]> = {}) {
  return renderToStaticMarkup(
    <GamificationLevelProgressPanel
      progression={progression(overrides)}
      loading={false}
      error={undefined}
      locale="fr"
    />,
  );
}

describe("GamificationLevelProgressPanel", () => {
  it("renders current and potential levels, validated/pending XP and next-level progress", () => {
    const markup = render({ potentialLevel: 4 });

    expect(markup).toContain("Niveau global");
    expect(markup).toContain("Niveau actuel");
    expect(markup).toContain("Niveau potentiel");
    expect(markup).toContain("Potentiel supérieur");
    expect(markup).toContain("XP validée");
    expect(markup).toContain("XP en attente");
    expect(markup).toContain("Non comptée tant qu&#x27;elle n&#x27;est pas validée");
    expect(markup).toContain("Prochain niveau");
    expect(markup).toContain("67%");
    expect(markup).toContain("1 XP restantes");
  });

  it("renders missing requirements, frozen state and a real monthly milestone", () => {
    const markup = render({
      nextLevel: {
        ...progression().nextLevel,
        frozen: true,
        requirements: {
          ...progression().nextLevel.requirements,
          missing: [{ id: "minVerifiedContributions", current: 0, required: 2, met: false }],
        },
      },
      monthlyMilestone: {
        id: "milestone-2026-9",
        month: 9,
        year: 2026,
        description: "Objectif du mois : Collecter 10kg de déchets !",
        targetKg: 10,
        currentKg: 4,
        isCompleted: false,
      },
    });

    expect(markup).toContain("Niveau bloqué");
    expect(markup).toContain("Prérequis encore manquants");
    expect(markup).toContain("Contributions vérifiées: 0/2");
    expect(markup).toContain("Milestone mensuel");
    expect(markup).toContain("4 kg / 10 kg");
  });

  it("handles loading and error states without numeric fallbacks", () => {
    const loading = renderToStaticMarkup(
      <GamificationLevelProgressPanel progression={undefined} loading error={undefined} locale="fr" />,
    );
    const error = renderToStaticMarkup(
      <GamificationLevelProgressPanel progression={undefined} loading={false} error={new Error("offline")} locale="fr" />,
    );

    expect(loading).toContain("Chargement du niveau global");
    expect(loading).not.toContain("Niveau actuel");
    expect(error).toContain("Niveau global");
    expect(error).not.toContain("Niveau actuel");
  });
});
