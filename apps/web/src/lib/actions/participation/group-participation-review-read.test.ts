import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadActionParticipationReviewPage, loadActionParticipationReviews } from "./group-participation-review-read";

describe("action participation review read", () => {
  it("excludes pending manual invitations from the future-action review queue", async () => {
    const registrationRows = [
      {
        id: "manual-invitation-1",
        action_id: "action-1",
        created_at: "2026-06-01T09:00:00Z",
        registered_at: "2026-06-01T09:00:00Z",
        updated_at: "2026-06-01T09:00:00Z",
        user_id: "invitee-1",
        registration_status: "pending",
        registration_source: "manual_add",
      },
      {
        id: "group-request-1",
        action_id: "action-1",
        created_at: "2026-06-01T10:00:00Z",
        registered_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-01T10:00:00Z",
        user_id: "requester-1",
        registration_status: "pending",
        registration_source: "group_form",
      },
    ];
    const profiles = [{ id: "requester-1", display_name: "Alice", handle: "alice" }];
    const registrationState: Record<string, string> = {};
    const registrationChain = {
      select: vi.fn(() => registrationChain),
      eq: vi.fn((field: string, value: string) => {
        registrationState[field] = value;
        return registrationChain;
      }),
      in: vi.fn(() => registrationChain),
      order: vi.fn(() => registrationChain),
      range: vi.fn(async (from: number, to: number) => ({
        data: registrationRows.filter((row) =>
          !registrationState.registration_source || row.registration_source === registrationState.registration_source,
        ).slice(from, to + 1),
        error: null,
      })),
    };
    const profileChain = {
      select: vi.fn(() => profileChain),
      in: vi.fn(() => profileChain),
      limit: vi.fn(async () => ({ data: profiles, error: null })),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "public_profiles" ? profileChain : registrationChain),
    } as unknown as SupabaseClient;

    const result = await loadActionParticipationReviews(supabase, {
      actionId: "action-1",
      actionPhase: "pre_action",
      statuses: ["pending"],
    });

    expect(registrationState.registration_source).toBe("group_form");
    expect(result.map((item) => item.id)).toEqual(["group-request-1"]);
    expect(result[0]?.participationSource).toBe("group_form");
  });

  it("paginates every confirmed participant with a stable offset and optional identity filter", async () => {
    const participantRows = Array.from({ length: 101 }, (_, index) => ({
      id: `participant-row-${index}`,
      action_id: "action-1",
      created_at: `2026-10-19T10:${String(index).padStart(2, "0")}:00Z`,
      updated_at: `2026-10-19T10:${String(index).padStart(2, "0")}:00Z`,
      joined_at: `2026-10-19T10:${String(index).padStart(2, "0")}:00Z`,
      user_id: `user-${String(index).padStart(3, "0")}`,
      participation_status: "confirmed",
      participation_source: "group_form",
    }));
    const state: Record<string, unknown> = {};
    const participantChain = {
      select: vi.fn(() => participantChain),
      eq: vi.fn((field: string, value: string) => { state[field] = value; return participantChain; }),
      in: vi.fn(() => participantChain),
      order: vi.fn(() => participantChain),
      range: vi.fn(async (from: number, to: number) => ({ data: participantRows.filter((row) => !state.user_id || row.user_id === state.user_id).slice(from, to + 1), error: null })),
    };
    const profileChain = {
      select: vi.fn(() => profileChain),
      in: vi.fn(() => profileChain),
      limit: vi.fn(async () => ({ data: [], error: null })),
    };
    const spogomiChain = {
      select: vi.fn(() => spogomiChain),
      eq: vi.fn(() => spogomiChain),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "action_participants" ? participantChain : table === "public_profiles" ? profileChain : spogomiChain),
    } as unknown as SupabaseClient;

    const firstPage = await loadActionParticipationReviewPage(supabase, {
      actionId: "action-1",
      actionPhase: "post_action_complete",
      statuses: ["confirmed"],
      limit: 100,
    });
    expect(firstPage.items).toHaveLength(100);
    expect(firstPage.items[0]?.userId).toBe("user-000");
    expect(firstPage.nextOffset).toBe(100);
    expect(firstPage.hasMore).toBe(true);

    const lastPage = await loadActionParticipationReviewPage(supabase, {
      actionId: "action-1",
      actionPhase: "post_action_complete",
      statuses: ["confirmed"],
      limit: 100,
      offset: 0,
      userId: "user-100",
    });
    expect(lastPage.items.map((item) => item.userId)).toEqual(["user-100"]);
    expect(state.user_id).toBe("user-100");
    expect(lastPage.hasMore).toBe(false);
  });
});
