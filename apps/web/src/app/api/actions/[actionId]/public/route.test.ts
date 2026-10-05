import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicAction } from "@/fixtures/public-action";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

const action = publicAction;

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
