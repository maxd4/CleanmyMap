import { beforeEach, describe, expect, it, vi } from "vitest";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

const action = {
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2098-12-01T10:00:00.000Z",
  updated_at: "2098-12-01T10:00:00.000Z",
  created_by_clerk_id: "owner-1",
  actor_name: "Alex",
  action_date: "2099-01-01",
  location_label: "Berges de Seine",
  latitude: 48.85,
  longitude: 2.35,
  derived_geometry_kind: "polyline" as const,
  derived_geometry_geojson: '{"type":"LineString","coordinates":[[2.35,48.85],[2.36,48.86]]}',
  geometry_confidence: 0.9,
  geometry_source: "routed" as const,
  waste_kg: null,
  cigarette_butts: null,
  volunteers_count: 12,
  duration_minutes: 75,
  event_start_time: "10:00",
  event_end_time: "11:15",
  notes: null,
  status: "approved" as const,
  published_at: "2098-12-01T10:00:00.000Z",
  moderation_visibility: "visible" as const,
  action_phase: "pre_action" as const,
  preparation_data: {
    actionTitle: "Nettoyage des berges",
    plannedObjective: "nettoyage" as const,
    volunteerParticipation: {
      childrenCount: 2,
      adultCount: 8,
      retiredCount: 2,
      participantsCount: 12,
      effectiveVolunteerUnits: 10,
      effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
    },
    groupJoinEnabled: true,
  },
};

describe("GET /api/actions/[actionId]/public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });
  });

  it("returns only the current public action projection", async () => {
    loadActionByIdMock.mockResolvedValue(action);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/11111111-1111-4111-8111-111111111111/public"),
      { params: Promise.resolve({ actionId: action.id }) },
    );
    const body = (await response.json()) as { reference?: Record<string, unknown> };
    expect(response.status).toBe(200);
    expect(body.reference).toMatchObject({ id: action.id, title: "Nettoyage des berges" });
    expect(body.reference).not.toHaveProperty("preparationData");
    expect(body.reference).not.toHaveProperty("waste_kg");
  });

  it("returns a neutral HTTP absence for an unpublished or hidden action", async () => {
    loadActionByIdMock.mockResolvedValue({ ...action, published_at: null });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/11111111-1111-4111-8111-111111111111/public"),
      { params: Promise.resolve({ actionId: action.id }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Action indisponible" });
  });
});
