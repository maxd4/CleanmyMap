import { describe, expect, it } from "vitest";
import type { ActiveRole } from "@/lib/domain-language";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canModerateActionConversationForIdentity, isPublishedVisibleAction } from "./action-conversations";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000006_action_conversation_exclusions.sql"),
  "utf8",
);

describe("action discussion access contract", () => {
  it.each([
    ["published approved visible", { status: "approved", published_at: "2026-01-01", moderation_visibility: "visible" }, true],
    ["pending is not public", { status: "pending", published_at: "2026-01-01", moderation_visibility: "visible" }, false],
    ["unpublished is not public", { status: "approved", published_at: null, moderation_visibility: "visible" }, false],
    ["hidden is not public", { status: "approved", published_at: "2026-01-01", moderation_visibility: "hidden" }, false],
  ])("classifies %s", (_label, action, expected) => {
    expect(isPublishedVisibleAction(action)).toBe(expected);
  });

  it("uses an append-only exclusion source without membership-based access", () => {
    expect(migration).toContain("create table if not exists public.action_conversation_exclusions");
    expect(migration).toContain("reinstated_at timestamptz");
    expect(migration).toContain("and a.status = 'approved'");
    expect(migration).toContain("action_conversation_exclusions e");
    expect(migration).toContain("and e.active");
    expect(migration).not.toContain("exists (\n              select 1 from public.action_conversation_members");
    expect(migration).toContain("not exists (\n        select 1 from public.action_conversation_exclusions e");
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
