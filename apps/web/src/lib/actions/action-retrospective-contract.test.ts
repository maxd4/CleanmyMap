import { describe, expect, it } from "vitest";
import {
  ACTION_RETROSPECTIVE_LIMITS,
  actionRetrospectiveDraftSchema,
  isActionRetrospectiveEditor,
  isActionRetrospectivePublic,
  normalizeActionRetrospectiveDraft,
} from "./action-retrospective-contract";

describe("action retrospective contract", () => {
  it("normalizes whitespace and keeps an empty draft representable", () => {
    expect(normalizeActionRetrospectiveDraft({
      thanksMessage: "  Merci\n à toutes et tous  ",
      workedWell: " \t",
      blockers: null,
      improveNextTime: undefined,
    })).toEqual({
      thanksMessage: "Merci à toutes et tous",
      workedWell: null,
      blockers: null,
      improveNextTime: null,
    });
  });

  it("accepts exact server limits and rejects the next character", () => {
    for (const [field, limit] of Object.entries(ACTION_RETROSPECTIVE_LIMITS)) {
      const exact = actionRetrospectiveDraftSchema.safeParse({ [field]: "x".repeat(limit) });
      const tooLong = actionRetrospectiveDraftSchema.safeParse({ [field]: "x".repeat(limit + 1) });
      expect(exact.success, `${field} exact limit`).toBe(true);
      expect(tooLong.success, `${field} over limit`).toBe(false);
    }
  });

  it("keeps editor and public guards narrow", () => {
    const editor = {
      thanksMessage: null,
      workedWell: "Nettoyage fluide",
      blockers: null,
      improveNextTime: null,
      publishedAt: null,
      updatedAt: "2026-10-31T10:00:00.000Z",
    };
    expect(isActionRetrospectiveEditor(editor)).toBe(true);
    expect(isActionRetrospectivePublic(editor)).toBe(false);
    expect(isActionRetrospectivePublic({ ...editor, publishedAt: "2026-10-31T10:01:00.000Z" })).toBe(true);
    expect(isActionRetrospectivePublic({ ...editor, authoredByClerkId: "private-id", publishedAt: "2026-10-31T10:01:00.000Z" })).toBe(true);
  });
});
