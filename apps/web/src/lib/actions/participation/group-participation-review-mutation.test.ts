import { describe, expect, it } from "vitest";

import { reviewActionParticipation } from "./group-participation-review-mutation";

type RegistrationRow = {
  id: string;
  action_id: string;
  created_at: string;
  registered_at: string;
  updated_at: string | null;
  user_id: string;
  registration_status: "pending" | "confirmed" | "cancelled";
  registration_source: "group_form" | "manual_add";
};

function createRegistrationSupabase(initial: RegistrationRow) {
  let row = { ...initial };
  let updateCount = 0;

  const matches = (filters: Record<string, string>) =>
    Object.entries(filters).every(([key, value]) => row[key as keyof RegistrationRow] === value);

  const createChain = () => {
    const filters: Record<string, string> = {};
    let pendingUpdate: Record<string, unknown> | null = null;

    const chain = {
      select: () => chain,
      update: (values: Record<string, unknown>) => {
        pendingUpdate = values;
        return chain;
      },
      eq: (key: string, value: string) => {
        filters[key] = value;
        return chain;
      },
      maybeSingle: async () => ({
        data: matches(filters) ? { ...row } : null,
        error: null,
      }),
      single: async () => {
        if (!pendingUpdate) {
          return { data: matches(filters) ? { ...row } : null, error: null };
        }
        if (!matches(filters)) {
          return { data: null, error: { message: "No rows returned" } };
        }
        row = {
          ...row,
          ...(pendingUpdate as Partial<RegistrationRow>),
          updated_at: "2026-10-09T14:00:00.000Z",
        };
        updateCount += 1;
        return { data: { ...row }, error: null };
      },
      then: (
        resolve: (value: { count: number; error: null }) => void,
        reject: (reason: unknown) => void,
      ) => Promise.resolve({
        count: matches({ action_id: row.action_id, registration_status: "confirmed" }) ? 1 : 0,
        error: null,
      }).then(resolve, reject),
    };
    return chain;
  };

  return {
    supabase: { from: () => createChain() } as never,
    getRow: () => ({ ...row }),
    getUpdateCount: () => updateCount,
  };
}

const pendingRegistration: RegistrationRow = {
  id: "registration-1",
  action_id: "action-1",
  created_at: "2026-10-09T13:00:00.000Z",
  registered_at: "2026-10-09T13:00:00.000Z",
  updated_at: null,
  user_id: "volunteer-1",
  registration_status: "pending",
  registration_source: "group_form",
};

describe("reviewActionParticipation registration requests", () => {
  it("makes one effective decision when two authorized organizers decide concurrently", async () => {
    const state = createRegistrationSupabase(pendingRegistration);

    const [accepted, losingDecision] = await Promise.all([
      reviewActionParticipation(state.supabase, {
        actionId: "action-1",
        participantId: "registration-1",
        decision: "accept",
        actionPhase: "pre_action",
        requirePending: true,
      }),
      reviewActionParticipation(state.supabase, {
        actionId: "action-1",
        participantId: "registration-1",
        decision: "reject",
        actionPhase: "pre_action",
        requirePending: true,
      }),
    ]);

    expect(state.getUpdateCount()).toBe(1);
    expect(state.getRow().registration_status).toBe("confirmed");
    expect([accepted.alreadyReviewed, losingDecision.alreadyReviewed].sort()).toEqual([false, true]);
  });

  it("does not reopen a request after an action or another reviewer has made it terminal", async () => {
    const state = createRegistrationSupabase({
      ...pendingRegistration,
      registration_status: "cancelled",
    });

    const result = await reviewActionParticipation(state.supabase, {
      actionId: "action-1",
      participantId: "registration-1",
      decision: "accept",
      actionPhase: "pre_action",
      requirePending: true,
    });

    expect(result.alreadyReviewed).toBe(true);
    expect(result.participationStatus).toBe("cancelled");
    expect(state.getUpdateCount()).toBe(0);
  });

  it("rejects a pending manual invitation from the organizer review mutation", async () => {
    const state = createRegistrationSupabase({
      ...pendingRegistration,
      registration_source: "manual_add",
    });

    await expect(
      reviewActionParticipation(state.supabase, {
        actionId: "action-1",
        participantId: "registration-1",
        decision: "accept",
        actionPhase: "pre_action",
      }),
    ).rejects.toMatchObject({
      name: "ValidationError",
      message: "Cette invitation doit être traitée par son destinataire.",
    });
    expect(state.getRow().registration_status).toBe("pending");
    expect(state.getUpdateCount()).toBe(0);
  });
});
