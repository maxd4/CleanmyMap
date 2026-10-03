import { describe, expect, it } from "vitest";
import {
  CURRENT_INFINITE_PROGRESSIONS,
  CURRENT_MILESTONES,
  GAMIFICATION_REGISTRY,
  NON_GAMIFIED_SIGNALS,
} from "./progression-utils";
import {
  CURRENT_BADGE_DEFINITIONS,
  BADGE_DEFINITIONS,
} from "./badge-catalog";

const REQUIRED_NON_GAMIFIED_SIGNAL_IDS = [
  "signal:waste-total-direct-xp",
  "signal:cigarette-butts-direct-xp",
  "signal:demographic-breakdown",
  "signal:action-difficulty",
  "signal:action-accessibility",
  "signal:safety-instructions-text",
  "signal:recommended-materials-text",
  "signal:logistics-notes-text",
  "signal:departure-checklist-text",
  "signal:group-join-enabled",
  "signal:future-action-registration",
  "signal:future-registration-acceptance",
  "signal:referral-link-generation",
  "signal:donation-amount",
  "signal:user-role",
  "signal:trust-level",
  "signal:quality-score",
  "signal:form-completion",
  "signal:waste-and-butts-current-progression",
  "signal:photos-upload",
  "signal:vision-estimate",
  "signal:place-type",
  "signal:difficulty-duration-distance",
  "signal:formalities-free-text",
] as const;

describe("CURRENT gamification registry", () => {
  it("uses one canonical identity per current badge family and scale", () => {
    const ids = CURRENT_BADGE_DEFINITIONS.map((definition) => definition.id);
    const families = CURRENT_BADGE_DEFINITIONS.map((definition) => definition.family);
    const allIds = BADGE_DEFINITIONS.map((definition) => definition.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(families).size).toBe(families.length);
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(CURRENT_BADGE_DEFINITIONS.every((definition) =>
      definition.status === "CURRENT" &&
      definition.metric &&
      definition.sourceDomain &&
      definition.rule &&
      definition.xpPolicy,
    )).toBe(true);
    expect(CURRENT_INFINITE_PROGRESSIONS.every((progression) =>
      CURRENT_BADGE_DEFINITIONS.some((definition) =>
        definition.id === progression.badgeId &&
        definition.family === progression.badgeFamily &&
        definition.scale === progression.scale,
      ),
    )).toBe(true);
    expect(BADGE_DEFINITIONS.find((definition) => definition.id === "mohs"))
      .toMatchObject({ status: "LEGACY", scale: "mohs", family: "mohs" });
    expect(BADGE_DEFINITIONS.find((definition) => definition.id === "forms"))
      .toMatchObject({ status: "LEGACY", visibility: "not_exposed" });
  });

  it("uses one explicit category and contract for every current mechanic", () => {
    const ids = GAMIFICATION_REGISTRY.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(GAMIFICATION_REGISTRY.every((entry) => entry.rulesVersion)).toBe(true);
    expect(GAMIFICATION_REGISTRY.every((entry) => entry.sourceDomain)).toBe(true);
    expect(GAMIFICATION_REGISTRY.every((entry) => entry.description)).toBe(true);

    expect(CURRENT_INFINITE_PROGRESSIONS).toHaveLength(9);
    expect(CURRENT_INFINITE_PROGRESSIONS.every((entry) =>
      entry.category === "XP_PROGRESSION" &&
      entry.progressionId === entry.id &&
      entry.xpPolicy.kind === "progression_paliers",
    )).toBe(true);
    expect(CURRENT_INFINITE_PROGRESSIONS.find((entry) => entry.id === "moderation"))
      .toMatchObject({ visibility: "authorized_moderation" });
    expect(CURRENT_INFINITE_PROGRESSIONS.find((entry) => entry.id === "cartography"))
      .toMatchObject({ label: "Contribution cartographique", metric: "verified_geometry_contributions" });

    expect(CURRENT_MILESTONES).toHaveLength(15);
    expect(CURRENT_MILESTONES.every((entry) =>
      (entry.xpAwarded > 0 && entry.category === "XP_MILESTONE") ||
      (entry.xpAwarded === 0 && entry.category === "BADGE_ONLY"),
    )).toBe(true);
    expect(CURRENT_MILESTONES.find((entry) => entry.id === "parrainage_utile"))
      .toMatchObject({ category: "XP_MILESTONE", xpPolicy: { kind: "fixed_one_shot", amount: 2 } });
    expect(CURRENT_MILESTONES.find((entry) => entry.id === "participation_retrouvee"))
      .toMatchObject({ category: "BADGE_ONLY", xpPolicy: { kind: "none" } });
    expect(CURRENT_MILESTONES.filter((entry) => entry.id.startsWith("premiere_") || entry.id === "moderateur_polyvalent")
      .filter((entry) => entry.sourceDomain.includes("admin_operations_audit"))
      .every((entry) => entry.visibility === "authorized_moderation"))
      .toBe(true);

    expect(CURRENT_MILESTONES.filter((entry) => entry.category === "XP_MILESTONE").map((entry) => entry.id).sort())
      .toEqual([
        "boucle_bouclee",
        "donnee_exemplaire",
        "moderateur_polyvalent",
        "mobilisateur",
        "parrainage_utile",
        "premiere_trace_utile",
      ].sort());
  });

  it("makes every requested exclusion a final NON_GAMIFIED decision", () => {
    const registryById = new Map(GAMIFICATION_REGISTRY.map((entry) => [entry.id, entry]));

    for (const id of REQUIRED_NON_GAMIFIED_SIGNAL_IDS) {
      expect(registryById.get(id)).toMatchObject({
        id,
        category: "NON_GAMIFIED",
        progressionId: null,
        badgeId: null,
        milestoneId: null,
        visibility: "not_exposed",
        xpPolicy: { kind: "none" },
      });
    }

    expect(NON_GAMIFIED_SIGNALS.every((entry) =>
      entry.category === "NON_GAMIFIED" && entry.xpPolicy.kind === "none",
    )).toBe(true);
    expect(NON_GAMIFIED_SIGNALS.every((entry) =>
      !/\bTODO\b|plus tard|à traiter/i.test(entry.description),
    )).toBe(true);
  });
});
