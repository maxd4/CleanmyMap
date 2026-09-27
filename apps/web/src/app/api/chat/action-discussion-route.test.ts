import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChatNotificationsForMessageMock,
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  reserveDiscussionMessageSlotMock,
  resetChatRouteMocks,
  resolveActionDiscussionAccessMock,
} from "./route.test.mocks";

describe("POST /api/chat action discussion authorization", () => {
  beforeEach(() => {
    resetChatRouteMocks();
    getSupabaseClerkRlsClientMock.mockResolvedValue({});
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn() });
  });

  it("refuses a message when the participation is not confirmed", async () => {
    resolveActionDiscussionAccessMock.mockResolvedValueOnce({
      state: "forbidden",
      conversationId: "conversation-1",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: "action",
          actionId: "33333333-3333-4333-8333-333333333333",
          content: "Je ne devrais pas pouvoir écrire",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(reserveDiscussionMessageSlotMock).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });
});
