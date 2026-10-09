import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadActionParticipationReviews } from "./group-participation-review-read";

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
      limit: vi.fn(async () => ({
        data: registrationRows.filter((row) =>
          !registrationState.registration_source || row.registration_source === registrationState.registration_source,
        ),
        error: null,
      })),
    };
    const profileChain = {
      select: vi.fn(() => profileChain),
      in: vi.fn(() => profileChain),
      limit: vi.fn(async () => ({ data: profiles, error: null })),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "profiles" ? profileChain : registrationChain),
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
});
