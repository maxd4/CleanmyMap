import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.fn();
const enforceServerRateLimitForAuthenticatedUserMock = vi.fn();
const getSupabaseServerClientMock = vi.fn();
const loadPersonalEngagementProofProjectionMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: (...args: unknown[]) => requireActionRequestAccessMock(...args),
}));

vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimitForAuthenticatedUser: (...args: unknown[]) =>
    enforceServerRateLimitForAuthenticatedUserMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: (...args: unknown[]) => getSupabaseServerClientMock(...args),
}));

vi.mock("@/lib/actions/engagement-proof-projection", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/actions/engagement-proof-projection")>();
  return {
    ...actual,
    loadPersonalEngagementProofProjection: (...args: unknown[]) =>
      loadPersonalEngagementProofProjectionMock(...args),
  };
});

import { buildPersonalEngagementProofProjectionFromSources } from "@/lib/actions/engagement-proof-projection";
import { POST } from "./route";

describe("POST /api/account/engagement-proofs/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceServerRateLimitForAuthenticatedUserMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn() });
  });

  it("rejects unauthenticated requests with 401 and foreign userId with 403", async () => {
    requireActionRequestAccessMock.mockResolvedValueOnce({ ok: false });
    const unauth = await POST(
      new Request("http://localhost/api/account/engagement-proofs/export", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(unauth.status).toBe(401);

    requireActionRequestAccessMock.mockResolvedValueOnce({ ok: true, userId: "user-1" });
    const forbidden = await POST(
      new Request("http://localhost/api/account/engagement-proofs/export?userId=user-2", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers.get("Cache-Control")).toBe("private, no-store");
    expect(loadPersonalEngagementProofProjectionMock).not.toHaveBeenCalled();
  });

  it("validates payload dates and returns 503 when canonical proofs fail", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });

    const invalidDate = await POST(
      new Request("http://localhost/api/account/engagement-proofs/export", {
        method: "POST",
        body: JSON.stringify({ periodStart: "2026-06-10", periodEnd: "2026-05-01" }),
      }),
    );
    expect(invalidDate.status).toBe(422);

    loadPersonalEngagementProofProjectionMock.mockResolvedValueOnce({
      status: "error",
      errorReason: "supabase_timeout",
    });
    const unavailable = await POST(
      new Request("http://localhost/api/account/engagement-proofs/export", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("exports a private no-store Markdown attachment built from live canonical proofs", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    const liveProjection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      now: new Date("2026-07-15T12:00:00Z"),
      sources: {
        participantRows: [
          {
            id: "p-1",
            action_id: "action-1",
            user_id: "user-1",
            joined_at: "2026-05-10T17:00:00Z",
            participation_status: "confirmed",
            participation_source: "post_action_claim",
          },
        ],
        actions: [
          {
            id: "action-1",
            created_at: "2026-05-10T14:00:00Z",
            action_date: "2026-05-10",
            location_label: "Canal Saint-Martin",
            organizer_name: "Association Canal",
            organizer_type: "association",
            status: "approved",
            action_phase: "post_action_complete",
            published_at: "2026-05-10T16:00:00Z",
            moderation_visibility: "visible",
            access_mode: "public",
            data_provenance: "real",
          },
        ],
        roleAttestations: [],
        spogomiParticipants: [],
        spogomiEvents: [],
        spogomiAttestations: [],
      },
    });
    loadPersonalEngagementProofProjectionMock.mockResolvedValueOnce(liveProjection);

    const response = await POST(
      new Request("http://localhost/api/account/engagement-proofs/export", {
        method: "POST",
        body: JSON.stringify({
          holderName: "Camille Martin",
          selectedActionIds: ["action-1"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="dossier-benevolat-2026-07-15.md"',
    );
    const body = await response.text();
    expect(body).toContain("# Dossier personnel de bénévolat et d’engagement citoyen");
    expect(body).toContain("Camille Martin");
    expect(body).toContain("Canal Saint-Martin");
    expect(body).toContain("Association Canal");
  });
});
