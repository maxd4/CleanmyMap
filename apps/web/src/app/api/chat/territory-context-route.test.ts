import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupabaseMock, type ChatMessageRow } from "./route.test.helpers";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const rlsMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());
const verifyMock = vi.hoisted(() => vi.fn());
const rateResponseMock = vi.hoisted(() => vi.fn());
const reserveMock = vi.hoisted(() => vi.fn());
const notificationsMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ getSupabaseClerkRlsClient: rlsMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/rate-limit/server", () => ({ verifyRateLimit: verifyMock, createServerRateLimitResponse: rateResponseMock }));
vi.mock("@/lib/community/discussion-rate-limit", () => ({ reserveDiscussionMessageSlot: reserveMock, toDiscussionRateLimitErrorPayload: vi.fn() }));
vi.mock("@/lib/chat/chat-notifications", () => ({ createChatNotificationsForMessage: notificationsMock }));

describe("chat territory context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    identityMock.mockResolvedValue({ role: "member" });
    verifyMock.mockResolvedValue({ allowed: true, limit: 20, remaining: 19, reset: Date.now() + 60_000, retryAfter: 0 });
    rateResponseMock.mockReturnValue(null);
    reserveMock.mockResolvedValue({ allowed: true });
    notificationsMock.mockResolvedValue(undefined);
  });

  it("allows a member without a profile territory to read and write a chosen zone", async () => {
    const insertedMessage: ChatMessageRow = {
      id: "chosen-zone-message", created_at: "2026-05-01T12:00:00.000Z",
      content: "Message dans la zone choisie", channel_type: "territory", sender_id: "user-1",
      recipient_id: null, arrondissement_id: 15, zone_name: null,
    };
    const supabaseMock = buildSupabaseMock({
      profile: { id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null, role_label: "member", metadata: null },
      messages: [insertedMessage], insertedMessage,
    });
    rlsMock.mockResolvedValue(supabaseMock.supabase);
    serverMock.mockReturnValue(supabaseMock.serviceSupabase);

    const { GET, POST } = await import("./route");
    const readResponse = await GET(new Request("http://localhost/api/chat?channelType=territory&arrondissementId=15"));
    expect(readResponse.status).toBe(200);

    const writeResponse = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelType: "territory", arrondissementId: 15, content: "Message dans la zone choisie" }),
    }));
    expect(writeResponse.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(expect.objectContaining({ arrondissement_id: 15 }));
  });
});
