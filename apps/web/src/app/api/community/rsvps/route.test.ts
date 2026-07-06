import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const trackCommunityRsvpYesMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/gamification/progression", () => ({
  trackCommunityRsvpYes: trackCommunityRsvpYesMock,
}));

describe("POST /api/community/rsvps", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  it("keeps SQLi-like event identifiers as data and returns a sanitized error", async () => {
    const upsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "XX000",
            message: 'syntax error at or near "\'"',
          },
        }),
      })),
    }));

    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    });

    const { POST } = await import("./route");
    const eventId = "' OR '1'='1";
    const response = await POST(
      new Request("http://localhost/api/community/rsvps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId,
          status: "yes",
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
    };

    expect(response.status).toBe(500);
    expect(body.error).toBe(
      "Une erreur est survenue de notre côté. Réessayez dans quelques instants.",
    );
    expect(body.kind).toBe("server");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: eventId,
        participant_clerk_id: "user-1",
        status: "yes",
      }),
      expect.objectContaining({ onConflict: "event_id,participant_clerk_id" }),
    );
  }, 10000);
});
