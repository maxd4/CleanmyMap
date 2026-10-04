import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../contracts/contract-model";
import { toPollutionScoreInput } from "./action-pollution-score-input";

describe("toPollutionScoreInput", () => {
  it("projects the exact scorer parameters, including action phase", () => {
    const action = buildActionDataContract({
      id: "action-complete",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-01-01",
      locationLabel: "Quai test",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 12.5,
      cigaretteButts: 80,
      volunteersCount: 4,
      durationMinutes: 90,
      actionPhase: "post_action_complete",
    });

    expect(toPollutionScoreInput(action)).toEqual({
      wasteKg: 12.5,
      cigaretteButts: 80,
      volunteersCount: 4,
      durationMinutes: 90,
      actionType: "action",
      status: "approved",
      actionPhase: "post_action_complete",
    });
  });

  it("preserves null metrics and the source status/type without fallbacks", () => {
    const action = buildActionDataContract({
      id: "spot-partial",
      type: "spot",
      status: "pending",
      source: "trash_spotter_spots",
      observedAt: "2026-01-01",
      locationLabel: "Quai test",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: 0,
      durationMinutes: 0,
      actionPhase: "post_action_complete",
    });

    expect(toPollutionScoreInput(action)).toEqual({
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: 0,
      durationMinutes: 0,
      actionType: "spot",
      status: "pending",
      actionPhase: "post_action_complete",
    });
  });
});
