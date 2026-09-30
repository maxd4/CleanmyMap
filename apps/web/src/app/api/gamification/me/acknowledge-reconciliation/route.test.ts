import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getSupabaseServerClientMock, handleApiErrorMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getSupabaseServerClientMock: vi.fn(),
  handleApiErrorMock: vi.fn((error: unknown) => NextResponse.json({ error: String(error) }, { status: 500 })),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: handleApiErrorMock }));

import { POST } from "./route";

function createSupabase() {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(async () => ({ error: null })),
  };
  return { supabase: { from: vi.fn(() => chain) }, chain };
}

describe("POST /api/gamification/me/acknowledge-reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  it("acknowledges only the requested receipt for the authenticated user", async () => {
    const { supabase, chain } = createSupabase();
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await POST(new Request("http://localhost/api/gamification/me/acknowledge-reconciliation", {
      method: "POST",
      body: JSON.stringify({ notificationId: "notification-1" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(supabase.from).toHaveBeenCalledWith("app_notifications");
    expect(chain.update).toHaveBeenCalledWith({ acknowledged_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith("id", "notification-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("type", "gamification_reconciliation");
    expect(chain.is).toHaveBeenCalledWith("acknowledged_at", null);
  });

  it("rejects a request without a receipt identifier", async () => {
    const response = await POST(new Request("http://localhost/api/gamification/me/acknowledge-reconciliation", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
