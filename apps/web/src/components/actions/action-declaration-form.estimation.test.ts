import { describe, expect, it } from "vitest";
import { estimateWasteKg } from "./action-declaration-form.estimation";

describe("action-declaration-form.estimation", () => {
  it("returns a positive rounded estimate", () => {
    const result = estimateWasteKg({
      volunteersCount: "3",
      durationMinutes: "90",
      placeType: "N° Boulevard/Avenue/Place",
      wasteMegotsKg: "0.2",
    });
    expect(result).toBeGreaterThan(0);
    expect(Number.isInteger(result * 10)).toBe(true);
  });

  it("increases estimate with volunteers and duration", () => {
    const low = estimateWasteKg({
      volunteersCount: "1",
      durationMinutes: "30",
      placeType: "Monument",
      wasteMegotsKg: "0",
    });
    const high = estimateWasteKg({
      volunteersCount: "5",
      durationMinutes: "120",
      placeType: "Monument",
      wasteMegotsKg: "0",
    });
    expect(high).toBeGreaterThan(low);
  });

  it("applies place and megots factors", () => {
    const street = estimateWasteKg({
      volunteersCount: "2",
      durationMinutes: "60",
      placeType: "N° Rue/Allée/Villa/Ruelle/Impasse",
      wasteMegotsKg: "0",
    });
    const parkWithMegots = estimateWasteKg({
      volunteersCount: "2",
      durationMinutes: "60",
      placeType: "Bois/Parc/Jardin/Square/Sentier",
      wasteMegotsKg: "1",
    });
    expect(parkWithMegots).toBeGreaterThan(street);
  });
});
