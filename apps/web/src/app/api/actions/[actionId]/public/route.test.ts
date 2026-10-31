import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicAction } from "@/fixtures/public-action";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
const fetchActionsMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock, fetchActions: fetchActionsMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

const action = publicAction;

describe("GET /api/actions/[actionId]/public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActionsMock.mockResolvedValue([]);
    getSupabaseServerClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
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

  it("adds only derived public recommendations to a completed action", async () => {
    const completed = {
      ...action,
      id: "completed-action",
      action_date: "2020-01-01",
      location_label: "11e arrondissement",
      department_code: "75",
      department_name: "Paris",
      action_phase: "post_action_complete" as const,
    };
    const candidate = {
      ...action,
      id: "future-action",
      action_date: "2099-01-02",
      location_label: "11e arrondissement",
      department_code: "75",
      department_name: "Paris",
    };
    loadActionByIdMock.mockResolvedValue(completed);
    fetchActionsMock.mockResolvedValue([candidate]);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/completed-action/public"),
      { params: Promise.resolve({ actionId: completed.id }) },
    );
    const body = (await response.json()) as { reference?: { recommendations?: Array<{ id: string }> } };
    expect(response.status).toBe(200);
    expect(body.reference?.recommendations).toEqual([{ id: "future-action", title: "Nettoyage des berges", actionDate: "2099-01-02", eventStartTime: "10:00", sector: "11e arrondissement" }]);
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
