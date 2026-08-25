import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: getCurrentUserIdentityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

function assertResponse(response: Response | undefined): Response {
  if (!response) {
    throw new Error("Expected a route response");
  }
  return response;
}

describe("/api/chat/inbox", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "user-1" });
    getSupabaseClerkRlsClientMock.mockResolvedValue({ rpc: rpcMock });
  });

  it("returns normalized conversations from the RLS-scoped RPC", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          peer_id: "peer-1",
          peer_display_name: " Alex ",
          peer_handle: "alex",
          peer_avatar_url: null,
          last_message_id: "message-1",
          last_message_content: "Bonjour",
          last_message_created_at: "2026-08-25T12:00:00.000Z",
          last_message_sender_id: "peer-1",
          last_message_direction: "received",
          unread_count: "2",
        },
      ],
      error: null,
    });

    const { GET } = await import("./route");
    const response = assertResponse(await GET());
    const body = (await response.json()) as {
      conversations: Array<{
        peer: { id: string; display_name: string; handle: string };
        lastMessage: { direction: string };
        unreadCount: number;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.conversations[0]).toMatchObject({
      peer: { id: "peer-1", display_name: "Alex", handle: "alex" },
      lastMessage: { direction: "received" },
      unreadCount: 2,
    });
    expect(rpcMock).toHaveBeenCalledWith("list_my_dm_conversations");
  });

  it("marks only the requested peer through the idempotent read RPC", async () => {
    rpcMock.mockResolvedValue({
      data: "2026-08-25T12:00:00.000Z",
      error: null,
    });

    const { PATCH } = await import("./route");
    const response = assertResponse(await PATCH(
      new Request("http://localhost/api/chat/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: "peer-1" }),
      }),
    ));
    const body = (await response.json()) as { peerId: string; status: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ peerId: "peer-1", status: "read" });
    expect(rpcMock).toHaveBeenCalledWith("mark_my_dm_conversation_read", {
      p_peer_id: "peer-1",
    });
  });

  it("rejects an invalid read cursor target before contacting Supabase", async () => {
    const { PATCH } = await import("./route");
    const response = assertResponse(await PATCH(
      new Request("http://localhost/api/chat/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: "" }),
      }),
    ));

    expect(response.status).toBe(422);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
