import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const serverMock = vi.hoisted(() => vi.fn());
const loadActionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));

const action = {
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-01T10:00:00.000Z",
  created_by_clerk_id: "sender-1",
  actor_name: "Collectif",
  action_date: "2020-01-01",
  location_label: "Berges de Seine",
  latitude: 48.85,
  longitude: 2.35,
  derived_geometry_kind: null,
  derived_geometry_geojson: null,
  geometry_confidence: null,
  geometry_source: null,
  waste_kg: 12,
  cigarette_butts: 3,
  volunteers_count: 4,
  duration_minutes: 60,
  event_start_time: null,
  event_end_time: null,
  notes: null,
  status: "approved" as const,
  moderation_visibility: "visible" as const,
  published_at: "2026-09-01T10:00:00.000Z",
  action_phase: "post_action_complete" as const,
  preparation_data: {},
};

describe("/api/chat/contact-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "recipient-1" });
    identityMock.mockResolvedValue({ userId: "recipient-1", activeRole: "benevole" });
    loadActionMock.mockResolvedValue(action);
  });

  it("returns only the public action projection for a pending request", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        request_id: "request-1",
        created_at: "2026-09-14T10:00:00.000Z",
        sender_id: "sender-1",
        sender_display_name: "Alex",
        sender_handle: "alex",
        sender_avatar_url: null,
        action_id: action.id,
        content: "Voici le résultat.",
      }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.requests[0]).toMatchObject({
      id: "request-1",
      sender: { id: "sender-1", display_name: "Alex", handle: "alex" },
      action: { id: action.id, shareKind: "result" },
    });
    expect(body.requests[0].action).not.toHaveProperty("waste_kg");
    expect(rpc).toHaveBeenCalledWith("list_action_share_requests_for_recipient", {
      p_recipient_id: "recipient-1",
    });
  });

  it.each(["accept", "reject", "ignore"] as const)("passes %s through the recipient-only decision RPC", async (decision) => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ status: decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "ignored", message_id: null, action_id: action.id, sender_id: "sender-1" }],
      error: null,
    });
    serverMock.mockReturnValue({ rpc });

    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/chat/contact-requests", {
      method: "PATCH",
      body: JSON.stringify({ requestId: "11111111-1111-4111-8111-111111111111", decision }),
    }));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("respond_action_share_request", {
      p_request_id: "11111111-1111-4111-8111-111111111111",
      p_recipient_id: "recipient-1",
      p_decision: decision,
    });
  });
});
