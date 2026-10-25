import { describe, expect, it, vi } from "vitest";
import {
  createActionShareRequest,
  respondToActionShareRequest,
} from "./action-share-requests";

const params = {
  senderId: "sender-1",
  recipientId: "recipient-1",
  actionId: "action-1",
  content: "Résultat à partager",
};

describe("action share request Supabase boundaries", () => {
  it("projects a validated creation row and preserves nullable fields", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ result: "cooldown", request_id: null, retry_after_seconds: 12 }],
      error: null,
    });

    await expect(createActionShareRequest({ rpc } as never, params)).resolves.toEqual({
      requestId: null,
      result: "cooldown",
      retryAfterSeconds: 12,
    });
  });

  it.each([
    { result: "unknown", request_id: "request-1", retry_after_seconds: null },
    { result: "created", request_id: 42, retry_after_seconds: null },
    { result: "created", request_id: null, retry_after_seconds: Number.NaN },
  ])("rejects an invalid creation projection: %j", async (row) => {
    const rpc = vi.fn().mockResolvedValue({ data: [row], error: null });

    await expect(createActionShareRequest({ rpc } as never, params)).rejects.toThrow(
      "La demande de partage n'a pas renvoyé un état valide.",
    );
  });

  it("projects a validated decision row without inventing identifiers", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ status: "accepted", message_id: null, action_id: "action-1", sender_id: "sender-1" }],
      error: null,
    });

    await expect(respondToActionShareRequest({ rpc } as never, {
      requestId: "request-1",
      recipientId: "recipient-1",
      decision: "accept",
    })).resolves.toEqual({
      status: "accepted",
      messageId: null,
      actionId: "action-1",
      senderId: "sender-1",
    });
  });

  it("rejects an invalid decision projection before returning a public DTO", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ status: "accepted", message_id: {}, action_id: null, sender_id: null }],
      error: null,
    });

    await expect(respondToActionShareRequest({ rpc } as never, {
      requestId: "request-1",
      recipientId: "recipient-1",
      decision: "accept",
    })).rejects.toThrow("La réponse à la demande de partage n'a pas renvoyé un état valide.");
  });

  it("keeps a Supabase business error as an Error", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "action_share_request_unavailable", code: "P0001" },
    });

    const error = await createActionShareRequest({ rpc } as never, params).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ message: "action_share_request_unavailable", code: "P0001" });
  });
});
