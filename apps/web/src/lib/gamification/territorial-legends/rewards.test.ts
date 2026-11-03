import { describe, expect, it } from "vitest";
import {
  buildTerritorialLegendAwardProofs,
  buildTerritorialLegendHoldTransition,
  inclusiveCivilDays,
  territorialLegendFamilyId,
  TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS,
  territorialLegendProofToFact,
} from "./rewards";
import type { TerritorialLegendHoldPeriod, TerritorialLegendWinnerSnapshot } from "./types";

function winner(overrides: Partial<TerritorialLegendWinnerSnapshot> = {}): TerritorialLegendWinnerSnapshot {
  return {
    userId: "user-1",
    level: "commune",
    territoryCode: "75056",
    territoryLabel: "Paris",
    effectiveOn: "2026-01-01",
    score: 2,
    rank: 1,
    tieSize: 1,
    sourceFingerprint: "evidence-a",
    ...overrides,
  };
}

function period(overrides: Partial<TerritorialLegendHoldPeriod> = {}): TerritorialLegendHoldPeriod {
  return {
    userId: "user-1",
    level: "commune",
    territoryCode: "75056",
    territoryLabel: "Paris",
    startedOn: "2026-01-01",
    lastVerifiedOn: "2026-01-01",
    endedOn: null,
    validityStatus: "active",
    sourceFingerprint: "evidence-a",
    ...overrides,
  };
}

describe("territorial legend rewards", () => {
  it("creates one conquest proof and exact longevity thresholds", () => {
    const sevenDays = buildTerritorialLegendAwardProofs(period({ lastVerifiedOn: "2026-01-07" }));
    expect(sevenDays.map((proof) => [proof.awardKind, proof.thresholdDays])).toEqual([
      ["conquest", 0],
      ["longevity", 7],
    ]);

    const thirtyDays = buildTerritorialLegendAwardProofs(period({ lastVerifiedOn: "2026-01-30" }));
    expect(thirtyDays.map((proof) => proof.thresholdDays)).toEqual([0, 7, 30]);
    expect(TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS).toEqual([7, 30, 90, 180, 365, 730]);
    expect(inclusiveCivilDays("2026-01-01", "2026-01-07")).toBe(7);
  });

  it("never duplicates a conquest or longevity proof on replay", () => {
    const proofs = buildTerritorialLegendAwardProofs(
      period({ lastVerifiedOn: "2026-01-30" }),
      new Set([
        "user-1:commune:75056:conquest:0",
        "user-1:commune:75056:longevity:7",
      ]),
    );
    expect(proofs.map((proof) => proof.thresholdDays)).toEqual([30]);
    expect(territorialLegendProofToFact(proofs[0]!)).toMatchObject({
      mechanicId: "territorial_legend:commune",
      sourceTable: "territorial_legend_award_proofs",
      xpAwarded: 0,
      eligible: true,
    });
  });

  it("extends only an adjacent verified day and starts a new period after a gap", () => {
    const extended = buildTerritorialLegendHoldTransition(period(), winner({ effectiveOn: "2026-01-02" }));
    expect(extended).toMatchObject({ startedOn: "2026-01-01", lastVerifiedOn: "2026-01-02", endedOn: null });

    const interrupted = buildTerritorialLegendHoldTransition(
      period({ lastVerifiedOn: "2026-01-02" }),
      winner({ effectiveOn: "2026-01-04" }),
    );
    expect(interrupted).toMatchObject({ startedOn: "2026-01-04", lastVerifiedOn: "2026-01-04" });
    expect(inclusiveCivilDays("2026-01-01", "2026-01-02")).toBe(2);
  });

  it("keeps territorial families independent", () => {
    expect(territorialLegendFamilyId("arrondissement")).not.toBe(territorialLegendFamilyId("commune"));
    expect(territorialLegendFamilyId("country")).toBe("territorial_legend:country");
  });
});
