import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { sanitizePreActionForm } from "./model";

describe("sanitizePreActionForm", () => {
  it("removes final harvest fields while keeping expected waste categories", () => {
    const form = createInitialFormState("Maxence", "action");

    const sanitized = sanitizePreActionForm({
      ...form,
      wasteKg: "12",
      cigaretteButts: "42",
      cigaretteButtsCount: "42",
      cigaretteButtsCondition: "humide",
      wasteMegotsKg: "3",
      wasteMegotsCondition: "mouille",
      wastePlastiqueKg: "4",
      wasteVerreKg: "5",
      wasteMetalKg: "6",
      wasteMixteKg: "7",
      triQuality: "elevee",
      visionBagsCount: "8",
      visionFillLevel: "75",
      visionDensity: "humide_dense",
      notes: "bilan final",
      wasteCategories: ["plastic"],
    });

    expect(sanitized.wasteKg).toBe("0");
    expect(sanitized.cigaretteButts).toBe("0");
    expect(sanitized.cigaretteButtsCount).toBe("");
    expect(sanitized.cigaretteButtsCondition).toBe("propre");
    expect(sanitized.wasteMegotsKg).toBe("0");
    expect(sanitized.wasteMegotsCondition).toBe("propre");
    expect(sanitized.wastePlastiqueKg).toBe("");
    expect(sanitized.wasteVerreKg).toBe("");
    expect(sanitized.wasteMetalKg).toBe("");
    expect(sanitized.wasteMixteKg).toBe("");
    expect(sanitized.triQuality).toBe("moyenne");
    expect(sanitized.visionBagsCount).toBe("");
    expect(sanitized.visionFillLevel).toBe("");
    expect(sanitized.visionDensity).toBe("");
    expect(sanitized.notes).toBe("");
    expect(sanitized.wasteCategories).toEqual(["plastic"]);
  });

  it("normalizes enterprise association values and participant accounts", () => {
    const form = createInitialFormState("Maxence", "action");

    const sanitized = sanitizePreActionForm({
      ...form,
      associationName: "Entreprise - Veolia",
      enterpriseName: "  autre valeur ",
      participantAccounts: [" @alice ", "alice", "@bob"],
      volunteersCount: "",
    });

    expect(sanitized.associationName).toBe("Entreprise");
    expect(sanitized.enterpriseName).toBe("Veolia");
    expect(sanitized.participantAccounts).toEqual(["alice", "bob"]);
    expect(sanitized.volunteersCount).toBe("1");
  });
});
