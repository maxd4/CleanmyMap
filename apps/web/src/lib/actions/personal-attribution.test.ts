import { describe, expect, it } from "vitest";
import { derivePersonalAttribution } from "./personal-attribution";

describe("personal action attribution", () => {
  it.each(["pending", "cancelled", null] as const)(
    "%s participation has no personal attribution",
    (participationStatus) => {
      expect(
        derivePersonalAttribution({
          participationStatus,
          confirmedParticipantCount: 2,
          finalWasteKg: 10,
          finalCigaretteButts: 20,
        }),
      ).toBeNull();
    },
  );

  it("derives only additive final metrics for one confirmed participant", () => {
    expect(
      derivePersonalAttribution({
        participationStatus: "confirmed",
        confirmedParticipantCount: 1,
        finalWasteKg: 10,
        finalCigaretteButts: 20,
      }),
    ).toEqual({
      attributionKind: "quote_part",
      confirmedParticipantCount: 1,
      wasteKg: 10,
      cigaretteButts: 20,
    });
  });

  it("recalculates the quote when the confirmed denominator changes", () => {
    const action = {
      participationStatus: "confirmed" as const,
      finalWasteKg: 9,
      finalCigaretteButts: 12,
    };

    expect(
      derivePersonalAttribution({ ...action, confirmedParticipantCount: 2 }),
    ).toMatchObject({ confirmedParticipantCount: 2, wasteKg: 4.5, cigaretteButts: 6 });
    expect(
      derivePersonalAttribution({ ...action, confirmedParticipantCount: 3 }),
    ).toMatchObject({ confirmedParticipantCount: 3, wasteKg: 3, cigaretteButts: 4 });
  });

  it("keeps unavailable additive metrics null and never creates non-additive shares", () => {
    expect(
      derivePersonalAttribution({
        participationStatus: "confirmed",
        confirmedParticipantCount: 2,
        finalWasteKg: null,
        finalCigaretteButts: 0,
      }),
    ).toEqual({
      attributionKind: "quote_part",
      confirmedParticipantCount: 2,
      wasteKg: null,
      cigaretteButts: 0,
    });
  });
});
