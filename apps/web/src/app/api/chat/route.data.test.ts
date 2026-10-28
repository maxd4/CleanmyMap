import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  CLERK_IMU_OWNER_USER_ID: "owner-production",
}));
const clerkClientMock = vi.hoisted(() => vi.fn());
const resolveChatAttachmentUrlsMock = vi.hoisted(() => vi.fn());
const normalizeChatPollVoteSummaryRowsMock = vi.hoisted(() => vi.fn(() => []));
const normalizeChatPollOptionLabelsMock = vi.hoisted(() => vi.fn((options: readonly string[]) => options));
const normalizeChatMessageRowMock = vi.hoisted(() => vi.fn((row) => row));

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
  resolveChatAttachmentUrls: resolveChatAttachmentUrlsMock,
}));
vi.mock("@/lib/chat/poll-votes", () => ({
  normalizeChatPollVoteSummaryRows: normalizeChatPollVoteSummaryRowsMock,
}));
vi.mock("@/lib/chat/polls", () => ({
  normalizeChatPollOptionLabels: normalizeChatPollOptionLabelsMock,
}));
vi.mock("./route.shared", async () => {
  const actual = await vi.importActual<typeof import("./route.shared")>("./route.shared");
  return {
    ...actual,
    messageSelect: "*",
    normalizeChatMessageRow: normalizeChatMessageRowMock,
    resolveChatAccessContext: vi.fn(),
  };
});

import {
  enrichPollVoteSummaries,
  hasExistingDmConversation,
  loadCurrentProfile,
  loadMessageById,
  loadRelatedCommunityEvent,
  pollCtx,
  pollOpts,
  resolveBugReportRecipientId,
  runMessageQuery,
} from "./route.data";

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

