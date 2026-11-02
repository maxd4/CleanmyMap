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
  participantResult: { data: unknown[] | null; count?: number | null; error: { message: string } | null };
  actionResult?: { data: typeof action | null; error: { message: string } | null };
}) {
  const actionQuery = createQuery(params.actionResult ?? { data: action, error: null });
  const participantQuery = createQuery({
    ...params.participantResult,
    count: params.participantResult.count ?? null,
  });
  return {
    from: vi.fn((table: string) => table === "actions" ? actionQuery : participantQuery),
  } as unknown as SupabaseClient;
}

const confirmedParticipant = {
  user_id: "user-1",
  action_id: "action-1",
  participation_status: "confirmed",
};

function createConfirmedImpactReadMock(params: {
  first: { data: unknown[]; count: number | null };
  second: { data: unknown[]; count: number | null };
  actions?: (typeof action)[];
}) {
  const participantQueries = [
    createQuery({ ...params.first, error: null }),
    createQuery({ ...params.second, error: null }),
  ];
  const actionRows = params.actions ?? [action];
  const actionQuery = createQuery({ data: actionRows, count: actionRows.length, error: null });
  return {
    from: vi.fn((table: string) => table === "actions"
      ? actionQuery
      : participantQueries.shift() ?? createQuery({ data: [], count: 0, error: null })),
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

  it("rejects a missing second-read attribution instead of treating it as absent", async () => {
    await expect(loadConfirmedParticipantImpactAttributions(
      createConfirmedImpactReadMock({
        first: { data: [confirmedParticipant], count: 1 },
        second: { data: [], count: 0 },
      }),
      "user-1",
    )).rejects.toThrow("correspond");
  });

  it("rejects an unexpected user even when the second-read count is exact", async () => {
    await expect(loadConfirmedParticipantImpactAttributions(
      createConfirmedImpactReadMock({
        first: { data: [confirmedParticipant], count: 1 },
        second: {
          data: [{ ...confirmedParticipant, user_id: "user-2" }],
          count: 1,
        },
      }),
      "user-1",
    )).rejects.toThrow("correspond");
  });

  it("requires an exact non-null count for the first scientific read", async () => {
    await expect(loadConfirmedParticipantImpactAttributions(
      createConfirmedImpactReadMock({
        first: { data: [confirmedParticipant], count: null },
        second: { data: [confirmedParticipant], count: 1 },
      }),
      "user-1",
    )).rejects.toThrow("tronquée");
  });

  it("requires an exact non-null count for the strict second read", async () => {
    await expect(loadStrictParticipantImpactAttributions(
      createSupabaseMock({
        participantResult: { data: [], count: null, error: null },
      }),
      new Map([[action.id, action as ActionPreviewRow]]),
      [action.id],
    )).rejects.toThrow("tronquée");
  });

  it.each([
    ["an empty user identifier", { ...confirmedParticipant, user_id: " " }],
    ["an unexpected action identifier", { ...confirmedParticipant, action_id: "action-2" }],
    ["an incoherent status", { ...confirmedParticipant, participation_status: "cancelled" }],
  ])("rejects %s in the strict second read", async (_label, row) => {
    await expect(loadStrictParticipantImpactAttributions(
      createSupabaseMock({
        participantResult: { data: [row], count: 1, error: null },
      }),
      new Map([[action.id, action as ActionPreviewRow]]),
      [action.id],
    )).rejects.toThrow("incohérente");
  });

  it("keeps a genuinely empty, complete first read as a valid empty result", async () => {
    const supabase = createConfirmedImpactReadMock({
      first: { data: [], count: 0 },
      second: { data: [], count: 0 },
    });

    await expect(loadConfirmedParticipantImpactAttributions(supabase, "user-1"))
      .resolves.toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("keeps a complete coherent second read unchanged", async () => {
    const result = await loadConfirmedParticipantImpactAttributions(
      createConfirmedImpactReadMock({
        first: { data: [confirmedParticipant], count: 1 },
        second: { data: [confirmedParticipant], count: 1 },
      }),
      "user-1",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      actionId: "action-1",
      userId: "user-1",
    });
  });
});
