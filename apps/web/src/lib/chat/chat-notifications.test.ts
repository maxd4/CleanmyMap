import { describe, expect, it, vi } from "vitest";
import { createChatNotificationsForMessage } from "./chat-notifications";

describe("createChatNotificationsForMessage", () => {
  it("calls the server-only RPC with the authenticated actor", async () => {
    const rpc = vi.fn(async () => ({ data: 2, error: null }));
    const supabase = { rpc } as never;

    const count = await createChatNotificationsForMessage(supabase, "msg_123", "user_123");

    expect(rpc).toHaveBeenCalledWith("create_chat_notifications_for_message", {
      p_message_id: "msg_123",
      p_actor_user_id: "user_123",
    });
    expect(count).toBe(2);
  });

  it("throws when the RPC fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    const supabase = { rpc } as never;

    await expect(
      createChatNotificationsForMessage(supabase, "msg_123", "user_123"),
    ).rejects.toThrow("boom");
  });
});
