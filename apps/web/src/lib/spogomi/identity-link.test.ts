import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const joinActionParticipationMock = vi.hoisted(() => vi.fn());
const claimFinishedActionParticipationMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/participation/group-participation", () => ({ joinActionParticipation: joinActionParticipationMock }));
vi.mock("@/lib/actions/participation/post-action-claims", () => ({ claimFinishedActionParticipation: claimFinishedActionParticipationMock }));
import {
  generateSpogomiIdentityCode,
  hashSpogomiIdentityCode,
  normalizeSpogomiIdentityCode,
} from "./identity-link";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261012000008_spogomi_identity_links.sql", import.meta.url),
  "utf8",
);
const claimRoute = readFileSync(
  new URL("../../app/api/spogomi/events/[eventId]/identity-link/route.ts", import.meta.url),
  "utf8",
);

describe("SPOGOMI identity link", () => {
  it("normalizes display separators without weakening the random code", () => {
    const code = generateSpogomiIdentityCode();
    expect(code).toMatch(/^SPOGOMI(?:-[A-F0-9]{5}){4}-[A-F0-9]{10}$/);
    expect(normalizeSpogomiIdentityCode(` ${code.toLowerCase()} `)).toBe(normalizeSpogomiIdentityCode(code));
    expect(hashSpogomiIdentityCode(code)).toBe(hashSpogomiIdentityCode(code.toLowerCase()));
    expect(hashSpogomiIdentityCode(code)).not.toBe(hashSpogomiIdentityCode(generateSpogomiIdentityCode()));
  });

  it("accepts a verified code without name matching and maps each action phase once", async () => {
    const { claimSpogomiIdentityLink, requestCleanMyMapParticipation } = await import("./identity-link");
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ link_status: "linked", participant_id: "participant-1", action_id: "action-1", attendance_status: "present" }],
        error: null,
      }),
    } as never;
    await expect(claimSpogomiIdentityLink(supabase, { eventId: "event-1", code: generateSpogomiIdentityCode(), clerkId: "user_1" })).resolves.toMatchObject({
      linkStatus: "linked",
      participantId: "participant-1",
      attendanceStatus: "present",
    });

    joinActionParticipationMock.mockResolvedValueOnce({ participationStatus: "pending" });
    await expect(requestCleanMyMapParticipation(supabase, { actionId: "action-1", clerkId: "user_1", actionPhase: "pre_action" })).resolves.toEqual({ status: "pending", store: "action_registrations" });
    expect(joinActionParticipationMock).toHaveBeenCalledWith(supabase, { actionId: "action-1", userId: "user_1", isAdminLike: false });

    claimFinishedActionParticipationMock.mockResolvedValueOnce({ participationStatus: "confirmed" });
    await expect(requestCleanMyMapParticipation(supabase, { actionId: "action-1", clerkId: "user_1", actionPhase: "post_action_complete" })).resolves.toEqual({ status: "confirmed", store: "action_participants" });
    expect(claimFinishedActionParticipationMock).toHaveBeenCalledWith(supabase, { actionId: "action-1", userId: "user_1" });
    await expect(requestCleanMyMapParticipation(supabase, { actionId: "action-1", clerkId: "user_1", actionPhase: "post_action_draft" })).resolves.toEqual({ status: "unavailable", store: null });
  });

  it("fails closed for an invalid code or an identity already linked to another account", async () => {
    const { claimSpogomiIdentityLink } = await import("./identity-link");
    const invalidSupabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "P0001" } }) } as never;
    await expect(claimSpogomiIdentityLink(invalidSupabase, { eventId: "event-1", code: generateSpogomiIdentityCode(), clerkId: "user_1" })).rejects.toMatchObject({ kind: "invalid_code" });
    const conflictSupabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }) } as never;
    await expect(claimSpogomiIdentityLink(conflictSupabase, { eventId: "event-1", code: generateSpogomiIdentityCode(), clerkId: "user_2" })).rejects.toMatchObject({ kind: "already_linked" });
  });

  it("keeps proof, uniqueness, audit and private access in the database contract", () => {
    expect(migration).toContain("spogomi_participants_verified_account_per_event");
    expect(migration).toContain("spogomi_participants_identity_link_code_hash_unique");
    expect(migration).toContain("spogomi_identity_link_events");
    expect(migration).toContain("claim_spogomi_identity_link");
    expect(migration).toContain("for update");
    expect(migration).toMatch(/revoke all on function public\.claim_spogomi_identity_link[\s\S]*?from public, anon, authenticated/i);
    expect(migration).not.toMatch(/grant .*spogomi_identity_link_events.*authenticated/i);
    expect(migration).not.toContain("create user");
    expect(migration).not.toContain("display_name");
  });

  it("never uses a name match and keeps action participation on existing stores", () => {
    expect(claimRoute).toContain("claimSpogomiIdentityLink");
    expect(claimRoute).toContain("requestCleanMyMapParticipation");
    expect(claimRoute).toContain("action_phase");
    expect(claimRoute).not.toContain("display_name");
    expect(claimRoute).not.toContain("action_participants");
  });
});
