import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadActionParticipantImpactSnapshot } from "./group-participation-read";

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
});
