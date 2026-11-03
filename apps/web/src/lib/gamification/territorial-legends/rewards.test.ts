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
    campaignYear: 2026,
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
    campaignYear: 2026,
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
    expect(TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS).toEqual([7, 30, 90, 180]);
    expect(inclusiveCivilDays("2026-01-01", "2026-01-07")).toBe(7);
  });

  it("never duplicates a conquest or longevity proof on replay", () => {
    const proofs = buildTerritorialLegendAwardProofs(
      period({ lastVerifiedOn: "2026-01-30" }),
      new Set([
        "user-1:commune:2026:*:conquest:0",
        "user-1:commune:2026:75056:longevity:7",
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

  it("resets a hold at the campaign boundary and recognizes the season end", () => {
    const previous = period({ campaignYear: 2025, startedOn: "2025-12-31", lastVerifiedOn: "2025-12-31" });
    const january = buildTerritorialLegendHoldTransition(previous, winner({ campaignYear: 2026, effectiveOn: "2026-01-01" }));
    expect(january).toMatchObject({ campaignYear: 2026, startedOn: "2026-01-01", lastVerifiedOn: "2026-01-01" });

    const season = buildTerritorialLegendAwardProofs(period({ startedOn: "2026-07-05", lastVerifiedOn: "2026-12-31" }));
    expect(season.map((proof) => proof.awardKind)).toEqual(["conquest", "longevity", "longevity", "longevity", "longevity", "season_end"]);
    expect(season.map((proof) => proof.thresholdDays)).toEqual([0, 7, 30, 90, 180, 0]);
    expect(season.every((proof) => proof.proofId.includes(":2026:"))).toBe(true);
  });

  it("awards conquest once per level and campaign, independently of territory", () => {
    const first = buildTerritorialLegendAwardProofs(period({ territoryCode: "75056" }));
    const second = buildTerritorialLegendAwardProofs(
      period({ territoryCode: "69123" }),
      new Set(first.map((proof) => proof.proofId)),
    );
    expect(first.filter((proof) => proof.awardKind === "conquest")).toHaveLength(1);
    expect(second.filter((proof) => proof.awardKind === "conquest")).toHaveLength(0);
  });

  it("never creates legacy 365/730 thresholds or crosses a campaign", () => {
    const proofs = buildTerritorialLegendAwardProofs(period({ startedOn: "2026-01-01", lastVerifiedOn: "2026-12-31" }));
    expect(proofs.map((proof) => proof.thresholdDays)).not.toEqual(expect.arrayContaining([365, 730]));
    expect(proofs.every((proof) => proof.campaignYear === 2026)).toBe(true);
  });
});
