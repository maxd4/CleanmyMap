import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupabaseMock } from "./route.test.helpers";
import {
  clerkClientMock,
  createServerRateLimitResponseMock,
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  resetChatRouteMocks,
  reserveDiscussionMessageSlotMock,
  verifyRateLimitMock,
} from "./route.test.mocks";

vi.mock("@/lib/env", () => ({ env: { CLERK_IMU_OWNER_USER_ID: "owner-1" } }));

describe("POST /api/chat — bug_report routing", () => {
  beforeEach(() => {
    resetChatRouteMocks();
    verifyRateLimitMock.mockResolvedValue({ allowed: true });
    createServerRateLimitResponseMock.mockReturnValue(null);
    reserveDiscussionMessageSlotMock.mockResolvedValue({ allowed: true });
  });

  it("returns explicit unavailability and never writes when Clerk cannot verify the owner", async () => {
    const supabaseMock = buildSupabaseMock({
      profile: {
        id: "user-1",
        display_name: "Alex",
        handle: "alex",
        paris_arrondissement: null,
        role_label: "benevole",
        metadata: null,
      },
      messages: [],
      insertedMessage: {
        id: "unused",
        created_at: "2026-05-01T12:00:00.000Z",
        content: "unused",
        channel_type: "bug_report",
        sender_id: "user-1",
        recipient_id: null,
        arrondissement_id: null,
        zone_name: null,
      },
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);
    clerkClientMock.mockRejectedValue(new Error("Clerk unavailable"));

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channelType: "bug_report",
        content: "Le formulaire ne répond plus.",
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "Destinataire introuvable" });
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
    expect(supabaseMock.serviceRpc).not.toHaveBeenCalledWith(
      "send_feedback_private_reply",
      expect.anything(),
    );
  });
});
