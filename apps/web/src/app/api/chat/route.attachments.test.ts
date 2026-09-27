import { beforeEach, describe, expect, it } from "vitest";
import { buildSupabaseMock, type ChatMessageRow } from "./route.test.helpers";
import {
  getSupabaseClerkRlsClientMock,
  getSupabaseServerClientMock,
  resetChatRouteMocks,
} from "./route.test.mocks";

async function postChatPayload(payload: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

function configureDmSupabase(insertedMessage: ChatMessageRow) {
  const supabaseMock = buildSupabaseMock({
    profile: {
      id: "user-1",
      display_name: "Alex",
      handle: "alex",
      paris_arrondissement: null,
      role_label: "member",
      metadata: null,
    },
    messages: [],
    insertedMessage,
    dmRows: [],
  });
  getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
  getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);
  return supabaseMock;
}

describe("POST /api/chat — pièces jointes DM", () => {
  beforeEach(() => {
    resetChatRouteMocks();
  });

  it.each([
    {
      name: "text-only",
      content: "Bonjour en privé",
      attachment: {} as {
        attachmentUrl?: string;
        attachmentPath?: string;
        attachmentType?: string;
        attachmentSize?: number;
      },
    },
    {
      name: "file-only",
      content: "",
      attachment: {
        attachmentUrl: "https://cdn.example.test/report.pdf",
        attachmentType: "application/pdf",
        attachmentSize: 4096,
      },
    },
    {
      name: "text-and-file",
      content: "Voici le document",
      attachment: {
        attachmentUrl: "https://cdn.example.test/report.pdf",
        attachmentType: "application/pdf",
        attachmentSize: 4096,
      },
    },
  ])("accepts a DM $name", async ({ content, attachment }) => {
    const insertedMessage: ChatMessageRow = {
      id: `dm-${content ? "text" : "file"}-42`,
      created_at: "2026-05-01T11:30:00.000Z",
      content,
      channel_type: "dm",
      sender_id: "user-1",
      recipient_id: "user-2",
      arrondissement_id: null,
      zone_name: null,
      attachment_url: attachment.attachmentUrl ?? null,
      attachment_type: attachment.attachmentType ?? null,
      poll_options: [],
    };
    const supabaseMock = configureDmSupabase(insertedMessage);

    const response = await postChatPayload({
      channelType: "dm",
      recipientId: "user-2",
      content,
      ...attachment,
    });

    expect(response.status).toBe(201);
    expect((await response.json()).status).toBe("sent");
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_type: "dm",
        recipient_id: "user-2",
        content,
        attachment_url: attachment.attachmentUrl,
        attachment_type: attachment.attachmentType,
      }),
    );
  }, 15000);

  it("rejects an empty standard DM without an attachment before any write", async () => {
    const response = await postChatPayload({
      channelType: "dm",
      recipientId: "user-2",
      content: "   ",
    });

    expect(response.status).toBe(422);
    expect((await response.json()).details.content).toContain(
      "Un message standard doit contenir du texte ou une pièce jointe valide.",
    );
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
  });

  it("persists a durable path and returns a fresh signed URL for a new attachment", async () => {
    const objectPath = "dm/user-1-report.pdf";
    const insertedMessage: ChatMessageRow = {
      id: "dm-path-42",
      created_at: "2026-05-01T11:30:00.000Z",
      content: "",
      channel_type: "dm",
      sender_id: "user-1",
      recipient_id: "user-2",
      arrondissement_id: null,
      zone_name: null,
      attachment_url: null,
      attachment_path: objectPath,
      attachment_type: "application/pdf",
      attachment_expires_at: null,
      poll_options: [],
    };
    const supabaseMock = configureDmSupabase(insertedMessage);

    const response = await postChatPayload({
      channelType: "dm",
      recipientId: "user-2",
      content: "",
      attachmentPath: objectPath,
      attachmentType: "application/pdf",
      attachmentSize: 4096,
    });

    expect(response.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment_url: null,
        attachment_path: objectPath,
        attachment_expires_at: null,
      }),
    );
    expect(supabaseMock.createSignedUrls).not.toHaveBeenCalled();
    expect((await response.json()).message).toEqual(
      expect.objectContaining({
        attachment_url: null,
      }),
    );
  });

  it("rejects a durable path owned by another sender before writing", async () => {
    const response = await postChatPayload({
      channelType: "dm",
      recipientId: "user-2",
      content: "",
      attachmentPath: "dm/user-2-private.pdf",
      attachmentType: "application/pdf",
      attachmentSize: 4096,
    });

    expect(response.status).toBe(422);
    expect((await response.json()).details.attachmentPath).toEqual(
      expect.arrayContaining([expect.stringContaining("n'appartient pas à votre upload Chat")]),
    );
    expect(getSupabaseClerkRlsClientMock).not.toHaveBeenCalled();
  });
});
