import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  loadActionParticipantImpactSnapshot,
  loadConfirmedParticipantImpactAttributions,
} from "./group-participation-read";
import { loadStrictParticipantImpactAttributions } from "./group-participation-impact-read";
import type { ActionPreviewRow } from "./group-participation.helpers";

const action = {
  id: "action-1",
  updated_at: "action-revision-1",
  action_date: "2026-09-20",
  status: "approved",
  action_phase: "post_action_complete",
  published_at: "2026-09-01T09:00:00.000Z",
  moderation_visibility: "visible",
  waste_kg: 10,
  cigarette_butts: 4,
};

function createQuery<T>(result: T) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (
      resolve: (value: T) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function createSupabaseMock(params: {
  participantResult: { data: unknown[] | null; error: { message: string } | null };
  actionResult?: { data: typeof action | null; error: { message: string } | null };
}) {
  const actionQuery = createQuery(params.actionResult ?? { data: action, error: null });
  const participantQuery = createQuery(params.participantResult);
  return {
    from: vi.fn((table: string) => table === "actions" ? actionQuery : participantQuery),
  } as unknown as SupabaseClient;
}

describe("action participant impact read status", () => {
  it("distinguishes a successful empty roster from an unavailable projection", async () => {
    const result = await loadActionParticipantImpactSnapshot(createSupabaseMock({
      participantResult: { data: [], error: null },
    }), "action-1");

    expect(result).toMatchObject({
      available: true,
      readStatus: "available",
      revision: "action-revision-1",
    });
    expect(result.attributions).toEqual(new Map());
  });

  it("marks a participant projection read error without fabricating an empty roster", async () => {
    const result = await loadActionParticipantImpactSnapshot(createSupabaseMock({
      participantResult: { data: null, error: { message: "projection unavailable" } },
    }), "action-1");

    expect(result).toMatchObject({
      available: false,
      readStatus: "error",
      revision: null,
    });
    expect(result.attributions).toEqual(new Map());
  });

  it("marks an action read error separately from a missing action", async () => {
    const result = await loadActionParticipantImpactSnapshot(createSupabaseMock({
      actionResult: { data: null, error: { message: "action unavailable" } },
      participantResult: { data: [], error: null },
    }), "action-1");

    expect(result).toMatchObject({
      available: false,
      readStatus: "error",
      revision: null,
    });
  });

  it("fails the strict projection read when the server reports truncated rows", async () => {
    const participantQuery = createQuery({
      data: [{ user_id: "user-1", action_id: "action-1" }],
      count: 2,
      error: null,
    });
    const supabase = {
      from: vi.fn(() => participantQuery),
    } as unknown as SupabaseClient;

    await expect(loadStrictParticipantImpactAttributions(
      supabase,
      new Map([[action.id, action as ActionPreviewRow]]),
      [action.id],
    )).rejects.toThrow("tronquée");
  });

  it("fails closed when confirmed participation rows exceed the requested boundary", async () => {
    const participantQuery = createQuery({
      data: Array.from({ length: 2 }, (_, index) => ({
        user_id: "user-1",
        action_id: `action-${index + 1}`,
      })),
      count: 2,
      error: null,
    });
    const supabase = {
      from: vi.fn(() => participantQuery),
    } as unknown as SupabaseClient;

    await expect(loadConfirmedParticipantImpactAttributions(
      supabase,
      "user-1",
      1,
    )).rejects.toThrow("tronquée");
  });
});
