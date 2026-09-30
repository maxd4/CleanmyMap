import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthenticatedAccessMock, getSupabaseServerClientMock, handleApiErrorMock } = vi.hoisted(() => ({
  requireAuthenticatedAccessMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  handleApiErrorMock: vi.fn((error: unknown) => NextResponse.json({ error: String(error) }, { status: 500 })),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: handleApiErrorMock }));

import { POST } from "./route";

const notificationId = "11111111-1111-4111-8111-111111111111";

function createSupabase() {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(async () => ({ error: null })),
  };
  return { supabase: { from: vi.fn(() => chain) }, chain };
}

function createAcknowledgementRequest(payload: unknown) {
  return new Request("http://localhost/api/gamification/me/acknowledge-reconciliation", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/gamification/me/acknowledge-reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
  });

  it("acknowledges only the requested receipt for the authenticated user", async () => {
    const { supabase, chain } = createSupabase();
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await POST(createAcknowledgementRequest({ notificationId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(supabase.from).toHaveBeenCalledWith("app_notifications");
    expect(chain.update).toHaveBeenCalledWith({ acknowledged_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith("id", notificationId);
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("type", "gamification_reconciliation");
    expect(chain.is).toHaveBeenCalledWith("acknowledged_at", null);
  });

  it.each([
    {},
    { notificationId: "" },
    { notificationId: "notification-1" },
    { notificationId, unexpected: true },
  ])("rejects an invalid notification payload: %j", async (payload) => {
    const response = await POST(createAcknowledgementRequest(payload));

    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 and does not create a privileged client for anonymous access", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await POST(createAcknowledgementRequest({ notificationId }));

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
