import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  CLERK_IMU_OWNER_USER_ID: "owner-production",
}));

vi.mock("@/lib/env", () => ({ env: envMock }));
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

function createProfilesSupabase(result: {
  data: { id: string } | null;
  error: Error | null;
}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  return {
    from: vi.fn(() => query),
    query,
  };
}

describe("resolveBugReportRecipientId", () => {
  beforeEach(() => {
    envMock.CLERK_IMU_OWNER_USER_ID = "owner-production";
  });

  it("routes to the configured owner without consulting a projected profile", async () => {
    const supabase = createProfilesSupabase({ data: { id: "stale-admin" }, error: null });

    await expect(
      resolveBugReportRecipientId(supabase as never, "sender-user", "benevole"),
    ).resolves.toBe("owner-production");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("trims the configured owner and never substitutes the sender", async () => {
    envMock.CLERK_IMU_OWNER_USER_ID = "  owner-production  ";
    const supabase = createProfilesSupabase({ data: { id: "stale-admin" }, error: null });

    await expect(
      resolveBugReportRecipientId(supabase as never, "sender-user", "admin"),
    ).resolves.toBe("owner-production");

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("uses the most recently updated Supabase admin only when the owner is absent", async () => {
    envMock.CLERK_IMU_OWNER_USER_ID = "   ";
    const supabase = createProfilesSupabase({ data: { id: "projected-admin" }, error: null });

    await expect(
      resolveBugReportRecipientId(supabase as never, "sender-user", "benevole"),
    ).resolves.toBe("projected-admin");

    expect(supabase.query.eq).toHaveBeenCalledWith("role_label", "admin");
    expect(supabase.query.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(supabase.query.limit).toHaveBeenCalledWith(1);
  });

  it("fails closed for a regular sender when neither owner nor projected admin exists", async () => {
    envMock.CLERK_IMU_OWNER_USER_ID = "";
    const supabase = createProfilesSupabase({ data: null, error: null });

    await expect(
      resolveBugReportRecipientId(supabase as never, "sender-user", "benevole"),
    ).resolves.toBeNull();
  });
});
