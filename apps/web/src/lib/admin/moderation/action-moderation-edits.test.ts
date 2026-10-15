import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/actions/query", () => ({
  runSingleActionQuery: vi.fn(),
}));
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  actionEditsSchema,
  buildAdminActionUpdates,
} from "./action-moderation-edits";

describe("action moderation edit contract", () => {
  it("uses the canonical cigarette count bound", () => {
    expect(
      actionEditsSchema.safeParse({ cigaretteButts: 5_000_000 }).success,
    ).toBe(true);
    expect(
      actionEditsSchema.safeParse({ cigaretteButts: 5_000_001 }).success,
    ).toBe(false);
    expect(
      actionEditsSchema.safeParse({
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 5_000_000,
          cigaretteButtsMassKg: null,
          cigaretteButtsVolumeLiters: null,
          cigaretteButtsCondition: null,
          cigaretteButtsCountProvenance: "counted",
          cigaretteButtsMassProvenance: "unknown",
          cigaretteButtsVolumeProvenance: "unknown",
          cigaretteButtsConversionFormulaVersion: null,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects off-grid ordinary masses without rounding", () => {
    expect(actionEditsSchema.safeParse({ wasteKg: 10.1 }).success).toBe(true);
    expect(actionEditsSchema.safeParse({ wasteKg: 10.05 }).success).toBe(false);
    expect(
      actionEditsSchema.safeParse({
        wasteBreakdown: {
          recyclablesKg: 10.05,
          glassKg: 0,
          householdWasteKg: 0,
          otherWasteKg: 0,
        },
      }).success,
    ).toBe(false);
  });

  it("does not expose volunteer derived fields as moderation input", () => {
    const parsed = actionEditsSchema.parse({
      volunteerParticipation: {
        childrenCount: 1,
        adultCount: 2,
        retiredCount: 3,
        participantsCount: 6,
      },
    });

    expect(parsed).not.toHaveProperty("volunteerParticipation");
  });

  it("preserves an unknown participant count during an unrelated edit", async () => {
    vi.mocked(runSingleActionQuery).mockResolvedValueOnce({
      action_date: "2026-07-01",
      location_label: "Paris 10e",
      department_code: "75",
      department_name: "Paris",
      latitude: 48.87,
      longitude: 2.36,
      waste_kg: 2,
      cigarette_butts: 4,
      volunteers_count: null,
      duration_minutes: 60,
      actor_name: "Collectif",
      notes: null,
    });

    const updates = await buildAdminActionUpdates(
      {} as never,
      "action-1",
      "approved",
      { notes: "Correction administrative" },
    );

    expect(updates.volunteers_count).toBeNull();
    expect(updates.waste_kg).toBe(2);
    expect(updates.cigarette_butts).toBe(4);
  });
});
