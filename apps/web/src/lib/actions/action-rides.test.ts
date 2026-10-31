import { describe, expect, it } from "vitest";
import {
  ACTION_RIDE_FREE_TEXT_MAX_LENGTH,
  ACTION_RIDE_FREE_TEXT_NOTICE,
  ACTION_RIDE_SEATS_REQUESTED_RANGE,
  ACTION_RIDE_SEATS_TOTAL_RANGE,
  normalizeActionRideOriginZone,
  validateActionRideFreeText,
  validateActionRideInput,
  validateActionRideRequestInput,
} from "./action-rides";

describe("action ride server input contract [EXECUTED_BEHAVIOR]", () => {
  it("publishes the same seat bounds as the SQL contract", () => {
    expect(ACTION_RIDE_SEATS_TOTAL_RANGE).toEqual({ min: 1, max: 8 });
    expect(ACTION_RIDE_SEATS_REQUESTED_RANGE).toEqual({ min: 1, max: 4 });
    expect(ACTION_RIDE_FREE_TEXT_NOTICE).toMatch(/adresse|coordonnées|téléphone|e-mail/iu);
  });

  it("accepts only a canonical territory value", () => {
    expect(normalizeActionRideOriginZone("Paris 1er")).toBe("1er arrondissement");
    expect(normalizeActionRideOriginZone("Neuilly-sur-Seine")).toBe("Neuilly-sur-Seine");
    expect(normalizeActionRideOriginZone("Adresse exacte, Paris")).toBeNull();
    expect(normalizeActionRideOriginZone("Lyon")).toBeNull();
  });

  it("normalizes bounded free text and preserves a blank draft as null", () => {
    expect(validateActionRideFreeText("  Départ groupé   près du métro  ")).toEqual({
      ok: true,
      value: "Départ groupé près du métro",
    });
    expect(validateActionRideFreeText("   ")).toEqual({ ok: true, value: null });
    expect(validateActionRideFreeText("x".repeat(ACTION_RIDE_FREE_TEXT_MAX_LENGTH + 1))).toEqual({
      ok: false,
      reason: "invalid_text",
    });
  });

  it.each([
    ["alice@example.org", "contact_like"],
    ["06 12 34 56 78", "contact_like"],
    ["48.8566, 2.3522", "coordinate_like"],
    ["12 rue de Rivoli", "address_like"],
    ["75001 Paris", "address_like"],
  ] as const)("rejects manifest personal detail %s", (value, reason) => {
    expect(validateActionRideFreeText(value)).toEqual({ ok: false, reason });
  });

  it("validates the complete ride and request payloads before persistence", () => {
    expect(validateActionRideInput({
      originZoneName: "Paris 1er",
      departureAt: "2030-06-15T08:00:00+02:00",
      seatsTotal: 8,
      note: "Départ groupé",
    })).toEqual({
      ok: true,
      value: {
        originZoneName: "1er arrondissement",
        departureAt: "2030-06-15T06:00:00.000Z",
        seatsTotal: 8,
        note: "Départ groupé",
      },
    });
    expect(validateActionRideInput({
      originZoneName: "Paris 1er",
      departureAt: "2030-06-15T08:00:00+02:00",
      seatsTotal: 9,
      note: null,
    })).toMatchObject({ ok: false, field: "seatsTotal" });
    expect(validateActionRideRequestInput({ seatsRequested: 4, message: "Je viens avec un sac." })).toEqual({
      ok: true,
      value: { seatsRequested: 4, message: "Je viens avec un sac." },
    });
    expect(validateActionRideRequestInput({ seatsRequested: 0, message: null })).toMatchObject({ ok: false, field: "seatsRequested" });
  });
});
