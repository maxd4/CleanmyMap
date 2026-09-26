import { describe, expect, it } from "vitest";
import {
  addParticipantSchema,
  getAdminParticipationOperation,
  resolveCanonicalClerkUserId,
  resolveGroupJoinActionId,
  resolveGroupJoinRequestContext,
  toggleSchema,
} from "./route.shared";

describe("group-join shared route contracts", () => {
  it("normalizes and validates the route action id", async () => {
    expect(resolveGroupJoinActionId(" action-1 ")).toMatchObject({
      ok: true,
      value: "action-1",
    });

    const invalid = resolveGroupJoinActionId(" ");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.response.status).toBe(422);
    }
  });

  it("returns the validation response before resolving an invalid body", async () => {
    const context = await resolveGroupJoinRequestContext(
      new Request("http://localhost/api/actions/action-1/group-join", {
        method: "PATCH",
        body: "not-json",
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
      toggleSchema,
    );

    expect(context.ok).toBe(false);
    if (!context.ok) {
      expect(context.response.status).toBe(400);
    }
  });

  it("rejects an invalid action id after a valid body", async () => {
    const context = await resolveGroupJoinRequestContext(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ participantUserId: "user-2" }),
      }),
      { params: Promise.resolve({ actionId: "  " }) },
      addParticipantSchema,
    );

    expect(context.ok).toBe(false);
    if (!context.ok) {
      expect(context.response.status).toBe(422);
    }
  });

  it("keeps the canonical moderation operation and clerk id rules", () => {
    expect(getAdminParticipationOperation({ participantUserId: "user-2" })).toBe(
      "admin_add_participant",
    );
    expect(
      getAdminParticipationOperation({ participantId: "participant-1", decision: "reject" }),
    ).toBe("admin_review_reject");
    expect(resolveCanonicalClerkUserId(" user_123 ")).toBe("user_123");
    expect(resolveCanonicalClerkUserId("legacy-user")).toBeNull();
    expect(resolveCanonicalClerkUserId(undefined)).toBeNull();
  });
});
