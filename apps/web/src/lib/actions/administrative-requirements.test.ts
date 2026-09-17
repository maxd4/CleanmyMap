import { describe, expect, it } from "vitest";
import {
  normalizeAdministrativeRequirements,
  preserveCanonicalAdministrativeRequirements,
} from "./administrative-requirements";
import { createActionSchema, updateActionSchema } from "@/lib/validation/action";

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

  it("preserves the canonical value while ignoring a generic PATCH value", () => {
    expect(
      preserveCanonicalAdministrativeRequirements(
        {
          actionTitle: "Action",
          administrativeRequirements: {
            status: "pending",
            validatedAt: null,
            validatedByUserId: null,
          },
        },
        {
          actionTitle: "Action modifiée",
          administrativeRequirements: {
            status: "validated",
            validatedAt: "2026-09-15T10:00:00.000Z",
            validatedByUserId: "attacker",
          },
        },
      ),
    ).toEqual({
      actionTitle: "Action modifiée",
      administrativeRequirements: {
        status: "pending",
        validatedAt: null,
        validatedByUserId: null,
      },
    });
  });

  it("does not create the protected state from a generic PATCH", () => {
    expect(
      preserveCanonicalAdministrativeRequirements(
        { actionTitle: "Action" },
        {
          actionTitle: "Action modifiée",
          administrativeRequirements: { status: "validated" },
        },
      ),
    ).toEqual({ actionTitle: "Action modifiée" });
  });

  it("strips the protected state from generic create and PATCH parser output", () => {
    const maliciousRequirements = {
      status: "validated" as const,
      validatedAt: "2026-09-15T10:00:00.000Z",
      validatedByUserId: "attacker",
    };
    const createResult = createActionSchema.safeParse({
      associationName: "Action spontanée",
      actionDate: "2026-09-20",
      locationLabel: "Paris",
      organizerType: "spontaneous",
      preparationData: {
        actionTitle: "Action hostile",
        administrativeRequirements: maliciousRequirements,
        formalitiesWorkflow: { userStatus: "sent" },
      },
    });
    const updateResult = updateActionSchema.safeParse({
      preparationData: {
        actionTitle: "Action modifiée",
        administrativeRequirements: maliciousRequirements,
        formalitiesWorkflow: { userStatus: "sent" },
      },
    });

    expect(createResult.success).toBe(true);
    expect(updateResult.success).toBe(true);
    if (createResult.success && updateResult.success) {
      expect(createResult.data.preparationData).not.toHaveProperty(
        "administrativeRequirements",
      );
      expect(updateResult.data.preparationData).not.toHaveProperty(
        "administrativeRequirements",
      );
      expect(createResult.data.preparationData).not.toHaveProperty(
        "formalitiesWorkflow",
      );
      expect(updateResult.data.preparationData).not.toHaveProperty(
        "formalitiesWorkflow",
      );
    }
  });
});
