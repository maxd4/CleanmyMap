import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "./metadata";
import {
  loadJoinableActions,
  loadUserParticipationHistory,
} from "./group-participation";

type ActionRow = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes?: string | null;
};

function createActionsChain(actions: ActionRow[]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({
      data: actions,
      error: null,
    })),
    maybeSingle: vi.fn(async () => ({
      data: actions[0] ?? null,
      error: null,
    })),
    then: (
      resolve: (value: { data: ActionRow[] | null; error: null }) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: actions,
        error: null,
      }).then(resolve, reject),
  };

  return chain;
}

function createFailingParticipantsChain(message: string) {
  const error = { message };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({
      data: null,
      error,
    })),
    maybeSingle: vi.fn(async () => ({
      data: null,
      error,
    })),
    then: (
      resolve: (value: { data: null; error: { message: string } }) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: null,
        error,
      }).then(resolve, reject),
  };

  return chain;
}

function createSupabaseMock(params: {
  actions: ActionRow[];
  participantErrorMessage?: string;
  historyErrorMessage?: string;
}) {
  const actionChain = createActionsChain(params.actions);
  const failingParticipantsChain = createFailingParticipantsChain(
    params.participantErrorMessage ?? "action_participants unavailable",
  );
  const historyChain = createFailingParticipantsChain(
    params.historyErrorMessage ?? "history unavailable",
  );

  return {
    rpc: vi.fn(async () => ({
      data: null,
      error: { message: "rpc unavailable" },
    })),
    from: vi.fn((table: string) => {
      if (table === "actions") {
        return actionChain;
      }

      if (table === "action_participants") {
        return params.historyErrorMessage ? historyChain : failingParticipantsChain;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;
}

describe("group participation fallback handling", () => {
  it("keeps the joinable actions list available when participation summaries cannot be loaded", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-06-01T10:00:00Z",
          action_date: "2026-06-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
      ],
      participantErrorMessage: "RLS: action_participants is service only",
    });

    const items = await loadJoinableActions(supabase, {
      limit: 8,
      userId: null,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "action-1",
      participantsCount: 0,
      joined: false,
      awaitingApproval: false,
    });
  });

  it("returns an empty history instead of failing when participation history cannot be loaded", async () => {
    const supabase = createSupabaseMock({
      actions: [],
      historyErrorMessage: "RLS: action_participants is service only",
    });

    const history = await loadUserParticipationHistory(supabase, {
      userId: "user-1",
      limit: 12,
    });

    expect(history).toEqual([]);
  });
});
