import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMock, resetApiRouteMocks, serverMock } from "@/__tests__/support/api-route-mocks";


function makeSupabase() {
  const queries = {
    notification_preferences: {
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    notification_information_mutes: {
      data: [{ action_id: "11111111-1111-4111-8111-111111111111" }],
      error: null,
    },
  };
  const from = vi.fn((table: keyof typeof queries) => {
    if (table === "notification_preferences") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => queries.notification_preferences),
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(queries.notification_information_mutes)),
      })),
    };
  });
  return { from };
}

describe("/api/notifications/preferences", () => {
  beforeEach(() => {
    resetApiRouteMocks("user-1");
  });

  it("refuses unauthenticated reads without opening Supabase", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { GET } = await import("./route");

    expect((await GET(new Request("http://localhost/api/notifications/preferences"))).status).toBe(401);
    expect(serverMock).not.toHaveBeenCalled();
  });

  it("scopes both preference reads to the authenticated Clerk identity", async () => {
    const supabase = makeSupabase();
    serverMock.mockReturnValue(supabase);
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/notifications/preferences"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      informationalEnabled: true,
      actionRemindersEnabled: true,
      mutedInformationActionIds: ["11111111-1111-4111-8111-111111111111"],
    });
    expect(supabase.from).toHaveBeenCalledWith("notification_preferences");
    expect(supabase.from).toHaveBeenCalledWith("notification_information_mutes");
  });
});
