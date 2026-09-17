import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResumeRow } from "./store";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseClerkRlsClient: vi.fn(),
  loadActionById: vi.fn(),
  loadActionResumeRowById: vi.fn(),
  loadCanonicalActionOrganizerIdsForAction: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: mocks.getSupabaseClerkRlsClient,
}));

vi.mock("@/lib/actions/store", () => ({
  loadActionById: mocks.loadActionById,
  loadActionResumeRowById: mocks.loadActionResumeRowById,
}));

vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction:
    mocks.loadCanonicalActionOrganizerIdsForAction,
}));

import { resolveActionResumePhase } from "./action-resume";

function makeResumeRow(
  overrides: Partial<ActionResumeRow> = {},
): ActionResumeRow {
  return {
    id: "action-42",
    created_by_clerk_id: "owner-1",
    action_date: "2099-01-01",
    event_start_time: "10:00:00",
    status: "pending",
    published_at: "2098-01-01T00:00:00.000Z",
    moderation_visibility: "visible",
    action_phase: "pre_action",
    ...overrides,
  };
}

describe("resolveActionResumePhase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({});
    mocks.getSupabaseClerkRlsClient.mockResolvedValue(null);
    mocks.loadActionResumeRowById.mockResolvedValue(null);
    mocks.loadActionById.mockResolvedValue(null);
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue([]);
  });

  it("does not use a privileged client or leak a private phase to an anonymous visitor", async () => {
    mocks.loadActionResumeRowById.mockResolvedValue(
      makeResumeRow({
        action_phase: "pre_action",
        published_at: null,
        moderation_visibility: "hidden",
      }),
    );

    await expect(
      resolveActionResumePhase({
        actionId: "private-action",
        userId: null,
        identity: null,
      }),
    ).resolves.toBeNull();

    expect(mocks.getSupabaseServerClient).toHaveBeenCalledWith(false);
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalledWith(true);
    expect(mocks.getSupabaseClerkRlsClient).not.toHaveBeenCalled();
  });

  it("resolves an anonymous phase only from the public RLS projection", async () => {
    mocks.loadActionResumeRowById.mockResolvedValue(makeResumeRow());

    await expect(
      resolveActionResumePhase({
        actionId: "public-pre-action",
        userId: null,
        identity: null,
      }),
    ).resolves.toBe("pre_action");

    expect(mocks.getSupabaseServerClient).toHaveBeenCalledWith(false);
  });

  it("uses the authenticated Clerk/RLS boundary for an owner pre-action", async () => {
    mocks.getSupabaseClerkRlsClient.mockResolvedValue({});
    mocks.loadActionResumeRowById.mockResolvedValue(
      makeResumeRow({
        published_at: null,
        moderation_visibility: "hidden",
      }),
    );

    await expect(
      resolveActionResumePhase({
        actionId: "owner-pre-action",
        userId: "owner-1",
        identity: {
          userId: "owner-1",
          role: "benevole",
          activeRole: "benevole",
        },
      }),
    ).resolves.toBe("pre_action");

    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("allows an authenticated organizer only after the explicit management check", async () => {
    mocks.getSupabaseClerkRlsClient.mockResolvedValue({});
    mocks.loadActionResumeRowById.mockResolvedValue(null);
    mocks.loadActionById.mockResolvedValue(
      makeResumeRow({
        created_by_clerk_id: "owner-1",
        published_at: null,
        moderation_visibility: "hidden",
      }),
    );
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue(["organizer-1"]);

    await expect(
      resolveActionResumePhase({
        actionId: "organized-pre-action",
        userId: "organizer-1",
        identity: {
          userId: "organizer-1",
          role: "benevole",
          activeRole: "benevole",
        },
      }),
    ).resolves.toBe("pre_action");

    expect(mocks.getSupabaseServerClient).toHaveBeenCalledWith(true);
  });

  it("does not return a private phase to an authenticated unauthorized user", async () => {
    mocks.getSupabaseClerkRlsClient.mockResolvedValue({});
    mocks.loadActionResumeRowById.mockResolvedValue(null);
    mocks.loadActionById.mockResolvedValue(
      makeResumeRow({
        published_at: null,
        moderation_visibility: "hidden",
      }),
    );

    await expect(
      resolveActionResumePhase({
        actionId: "private-action",
        userId: "other-user",
        identity: {
          userId: "other-user",
          role: "benevole",
          activeRole: "benevole",
        },
      }),
    ).resolves.toBeNull();
  });
});
