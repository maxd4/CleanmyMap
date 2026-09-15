import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSupabaseMock,
  type ChatMessageRow,
} from "./route.test.helpers";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const reserveDiscussionMessageSlotMock = vi.hoisted(() => vi.fn());
const createChatNotificationsForMessageMock = vi.hoisted(() => vi.fn());
const getCommunityBugReportByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));
vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));
vi.mock("@/lib/community/discussion-rate-limit", () => ({
  reserveDiscussionMessageSlot: reserveDiscussionMessageSlotMock,
  toDiscussionRateLimitErrorPayload: vi.fn(),
}));
vi.mock("@/lib/chat/chat-notifications", () => ({
  createChatNotificationsForMessage: createChatNotificationsForMessageMock,
}));
vi.mock("@/lib/community/bug-reports-store", () => ({
  getCommunityBugReportById: getCommunityBugReportByIdMock,
}));

const feedbackId = "11111111-1111-4111-8111-111111111111";
const operationId = "22222222-2222-4222-8222-222222222222";

function buildFeedbackMessage(): ChatMessageRow {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    created_at: "2026-09-15T12:00:00.000Z",
    content: "Bonjour",
    channel_type: "dm",
    sender_id: "admin-1",
    recipient_id: "user-2",
    arrondissement_id: null,
    zone_name: null,
    message_kind: "message",
    poll_options: [],
  };
}

function configureFeedbackRoute(options: {
  activeRole?: string;
  submittedByUserId?: string;
  rpc?: ReturnType<typeof vi.fn>;
}) {
  const supabaseMock = buildSupabaseMock({
    profile: {
      id: "admin-1",
      display_name: "Admin",
      handle: "admin",
      paris_arrondissement: null,
      role_label: "admin",
      metadata: null,
    },
    messages: [],
    insertedMessage: buildFeedbackMessage(),
  });

  authMock.mockResolvedValue({ userId: "admin-1" });
  getCurrentUserIdentityMock.mockResolvedValue({
    role: options.activeRole ?? "admin",
    activeRole: options.activeRole ?? "admin",
  });
  getCommunityBugReportByIdMock.mockResolvedValue({
    id: feedbackId,
    submittedByUserId: options.submittedByUserId ?? "user-2",
    creatorState: "new",
  });
  getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock.supabase);
  getSupabaseServerClientMock.mockReturnValue(supabaseMock.serviceSupabase);
  if (options.rpc) {
    supabaseMock.serviceRpc.mockImplementation(options.rpc as never);
  } else {
    supabaseMock.serviceRpc.mockResolvedValue({
      data: { already_processed: false, message: buildFeedbackMessage() },
      error: null,
    } as never);
  }

  return supabaseMock;
}

function feedbackRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      channelType: "dm",
      recipientId: "user-2",
      feedbackId,
      operationId,
      content: "Bonjour",
      ...overrides,
    }),
  });
}

describe("POST /api/chat — réponse privée à un feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      role: "admin",
      activeRole: "admin",
    });
    verifyRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
      retryAfter: 0,
    });
    createServerRateLimitResponseMock.mockReturnValue(null);
    reserveDiscussionMessageSlotMock.mockResolvedValue({ allowed: true });
    createChatNotificationsForMessageMock.mockResolvedValue(undefined);
  });

  it("délègue la réponse complète à la RPC atomique avec la cible canonique", async () => {
    const supabaseMock = configureFeedbackRoute({});
    const { POST } = await import("./route");

    const response = await POST(feedbackRequest());

    expect(response.status).toBe(201);
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
    expect(supabaseMock.serviceRpc).toHaveBeenCalledWith(
      "send_feedback_private_reply",
      expect.objectContaining({
        p_operation_id: operationId,
        p_actor_user_id: "admin-1",
        p_feedback_id: feedbackId,
        p_recipient_id: "user-2",
        p_content: "Bonjour",
      }),
    );
  });

  it("refuse un non-admin avant l'appel de la RPC", async () => {
    const supabaseMock = configureFeedbackRoute({ activeRole: "elu" });
    const { POST } = await import("./route");

    const response = await POST(feedbackRequest());

    expect(response.status).toBe(403);
    expect(supabaseMock.serviceRpc).not.toHaveBeenCalled();
  });

  it("refuse un feedback sans auteur canonique", async () => {
    const supabaseMock = configureFeedbackRoute({ submittedByUserId: "unknown" });
    const { POST } = await import("./route");

    const response = await POST(feedbackRequest());

    expect(response.status).toBe(403);
    expect(supabaseMock.serviceRpc).not.toHaveBeenCalled();
  });

  it("refuse un destinataire spoofé avant toute écriture", async () => {
    const supabaseMock = configureFeedbackRoute({});
    const { POST } = await import("./route");

    const response = await POST(feedbackRequest({ recipientId: "user-3" }));

    expect(response.status).toBe(403);
    expect(supabaseMock.serviceRpc).not.toHaveBeenCalled();
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
  });

  it("rejoue une operationId sans créer de second DM ni second audit", async () => {
    let persisted = false;
    let messageInsertCount = 0;
    let auditInsertCount = 0;
    const message = buildFeedbackMessage();
    const supabaseMock = configureFeedbackRoute({
      rpc: vi.fn(async (_name: string, args: { p_operation_id: string }) => {
        if (persisted) {
          expect(args.p_operation_id).toBe(operationId);
          return { data: { already_processed: true, message }, error: null };
        }
        persisted = true;
        messageInsertCount += 1;
        auditInsertCount += 1;
        return { data: { already_processed: false, message }, error: null };
      }),
    });
    const { POST } = await import("./route");

    expect((await POST(feedbackRequest())).status).toBe(201);
    expect((await POST(feedbackRequest())).status).toBe(201);
    expect(supabaseMock.serviceRpc).toHaveBeenCalledTimes(2);
    expect(messageInsertCount).toBe(1);
    expect(auditInsertCount).toBe(1);
  });

  it("ne laisse pas la route poursuivre après une erreur transactionnelle", async () => {
    const supabaseMock = configureFeedbackRoute({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "atomic transaction failed" },
      }),
    });
    const { POST } = await import("./route");

    const response = await POST(feedbackRequest());

    expect(response.status).toBe(500);
    expect(supabaseMock.appMessagesTable.insert).not.toHaveBeenCalled();
    expect(createChatNotificationsForMessageMock).not.toHaveBeenCalled();
  });

  it("considère les notifications comme best-effort après la transaction", async () => {
    configureFeedbackRoute({});
    createChatNotificationsForMessageMock.mockRejectedValueOnce(
      new Error("notification unavailable"),
    );
    const { POST } = await import("./route");

    const response = await POST(feedbackRequest());

    expect(response.status).toBe(201);
  });
});
