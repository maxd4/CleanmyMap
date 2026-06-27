import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const allowLocalFileStoreFallbackMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("service email events store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
  });

  it("writes service email events with created_at in supabase", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({
      insert: insertMock,
    });
    getSupabaseServerClientMock.mockReturnValue({
      from: fromMock,
    });

    const { appendServiceEmailEvent } = await import("./service-email-events-store");
    await appendServiceEmailEvent({
      at: "2026-05-31T08:00:00.000Z",
      provider: "resend",
      actorUserId: "user_123",
      recipientCount: 2,
      subject: "Daily quota test",
      status: "sent",
      messageId: "email_123",
      meta: { source: "test" },
    });

    expect(fromMock).toHaveBeenCalledWith("service_email_events");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        created_at: "2026-05-31T08:00:00.000Z",
        provider: "resend",
        actor_user_id: "user_123",
        recipient_count: 2,
        subject: "Daily quota test",
        status: "sent",
        message_id: "email_123",
        meta: { source: "test" },
      }),
    );
    expect(insertMock.mock.calls[0][0]).not.toHaveProperty("at");
  });

  it("counts sent events since a timestamp using created_at", async () => {
    const inMock = vi.fn().mockResolvedValue({
      error: null,
      count: 1,
    });
    const gteMock = vi.fn().mockReturnValue({
      in: inMock,
    });
    const eqMock = vi.fn().mockReturnValue({
      gte: gteMock,
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: eqMock,
    });
    const fromMock = vi.fn().mockReturnValue({
      select: selectMock,
    });
    getSupabaseServerClientMock.mockReturnValue({
      from: fromMock,
    });

    const { countServiceEmailEventsForActorSince } = await import("./service-email-events-store");
    const count = await countServiceEmailEventsForActorSince({
      actorUserId: "user_123",
      sinceIso: "2026-05-31T00:00:00.000Z",
    });

    expect(count).toBe(1);
    expect(fromMock).toHaveBeenCalledWith("service_email_events");
    expect(selectMock).toHaveBeenCalledWith("created_at", {
      count: "exact",
      head: true,
    });
    expect(eqMock).toHaveBeenCalledWith("actor_user_id", "user_123");
    expect(gteMock).toHaveBeenCalledWith("created_at", "2026-05-31T00:00:00.000Z");
    expect(inMock).toHaveBeenCalledWith("status", ["sent"]);
  });

  it("counts sent recipients since a timestamp using recipient_count", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      error: null,
      data: "5",
    });
    getSupabaseServerClientMock.mockReturnValue({
      rpc: rpcMock,
    });

    const { countServiceEmailRecipientsForActorSince } = await import("./service-email-events-store");
    const count = await countServiceEmailRecipientsForActorSince({
      actorUserId: "user_123",
      sinceIso: "2026-05-31T00:00:00.000Z",
    });

    expect(count).toBe(5);
    expect(rpcMock).toHaveBeenCalledWith(
      "sum_service_email_recipients_for_actor_since",
      {
        p_actor_user_id: "user_123",
        p_since: "2026-05-31T00:00:00.000Z",
        p_statuses: ["sent"],
      },
    );
  });
});
