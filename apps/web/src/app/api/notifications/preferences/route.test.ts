import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: vi.fn(async () => ({ allowed: true, retryAfter: 0 })),
  createServerRateLimitResponse: vi.fn(() => null),
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => new Response(error instanceof Error ? error.message : "error", { status: 500 })),
  validationErrorResponse: vi.fn(() => new Response("Invalid", { status: 422 })),
}));

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
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
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
