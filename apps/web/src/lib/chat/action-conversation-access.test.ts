import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveRole } from "@/lib/domain-language";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canModerateActionConversationForIdentity,
  isActionDiscussionAvailable,
  resolveActionDiscussionAccess,
} from "./action-conversations";
import { isPublicActionReferenceAvailable } from "./action-sharing";

const loadActionByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadActionOrganizerIdsForAction: vi.fn().mockResolvedValue([]),
}));

const appliedMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000006_action_conversation_exclusions.sql"),
  "utf8",
);
const correctiveMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000007_action_conversation_access_and_audit.sql"),
  "utf8",
);

const publicFutureAction = {
  action_date: "2099-01-01",
  event_start_time: "10:00",
  action_phase: "pre_action" as const,
  status: "pending" as const,
  moderation_visibility: "visible" as const,
  published_at: "2098-12-01T10:00:00.000Z",
};

function buildSupabaseMock(exclusionActive = false) {
  const conversationQuery = {
    select: vi.fn(() => conversationQuery),
    eq: vi.fn(() => conversationQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "conversation-1" },
      error: null,
    }),
  };
  const exclusionQuery = {
    select: vi.fn(() => exclusionQuery),
    eq: vi.fn(() => exclusionQuery),
    maybeSingle: vi.fn().mockResolvedValue({
      data: exclusionActive ? { active: true } : null,
      error: null,
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "action_conversations") return conversationQuery;
      if (table === "action_conversation_exclusions") return exclusionQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("action discussion access contract", () => {
  beforeEach(() => {
    loadActionByIdMock.mockReset();
  });

  it.each([
    ["published pending future pre-action", publicFutureAction, true],
    ["published approved future pre-action", { ...publicFutureAction, status: "approved" as const }, true],
    ["published approved completed action", { ...publicFutureAction, action_phase: "post_action_complete" as const, status: "approved" as const }, true],
    ["published pending completed action", { ...publicFutureAction, action_phase: "post_action_complete" as const }, false],
    ["rejected", { ...publicFutureAction, status: "rejected" as const }, false],
    ["cancelled published action", { ...publicFutureAction, status: "cancelled" as const }, true],
    ["unpublished", { ...publicFutureAction, published_at: null }, false],
    ["hidden", { ...publicFutureAction, moderation_visibility: "hidden" as const }, false],
  ])("classifies %s", (_label, action, expected) => {
    expect(isActionDiscussionAvailable(action)).toBe(expected);
  });

  it.each([
    ["future published pre-action", publicFutureAction, true, true],
    [
      "approved published post-action",
      { ...publicFutureAction, action_phase: "post_action_complete" as const, status: "approved" as const },
      true,
      true,
    ],
    [
      "approved published legacy action with null phase",
      { ...publicFutureAction, action_phase: null, status: "approved" as const },
      false,
      true,
    ],
    ["hidden", { ...publicFutureAction, moderation_visibility: "hidden" as const }, false, false],
    ["unpublished", { ...publicFutureAction, published_at: null }, false, false],
  ])("keeps sharing and discussion eligibility independent for %s", (_label, action, shareExpected, discussionExpected) => {
    expect(isPublicActionReferenceAvailable(action as Parameters<typeof isPublicActionReferenceAvailable>[0])).toBe(shareExpected);
    expect(isActionDiscussionAvailable(action)).toBe(discussionExpected);
  });

  it("keeps the historical conversation migrations and their exclusions contract intact", () => {
    expect(appliedMigration).toContain("create table if not exists public.action_conversation_exclusions");
    expect(appliedMigration).toContain("reinstated_at timestamptz");
    expect(appliedMigration).toContain("and a.status = 'approved'");
    expect(appliedMigration).toContain("action_conversation_exclusions e");
    expect(appliedMigration).toContain("and e.active");
    expect(appliedMigration).not.toContain("exists (\n              select 1 from public.action_conversation_members");
    expect(correctiveMigration).toContain("public.is_public_future_pre_action(");
    expect(correctiveMigration).toContain("a.status = 'approved'");
    expect(correctiveMigration).toContain("action_conversation_exclusions e");
    expect(correctiveMigration).not.toContain("action_participants");
  });

  it("authorizes every participation state equally when there is no exclusion", async () => {
    for (const participationStatus of ["pending", "confirmed", "cancelled", "refused"]) {
      loadActionByIdMock.mockResolvedValue(publicFutureAction);
      const supabase = buildSupabaseMock(false);
      const result = await resolveActionDiscussionAccess(
        supabase as never,
        "action-1",
        `user-${participationStatus}`,
      );

      expect(result).toEqual({ state: "allowed", conversationId: "conversation-1" });
      expect(supabase.from).not.toHaveBeenCalledWith("action_participants");
    }
  });

  it("refuses an active exclusion and restores access after reintroduction", async () => {
    loadActionByIdMock.mockResolvedValue(publicFutureAction);
    expect(await resolveActionDiscussionAccess(buildSupabaseMock(true) as never, "action-1", "user-1")).toEqual({
      state: "excluded",
      conversationId: "conversation-1",
    });
    expect(await resolveActionDiscussionAccess(buildSupabaseMock(false) as never, "action-1", "user-1")).toEqual({
      state: "allowed",
      conversationId: "conversation-1",
    });
  });

  it("refuses an explicitly excluded authenticated user even when discussion is available", async () => {
    loadActionByIdMock.mockResolvedValue(publicFutureAction);
    expect(await resolveActionDiscussionAccess(buildSupabaseMock(true) as never, "action-1", "authenticated-user")).toEqual({
      state: "excluded",
      conversationId: "conversation-1",
    });
  });

  it("does not couple participation routes to discussion membership", () => {
    const joinRoute = readFileSync(resolve(process.cwd(), "src/app/api/actions/group-join/route.ts"), "utf8");
    const reviewRoute = readFileSync(resolve(process.cwd(), "src/app/api/actions/[actionId]/group-join/route.review.ts"), "utf8");
    expect(joinRoute).not.toContain("ensureActionConversationMember");
    expect(reviewRoute).not.toContain("ensureActionConversationMember");
  });

  it.each([
    ["creator", "benevole", "creator", [], true],
    ["organizer", "benevole", "organizer", ["organizer"], true],
    ["admin", "admin", "other", [], true],
    ["max", "max", "other", [], true],
    ["elu is not an override", "elu", "other", [], false],
    ["ordinary user", "benevole", "other", [], false],
  ])("applies dedicated moderation capability: %s", (_label, activeRole, userId, organizers, expected) => {
    expect(canModerateActionConversationForIdentity(
      { userId, activeRole: activeRole as ActiveRole },
      { created_by_clerk_id: "creator" },
      organizers,
    )).toBe(expected);
  });
});
