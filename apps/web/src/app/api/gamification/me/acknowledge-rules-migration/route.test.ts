import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getSupabaseServerClientMock, handleApiErrorMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  handleApiErrorMock: vi.fn((error: unknown) =>
    NextResponse.json({ error: String(error) }, { status: 500 }),
  ),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: handleApiErrorMock }));

import { POST } from "./route";

function createSupabaseProfileClient(currentAppliedRulesRevision: number) {
  const profileUpsert = vi.fn<
    (...args: [Record<string, unknown>, { onConflict: string }]) => Promise<{ error: null }>
  >(async () => ({ error: null }));
  const profileChain = {
    select: vi.fn(() => profileChain),
    eq: vi.fn(() => profileChain),
    maybeSingle: vi.fn(async () => ({
      data: { current_applied_rules_revision: currentAppliedRulesRevision },
      error: null,
    })),
    upsert: profileUpsert,
  };
  const notificationChain = {
    update: vi.fn(() => notificationChain),
    eq: vi.fn(() => notificationChain),
    is: vi.fn(async () => ({ error: null })),
  };
  const supabase = {
    from: vi.fn((table: string) =>
      table === "progression_profiles" ? profileChain : notificationChain,
    ),
  };

  return { profileUpsert, supabase };
}

async function expectAcknowledgement(
  currentAppliedRulesRevision: number,
  expectedRulesRevision: number,
) {
  const { profileUpsert, supabase } = createSupabaseProfileClient(currentAppliedRulesRevision);
  getSupabaseServerClientMock.mockReturnValue(supabase);

  const response = await POST();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    rulesRevision: expectedRulesRevision,
  });
  expect(profileUpsert).toHaveBeenCalledWith(
    { user_id: "user-1", last_acknowledged_rules_revision: expectedRulesRevision },
    { onConflict: "user_id" },
  );
  return profileUpsert;
}

describe("POST /api/gamification/me/acknowledge-rules-migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  it("does not mark rules as applied when the profile is still at revision zero", async () => {
    const profileUpsert = await expectAcknowledgement(0, 0);
    expect(profileUpsert.mock.calls[0]?.[0]).not.toHaveProperty(
      "current_applied_rules_revision",
    );
  });

  it("caps acknowledgement at the revision actually applied", async () => {
    await expectAcknowledgement(3, 3);
  });
});
