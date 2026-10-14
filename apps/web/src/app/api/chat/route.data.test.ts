import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  CLERK_IMU_OWNER_USER_ID: "owner-production",
}));
const clerkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/auth/role-resolution", () => ({
  isMaxRole: vi.fn(({ user, imuOwnerUserId }) =>
    user.id === imuOwnerUserId && user.publicMetadata?.role === "max",
  ),
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/clerk-rls", () => ({ getSupabaseClerkRlsClient: vi.fn() }));
vi.mock("@/lib/chat/chat-attachment-reading", () => ({
  resolveChatAttachmentUrls: vi.fn(),
}));
vi.mock("@/lib/chat/poll-votes", () => ({
  normalizeChatPollVoteSummaryRows: vi.fn(),
}));
vi.mock("@/lib/chat/polls", () => ({
  normalizeChatPollOptionLabels: vi.fn(),
}));
vi.mock("./route.shared", () => ({
  messageSelect: "*",
  normalizeChatMessageRow: vi.fn(),
  resolveChatAccessContext: vi.fn(),
}));

import { resolveBugReportRecipientId } from "./route.data";

describe("resolveBugReportRecipientId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.CLERK_IMU_OWNER_USER_ID = "owner-production";
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "owner-production",
          publicMetadata: { role: "max" },
        }),
      },
    });
  });

  it("routes only to the configured Clerk owner after canonical verification", async () => {
    await expect(resolveBugReportRecipientId()).resolves.toBe("owner-production");
    expect(clerkClientMock).toHaveBeenCalledOnce();
  });

  it("trims the configured owner and never substitutes a projected admin", async () => {
    envMock.CLERK_IMU_OWNER_USER_ID = "  owner-production  ";
    await expect(resolveBugReportRecipientId()).resolves.toBe("owner-production");
  });

  it("fails closed when the configured identity is not the canonical max owner", async () => {
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "owner-production",
          publicMetadata: { role: "admin" },
        }),
      },
    });

    await expect(resolveBugReportRecipientId()).resolves.toBeNull();
  });

  it("does not fall back to a projected admin when the owner is absent", async () => {
    envMock.CLERK_IMU_OWNER_USER_ID = "   ";
    await expect(resolveBugReportRecipientId()).resolves.toBeNull();
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("fails closed when Clerk cannot confirm the owner", async () => {
    clerkClientMock.mockRejectedValue(new Error("Clerk unavailable"));
    await expect(resolveBugReportRecipientId()).resolves.toBeNull();
  });
});
