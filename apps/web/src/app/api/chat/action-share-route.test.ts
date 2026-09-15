import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupabaseMock } from "./route.test.helpers";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const rlsMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());
const verifyMock = vi.hoisted(() => vi.fn());
const rateResponseMock = vi.hoisted(() => vi.fn());
const reserveMock = vi.hoisted(() => vi.fn());
const notificationsMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ getSupabaseClerkRlsClient: rlsMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/rate-limit/server", () => ({ verifyRateLimit: verifyMock, createServerRateLimitResponse: rateResponseMock }));
vi.mock("@/lib/community/discussion-rate-limit", () => ({ reserveDiscussionMessageSlot: reserveMock, toDiscussionRateLimitErrorPayload: vi.fn() }));
vi.mock("@/lib/chat/chat-notifications", () => ({ createChatNotificationsForMessage: notificationsMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));

function futureAction(id: string) {
  return {
    id,
    action_date: "2099-01-01",
    event_start_time: "10:00",
    action_phase: "pre_action",
    status: "approved",
    moderation_visibility: "visible",
    published_at: "2098-12-01T10:00:00.000Z",
  };
}

describe("POST /api/chat action shares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    identityMock.mockResolvedValue({ role: "member" });
    verifyMock.mockResolvedValue({ allowed: true, limit: 20, remaining: 19, reset: Date.now() + 60_000, retryAfter: 0 });
    rateResponseMock.mockReturnValue(null);
    reserveMock.mockResolvedValue({ allowed: true });
    notificationsMock.mockResolvedValue(undefined);
    loadActionMock.mockResolvedValue(null);
  });

  it("persists only action_id and uses normal chat notification fan-out", async () => {
    const actionId = "11111111-1111-4111-8111-111111111111";
    loadActionMock.mockResolvedValue(futureAction(actionId));
    const supabaseMock = buildSupabaseMock({
      profile: { id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null, role_label: "member", metadata: null },
      messages: [],
      insertedMessage: { id: "shared-1", created_at: "2098-12-01T10:00:00.000Z", content: "Partage", channel_type: "community", sender_id: "user-1", recipient_id: null, arrondissement_id: null, zone_name: null, action_id: actionId },
    });
    rlsMock.mockResolvedValue(supabaseMock.supabase);
    serverMock.mockReturnValue(supabaseMock.serviceSupabase);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ channelType: "community", actionId, content: "Partage" }) }));
    expect(response.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(expect.objectContaining({ action_id: actionId, channel_type: "community" }));
    expect(notificationsMock).toHaveBeenCalledWith(supabaseMock.serviceSupabase, "shared-1");
  });

  it("refuses an unavailable action before writing", async () => {
    const supabaseMock = buildSupabaseMock({
      profile: { id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null, role_label: "member", metadata: null },
      messages: [],
      insertedMessage: { id: "unused", created_at: "2098-12-01T10:00:00.000Z", content: "unused", channel_type: "community", sender_id: "user-1", recipient_id: null, arrondissement_id: null, zone_name: null },
    });
    rlsMock.mockResolvedValue(supabaseMock.supabase);
    serverMock.mockReturnValue(supabaseMock.serviceSupabase);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ channelType: "community", actionId: "22222222-2222-4222-8222-222222222222", content: "Partage" }) }));
    expect(response.status).toBe(403);
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
  });

  it("creates a first-contact request when the DM does not exist", async () => {
    const actionId = "33333333-3333-4333-8333-333333333333";
    loadActionMock.mockResolvedValue(futureAction(actionId));
    const supabaseMock = buildSupabaseMock({
      profile: { id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null, role_label: "member", metadata: null },
      messages: [],
      insertedMessage: { id: "unused", created_at: "2098-12-01T10:00:00.000Z", content: "unused", channel_type: "dm", sender_id: "user-1", recipient_id: "user-2", arrondissement_id: null, zone_name: null },
      dmRows: [],
    });
    rlsMock.mockResolvedValue(supabaseMock.supabase);
    const requestRpc = vi.fn().mockResolvedValue({
      data: [{ request_id: "request-1", result: "created", retry_after_seconds: null }],
      error: null,
    });
    serverMock.mockReturnValue({ ...supabaseMock.serviceSupabase, rpc: requestRpc });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ channelType: "dm", recipientId: "user-2", actionId, content: "Partage forcé" }) }));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ status: "request_pending", requestId: "request-1" });
    expect(requestRpc).toHaveBeenCalledWith("create_action_share_request", {
      p_sender_id: "user-1",
      p_recipient_id: "user-2",
      p_action_id: actionId,
      p_content: "Partage forcé",
    });
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
  });

  it("shares an approved completed action in an existing DM", async () => {
    const actionId = "44444444-4444-4444-8444-444444444444";
    loadActionMock.mockResolvedValue({ ...futureAction(actionId), action_phase: "post_action_complete", action_date: "2020-01-01" });
    const supabaseMock = buildSupabaseMock({
      profile: { id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: null, role_label: "member", metadata: null },
      messages: [],
      insertedMessage: { id: "shared-past", created_at: "2098-12-01T10:00:00.000Z", content: "Résultat", channel_type: "dm", sender_id: "user-1", recipient_id: "user-2", arrondissement_id: null, zone_name: null, action_id: actionId },
      dmRows: [{ peer_id: "user-2", peer_display_name: "Sam", peer_handle: "sam" }],
    });
    rlsMock.mockResolvedValue(supabaseMock.supabase);
    serverMock.mockReturnValue(supabaseMock.serviceSupabase);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ channelType: "dm", recipientId: "user-2", actionId, content: "Résultat" }) }));
    expect(response.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).toHaveBeenCalledWith(expect.objectContaining({ action_id: actionId, recipient_id: "user-2" }));
  });
});
