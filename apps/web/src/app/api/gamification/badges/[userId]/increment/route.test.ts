import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

// Mock progression and config to avoid heavy top-level logic during imports
vi.mock("@/lib/gamification/progression", () => ({
  getUserProgression: () => Promise.resolve({ currentLevel: 0 }),
}));
vi.mock("@/config/gamification.config", () => ({
  BADGE_MAX_COUNTER: 1000000,
  ACTIVE_RULES: {
    minLevelForInfiniteXp: 999999,
    wasteMilestoneStepKg: 1,
    buttsMilestoneStepCount: 1,
    calculateWasteXp: (n: number) => 0,
    calculateButtsXp: (n: number) => 0,
    version: "test",
  },
}));

describe("POST /api/gamification/badges/:userId/increment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "dechets", amount: 10 }),
      }),
      { params: Promise.resolve({ userId: "user-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 422 on invalid body", async () => {
    authMock.mockResolvedValue({ userId: "user-1" });
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "dechets", amount: -1 }),
      }),
      { params: Promise.resolve({ userId: "user-1" }) },
    );
    expect(res.status).toBe(422);
  });

  it("increments waste total when row exists", async () => {
    authMock.mockResolvedValue({ userId: "user-1" });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-1", waste_kg: 5, butts: 0 },
      error: null,
    });
    const updateSingle = vi.fn().mockResolvedValue({
      data: { waste_kg: 15, butts: 0 },
      error: null,
    });

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "user_badge_totals") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle,
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: updateSingle,
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(),
              })),
            })),
          };
        }
        if (table === "progression_events") {
          return {
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
          };
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
      }),
    };
    getSupabaseServerClientMock.mockReturnValue(supabaseMock);

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "dechets", amount: 10 }),
      }),
      { params: Promise.resolve({ userId: "user-1" }) },
    );
    const body = (await res.json()) as {
      status?: string;
      totals?: { wasteKg: number; butts: number };
    };

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.totals).toEqual({ wasteKg: 15, butts: 0 });
  });
});

