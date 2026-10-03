import { beforeEach, describe, expect, it } from "vitest";
import { authMock, createChatNotificationsForMessageMock, createServerRateLimitResponseMock, getSupabaseClerkRlsClientMock, getSupabaseServerClientMock, reserveDiscussionMessageSlotMock, verifyRateLimitMock, resetChatRouteMocks } from "./route.test.mocks";

describe("POST /api/chat — AuthN et rate limiting", () => {
  beforeEach(() => {
    resetChatRouteMocks();
  });

  it("requires the server session without consulting BotID", async () => {
    authMock.mockResolvedValueOnce({ userId: null });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelType: "community", content: "Bonjour" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(authMock).toHaveBeenCalledOnce();
    expect(verifyRateLimitMock).toHaveBeenCalledOnce();
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });

  it("returns 429 before auth, parsing, or business calls when rate limited", async () => {
    verifyRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 17_000,
      retryAfter: 17,
    });
    createServerRateLimitResponseMock.mockReturnValue(
      new Response(JSON.stringify({ code: "RATE_LIMIT_EXCEEDED" }), { status: 429 }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "not-json-and-never-parsed",
      }),
    );

    expect(response.status).toBe(429);
    expect(authMock).not.toHaveBeenCalled();
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });

});
