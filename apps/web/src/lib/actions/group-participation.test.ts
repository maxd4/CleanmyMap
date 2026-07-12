import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "./metadata";
import {
  isVisibleInGroupForms,
  loadJoinableActions,
  loadUserParticipationHistory,
} from "./group-participation";
import {
  buildJoinableItem,
  resolveParticipationUpdatedAt,
} from "./group-participation.helpers";

type ActionRow = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  moderation_visibility?: "visible" | "hidden";
  action_phase?: "pre_action" | "post_action_draft" | "post_action_complete";
  notes?: string | null;
};

function createActionsChain(actions: ActionRow[]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({
      data: actions.filter(
        (action) => action.moderation_visibility !== "hidden",
      ),
      error: null,
    })),
    maybeSingle: vi.fn(async () => ({
      data:
        actions.find((action) => action.moderation_visibility !== "hidden") ??
        null,
      error: null,
    })),
    then: (
      resolve: (value: { data: ActionRow[] | null; error: null }) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: actions.filter(
          (action) => action.moderation_visibility !== "hidden",
        ),
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
  it("keeps only pre-actions explicitly published as group forms", () => {
    expect(
      isVisibleInGroupForms(
        {
          action_phase: "pre_action",
        },
        { groupJoinEnabled: true },
      ),
    ).toBe(true);
    expect(
      isVisibleInGroupForms(
        {
          action_phase: "pre_action",
        },
        { groupJoinEnabled: false },
      ),
    ).toBe(false);
    expect(
      isVisibleInGroupForms(
        {
          action_phase: "post_action_complete",
        },
        { groupJoinEnabled: true },
      ),
    ).toBe(false);
  });

  it("builds a joinable item from the extracted helper seam", () => {
    const item = buildJoinableItem(
      {
        id: "action-1",
        created_at: "2026-06-01T10:00:00Z",
        action_date: "2026-06-10",
        location_label: "Parc Nord",
        volunteers_count: 12,
        duration_minutes: 45,
        status: "approved",
        notes: null,
        action_phase: "pre_action",
      },
      { groupJoinEnabled: true },
      4,
      {
        actionId: "action-1",
        activeCount: 4,
        totalCount: 6,
        myParticipationStatus: "pending",
        myParticipationSource: "group_form",
        myJoinedAt: "2026-06-02T10:00:00Z",
        myUpdatedAt: null,
      },
    );

    expect(item).toMatchObject({
      actionPhase: "pre_action",
      participantsCount: 4,
      joined: false,
      awaitingApproval: true,
      joinedAt: "2026-06-02T10:00:00Z",
      participationUpdatedAt: "2026-06-02T10:00:00Z",
      groupJoinEnabled: true,
      pendingRequestsCount: 2,
    });
  });

  it("resolves the latest participation timestamp from a row", () => {
    expect(
      resolveParticipationUpdatedAt({
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-02T10:00:00Z",
        updated_at: undefined,
      }),
    ).toBe("2026-06-02T10:00:00Z");
  });

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
          status: "pending",
          action_phase: "pre_action",
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

  it("hides pre-actions that are not explicitly published as group forms", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-1",
          created_at: "2026-06-01T10:00:00Z",
          action_date: "2026-06-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "pending",
          action_phase: "pre_action",
          notes: "Préparation sans publication explicite",
        },
        {
          id: "action-2",
          created_at: "2026-06-01T10:00:00Z",
          action_date: "2026-06-11",
          location_label: "Quai Sud",
          volunteers_count: 8,
          duration_minutes: 45,
          status: "pending",
          action_phase: "pre_action",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
      ],
    });

    const items = await loadJoinableActions(supabase, {
      limit: 8,
      userId: null,
    });

    expect(items.map((item) => item.id)).toEqual(["action-2"]);
  });

  it("hides pre-actions masked by moderation visibility", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-hidden",
          created_at: "2026-06-01T10:00:00Z",
          action_date: "2026-06-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "pending",
          moderation_visibility: "hidden",
          action_phase: "pre_action",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
        {
          id: "action-visible",
          created_at: "2026-06-01T10:00:00Z",
          action_date: "2026-06-11",
          location_label: "Quai Sud",
          volunteers_count: 8,
          duration_minutes: 45,
          status: "pending",
          moderation_visibility: "visible",
          action_phase: "pre_action",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
      ],
    });

    const items = await loadJoinableActions(supabase, {
      limit: 8,
      userId: null,
    });

    expect(items.map((item) => item.id)).toEqual(["action-visible"]);
  });

  it("does not bypass publication rules when a hidden action is targeted directly", async () => {
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
          action_phase: "pre_action",
          notes: "Préparation sans publication explicite",
        },
        {
          id: "action-2",
          created_at: "2026-06-01T10:00:00Z",
          action_date: "2026-06-11",
          location_label: "Quai Sud",
          volunteers_count: 8,
          duration_minutes: 45,
          status: "approved",
          action_phase: "pre_action",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
      ],
    });

    const items = await loadJoinableActions(supabase, {
      limit: 8,
      userId: null,
      actionId: "action-1",
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("action-2");
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
