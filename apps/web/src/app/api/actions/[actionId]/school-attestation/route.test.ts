import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadActionById: vi.fn(),
  loadCanonicalActionOrganizerIdsForAction: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadActionById }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: mocks.loadCanonicalActionOrganizerIdsForAction,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));

import { GET } from "./route";

const ACTION_ID = "00000000-0000-4000-8000-000000000001";

function buildAction(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTION_ID,
    created_at: "2026-10-29T10:00:00.000Z",
    created_by_clerk_id: "organizer-1",
    actor_name: "Do not expose",
    action_date: "2026-10-29",
    location_label: "Cour de test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 2,
    cigarette_butts: null,
    volunteers_count: 3,
    duration_minutes: 60,
    notes: "Observation interne",
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {},
    published_at: "2026-10-29T12:00:00.000Z",
    moderation_visibility: "visible",
    access_mode: "public",
    organizer_type: "association",
    organizer_id: "org-1",
    action_context: "school",
    school_context_confirmed: true,
    school_context_confirmed_by_clerk_id: "organizer-1",
    ...overrides,
  };
}

describe("GET /api/actions/[actionId]/school-attestation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({});
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue(["organizer-1"]);
  });

  it("returns only the bounded public attestation", async () => {
    mocks.loadActionById.mockResolvedValue(buildAction());

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ actionId: ACTION_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.attestation.status).toBe("eligible");
    expect(payload.attestation).not.toHaveProperty("actor_name");
    expect(JSON.stringify(payload)).not.toContain("Do not expose");
  });

  it("does not expose unpublished, private, or unconfirmed actions", async () => {
    for (const overrides of [
      { access_mode: "invite_link" },
      { published_at: null },
      { moderation_visibility: "hidden" },
      { status: "rejected" },
      { status: "cancelled" },
      { action_phase: "pre_action" },
      { action_context: "citizen" },
      { school_context_confirmed_by_clerk_id: "unrelated-user" },
      { school_context_confirmed: false },
    ]) {
      mocks.loadActionById.mockResolvedValue(buildAction(overrides));
      const response = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ actionId: ACTION_ID }),
      });
      expect(response.status).toBe(404);
    }
  });
});
