import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "@/lib/actions/types";
import { resolveActionCreationStatus, resolvePersistedCigaretteButts } from "./store";

function buildPayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actorName: "Test",
    associationName: "Action spontanée",
    actionDate: "2026-04-22",
    locationLabel: "Test lieu",
    wasteKg: 2,
    cigaretteButts: 0,
    volunteersCount: 2,
    durationMinutes: 30,
    notes: "Test",
    ...overrides,
  };
}

describe("resolvePersistedCigaretteButts", () => {
  it("derives butts from megots weight when available", () => {
    const payload = buildPayload({
      wasteBreakdown: {
        megotsKg: 0.4,
        megotsCondition: "propre",
      },
      cigaretteButtsCount: 120,
    });

    expect(resolvePersistedCigaretteButts(payload)).toBe(1000);
  });

  it("falls back to the count slider when no megots weight is present", () => {
    const payload = buildPayload({
      wasteBreakdown: {
        megotsKg: 0,
        megotsCondition: "propre",
      },
      cigaretteButtsCount: 120,
    });

    expect(resolvePersistedCigaretteButts(payload)).toBe(120);
  });
});

describe("resolveActionCreationStatus", () => {
  it("approves admin-like submissions immediately", () => {
    expect(resolveActionCreationStatus(true)).toBe("approved");
  });

  it("keeps regular submissions pending", () => {
    expect(resolveActionCreationStatus(false)).toBe("pending");
  });
});
