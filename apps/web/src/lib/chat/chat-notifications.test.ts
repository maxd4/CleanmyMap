import { describe, expect, it, vi } from "vitest";
import { createChatNotificationsForMessage } from "./chat-notifications";

describe("createChatNotificationsForMessage", () => {
  it("calls the RPC with the message id", async () => {
    const rpc = vi.fn(async () => ({ data: 2, error: null }));
    const supabase = { rpc } as never;

    const count = await createChatNotificationsForMessage(supabase, "msg_123");

    expect(rpc).toHaveBeenCalledWith("create_chat_notifications_for_message", {
      p_message_id: "msg_123",
    });
    expect(count).toBe(2);
  });

  it("throws when the RPC fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    const supabase = { rpc } as never;

    await expect(
      createChatNotificationsForMessage(supabase, "msg_123"),
    ).rejects.toThrow("boom");
  });
});
