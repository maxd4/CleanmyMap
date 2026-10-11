import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mobileAuth: vi.fn(), getSupabase: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mocks.mobileAuth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));

import { GET, PATCH } from "./route";

describe("/api/mobile/actions/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mobileAuth.mockResolvedValue({ ok: true, userId: "recipient-1" });
    mocks.rpc.mockResolvedValue({ data: [{ status: "accepted", registration_id: "11111111-1111-4111-8111-111111111111", action_id: "action-1" }], error: null });
    mocks.getSupabase.mockReturnValue({ rpc: mocks.rpc });
  });

  it("reads and responds to invitations for the verified recipient only", async () => {
    expect((await GET(new Request("https://cleanmymap.test/api/mobile/actions/invitations"))).status).toBe(200);
    const response = await PATCH(new Request("https://cleanmymap.test/api/mobile/actions/invitations", {
      method: "PATCH",
      headers: { Authorization: "Bearer native-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: "11111111-1111-4111-8111-111111111111", decision: "accept" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("respond_to_action_invitation", {
      p_registration_id: "11111111-1111-4111-8111-111111111111",
      p_recipient_id: "recipient-1",
      p_decision: "accept",
    });
  });
});
