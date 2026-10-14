import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupabaseMock } from "./route.test.helpers";
import {
  clerkClientMock,
  createChatNotificationsForMessageMock,
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

  it("persists through the server client to the confirmed Clerk owner", async () => {
    const insertedMessage = {
      id: "bug-report-1",
      created_at: "2026-05-01T12:00:00.000Z",
      content: "Le formulaire ne répond plus.",
      channel_type: "bug_report",
      sender_id: "user-1",
      recipient_id: "owner-1",
      arrondissement_id: null,
      zone_name: null,
    };
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
      insertedMessage,
    });
    const serverInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: insertedMessage, error: null }),
      })),
    }));
    const serverFrom = vi.fn((table: string) =>
      table === "app_messages"
        ? { insert: serverInsert }
        : supabaseMock.supabase.from(table),
    );
    supabaseMock.serviceSupabase.from = serverFrom as typeof supabaseMock.serviceSupabase.from;
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channelType: "bug_report",
        content: "Le formulaire ne répond plus.",
        recipientId: "spoofed-recipient",
        senderId: "spoofed-sender",
      }),
    }));

    expect(response.status).toBe(201);
    expect(serverInsert).toHaveBeenCalledWith(expect.objectContaining({
      sender_id: "user-1",
      recipient_id: "owner-1",
      channel_type: "bug_report",
    }));
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).toHaveBeenCalledWith(
      supabaseMock.serviceSupabase,
      "bug-report-1",
      "user-1",
    );
  });

  it("refuses before persistence when Clerk confirms a non-max owner", async () => {
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
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "owner-1",
          publicMetadata: { role: "admin" },
        }),
      },
    });
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
    getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelType: "bug_report", content: "refusé" }),
    }));

    expect(response.status).toBe(503);
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
  });
});