describe("chat data loaders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds poll RPC arguments and rejects a failed message query", async () => {
    expect(pollOpts(undefined)).toEqual({ p_option_labels: [] });
    expect(pollCtx("recipient", "conversation", 11, "Paris 11e")).toEqual({
      p_recipient_id: "recipient",
      p_conversation_id: "conversation",
      p_arrondissement_id: 11,
      p_zone_name: "Paris 11e",
    });
    await expect(runMessageQuery(Promise.resolve({ data: [], error: { message: "message query failed" } }) as never)).rejects.toMatchObject({ message: "message query failed" });
    await expect(runMessageQuery(Promise.resolve({ data: [{ invalid: true }], error: null }) as never)).rejects.toThrow("réponse des messages du Chat est invalide");
  });

  it("loads valid profile and related event rows and preserves absent rows", async () => {
    const profile = {
      id: "user-1",
      display_name: "Alex",
      handle: "alex",
      paris_arrondissement: 11,
      role_label: "member",
      metadata: null,
    };
    const event = { id: "event-1", title: "Nettoyage", event_date: "2026-10-28", location_label: "Paris" };
    const profileQuery = { select: vi.fn(() => profileQuery), eq: vi.fn(() => profileQuery), maybeSingle: vi.fn(async () => ({ data: profile, error: null })) };
    const eventQuery = { select: vi.fn(() => eventQuery), eq: vi.fn(() => eventQuery), maybeSingle: vi.fn(async () => ({ data: event, error: null })) };
    const supabase = { from: vi.fn((table: string) => table === "profiles" ? profileQuery : eventQuery) };

    await expect(loadCurrentProfile(supabase as never, "user-1")).resolves.toEqual(profile);
    await expect(loadRelatedCommunityEvent(supabase as never, "event-1")).resolves.toEqual(event);
    eventQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null } as never);
    await expect(loadRelatedCommunityEvent(supabase as never, "missing")).resolves.toBeNull();
  });

  it("fails closed on malformed profile/event and DM RPC responses", async () => {
    const invalidSingle = {
      select: vi.fn(() => invalidSingle),
      eq: vi.fn(() => invalidSingle),
      maybeSingle: vi.fn(async () => ({ data: { unexpected: true }, error: null })),
    };
    const invalidSupabase = { from: vi.fn(() => invalidSingle) };
    await expect(loadCurrentProfile(invalidSupabase as never, "user-1")).rejects.toThrow("profil Chat est invalide");
    await expect(loadRelatedCommunityEvent(invalidSupabase as never, "event-1")).rejects.toThrow("événement communautaire est invalide");

    const dmError = { rpc: vi.fn(async () => ({ data: null, error: { message: "dm rpc failed" } })) };
    await expect(hasExistingDmConversation(dmError as never, "peer-1")).rejects.toMatchObject({ message: "dm rpc failed" });
    const dmInvalid = { rpc: vi.fn(async () => ({ data: { invalid: true }, error: null })) };
    await expect(hasExistingDmConversation(dmInvalid as never, "peer-1")).rejects.toThrow("conversations DM est invalide");
    const dmRows = { rpc: vi.fn(async () => ({ data: [{ peer_id: "peer-1" }, { peer_id: "peer-2" }], error: null })) };
    await expect(hasExistingDmConversation(dmRows as never, "peer-2")).resolves.toBe(true);
    await expect(hasExistingDmConversation(dmRows as never, "peer-3")).resolves.toBe(false);
  });

  it("returns no message for an absent targeted row without attempting enrichment", async () => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: null, error: null })) };
    const supabase = { from: vi.fn(() => query) };
    await expect(loadMessageById(supabase as never, supabase as never, "user-1", "missing")).resolves.toBeNull();
  });

  it("maps loader dependency failures and handles polls with no visible rows", async () => {
    const errorQuery = {
      select: vi.fn(() => errorQuery),
      eq: vi.fn(() => errorQuery),
      maybeSingle: vi.fn(async () => ({ data: null, error: { message: "profile read failed" } })),
    };
    const errorSupabase = { from: vi.fn(() => errorQuery) };
    await expect(loadCurrentProfile(errorSupabase as never, "user-1")).rejects.toMatchObject({ message: "profile read failed" });
    await expect(loadRelatedCommunityEvent(errorSupabase as never, "event-1")).rejects.toMatchObject({ message: "profile read failed" });
    await expect(loadMessageById(errorSupabase as never, errorSupabase as never, "user-1", "message-1")).rejects.toMatchObject({ message: "profile read failed" });

    const pollRow = {
      id: "poll-1",
      message_kind: "poll",
      poll_options: [{ id: "yes", position: 1, label: "Oui" }],
      related_event_id: null,
    };
    resolveChatAttachmentUrlsMock.mockResolvedValueOnce([pollRow]);
    const visibleQuery = {
      select: vi.fn(() => visibleQuery),
      in: vi.fn(() => visibleQuery),
      eq: vi.fn(() => visibleQuery),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    const rls = { from: vi.fn(() => visibleQuery) };
    const service = { rpc: vi.fn() };
    await expect(enrichPollVoteSummaries(rls as never, service as never, "user-1", [pollRow] as never))
      .resolves.toEqual([pollRow]);
    expect(service.rpc).not.toHaveBeenCalled();

    const invalidRowsQuery = {
      select: vi.fn(() => invalidRowsQuery),
      in: vi.fn(() => invalidRowsQuery),
      eq: vi.fn(() => invalidRowsQuery),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ invalid: true }], error: null }).then(resolve),
    };
    resolveChatAttachmentUrlsMock.mockResolvedValueOnce([pollRow]);
    await expect(enrichPollVoteSummaries({ from: vi.fn(() => invalidRowsQuery) } as never, service as never, "user-1", [pollRow] as never))
      .rejects.toThrow("sondages visibles est invalide");
  });

  it("enriches visible polls, leaves unmatched options at zero and preserves related-event absence", async () => {
    const pollRow = {
      id: "poll-1",
      message_kind: "poll",
      poll_options: [{ id: "yes", position: 1, label: "Oui" }, { id: "no", position: 2, label: "Non" }],
      related_event_id: null,
    };
    const ordinaryRow = { id: "ordinary", message_kind: "text", related_event_id: null };
    resolveChatAttachmentUrlsMock.mockResolvedValueOnce([pollRow, ordinaryRow]);
    normalizeChatPollVoteSummaryRowsMock.mockReturnValueOnce([{
      messageId: "poll-1",
      options: [{ optionId: "yes", voteCount: 2 }],
      totalVotes: 2,
      selectedOptionId: "yes",
    }] as never);
    const visibleQuery = {
      select: vi.fn(() => visibleQuery),
      in: vi.fn(() => visibleQuery),
      eq: vi.fn(() => visibleQuery),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: "poll-1" }], error: null }).then(resolve),
    };
    const rls = { from: vi.fn(() => visibleQuery) };
    const service = { rpc: vi.fn(async () => ({ data: [{ message_id: "poll-1" }], error: null })) };
    const enriched = await enrichPollVoteSummaries(rls as never, service as never, "user-1", [pollRow, ordinaryRow] as never);
    expect(enriched[0]).toMatchObject({ totalVotes: 2, selectedOptionId: "yes" });
    expect(enriched[0]?.poll_options).toEqual([
      { id: "yes", position: 1, label: "Oui", voteCount: 2 },
      { id: "no", position: 2, label: "Non", voteCount: 0 },
    ]);
    expect(enriched[1]).toEqual(ordinaryRow);
    expect(service.rpc).toHaveBeenCalledWith("get_my_chat_poll_vote_summaries", {
      p_message_ids: ["poll-1"],
      p_user_id: "user-1",
    });
  });

  it("fails closed on visible-poll RPC and related-event responses", async () => {
    const pollRow = { id: "poll-1", message_kind: "poll", poll_options: [], related_event_id: null };
    resolveChatAttachmentUrlsMock.mockResolvedValueOnce([pollRow]);
    const visibleQuery = {
      select: vi.fn(() => visibleQuery), in: vi.fn(() => visibleQuery), eq: vi.fn(() => visibleQuery),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: "poll-1" }], error: null }).then(resolve),
    };
    await expect(enrichPollVoteSummaries(
      { from: vi.fn(() => visibleQuery) } as never,
      { rpc: vi.fn(async () => ({ data: null, error: { message: "poll summary failed" } })) } as never,
      "user-1",
      [pollRow] as never,
    )).rejects.toMatchObject({ message: "poll summary failed" });

    const relatedRow = { id: "message-1", message_kind: "text", related_event_id: "event-1" };
    resolveChatAttachmentUrlsMock.mockResolvedValueOnce([relatedRow]);
    const eventQuery = { select: vi.fn(() => eventQuery), in: vi.fn(() => eventQuery), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ invalid: true }], error: null }).then(resolve) };
    await expect(enrichPollVoteSummaries({ from: vi.fn(() => eventQuery) } as never, { from: vi.fn(() => eventQuery) } as never, "user-1", [relatedRow] as never))
      .rejects.toThrow("réponse des événements communautaires est invalide");
  });
});
