import { describe, expect, it } from "vitest";
import {
  normalizeAdministrativeRequirements,
} from "./administrative-requirements";

describe("administrative requirements", () => {
  it("normalizes legacy pre-actions to pending without using preparationState", () => {
    expect(normalizeAdministrativeRequirements(undefined)).toEqual({
      status: "pending",
      validatedAt: null,
      validatedByUserId: null,
    });
    expect(
      normalizeAdministrativeRequirements({ preparationState: "action_en_cours" }),
    ).toEqual({
      status: "pending",
      validatedAt: null,
      validatedByUserId: null,
    });
  });

  it("keeps only the dedicated validated state and trace fields", () => {
    expect(
      normalizeAdministrativeRequirements({
        status: "validated",
        validatedAt: "2026-09-15T10:00:00.000Z",
        validatedByUserId: "validator-1",
      }),
    ).toEqual({
      status: "validated",
      validatedAt: "2026-09-15T10:00:00.000Z",
      validatedByUserId: "validator-1",
    });
  });
});
