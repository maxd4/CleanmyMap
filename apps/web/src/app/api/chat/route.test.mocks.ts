import { vi } from "vitest";

export const authMock = vi.fn();
export const clerkClientMock = vi.fn();
const getCurrentUserIdentityMock = vi.fn();
export const getSupabaseClerkRlsClientMock = vi.fn();
export const getSupabaseServerClientMock = vi.fn();
export const verifyRateLimitMock = vi.fn();
export const createServerRateLimitResponseMock = vi.fn();
export const reserveDiscussionMessageSlotMock = vi.fn();
export const toDiscussionRateLimitErrorPayloadMock = vi.fn();
export const createChatNotificationsForMessageMock = vi.fn();
export const resolveActionDiscussionAccessMock = vi.fn();
export const loadActionByIdMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

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
  toDiscussionRateLimitErrorPayload: toDiscussionRateLimitErrorPayloadMock,
}));

vi.mock("@/lib/chat/chat-notifications", () => ({
  createChatNotificationsForMessage: createChatNotificationsForMessageMock,
}));

vi.mock("@/lib/chat/action-conversations", () => ({
  resolveActionDiscussionAccess: resolveActionDiscussionAccessMock,
}));

vi.mock("@/lib/actions/store", () => ({
  loadActionById: loadActionByIdMock,
}));

export function resetChatRouteMocks() {
  vi.clearAllMocks();

  authMock.mockResolvedValue({ userId: "user-1" });
  clerkClientMock.mockResolvedValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        id: "owner-1",
        publicMetadata: { role: "max" },
      }),
    },
  });
  getCurrentUserIdentityMock.mockResolvedValue({ role: "member", activeRole: "benevole" });
  verifyRateLimitMock.mockResolvedValue({
    allowed: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 60_000,
    retryAfter: 0,
  });
  createServerRateLimitResponseMock.mockReturnValue(null);
  reserveDiscussionMessageSlotMock.mockResolvedValue({ allowed: true });
  toDiscussionRateLimitErrorPayloadMock.mockReturnValue({ error: "Quota de messagerie atteint" });
  createChatNotificationsForMessageMock.mockResolvedValue(undefined);
  resolveActionDiscussionAccessMock.mockResolvedValue({
    state: "allowed",
    conversationId: "conversation-1",
  });
}
