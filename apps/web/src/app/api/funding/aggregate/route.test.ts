import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
}));

vi.mock("@/lib/rate-limit/api-wrapper", async () =>
  (await import("@/app/api/test-helpers")).createRateLimitedHandlerModule(),
);
vi.mock("@/lib/supabase/server", async () =>
  (await import("@/app/api/test-helpers")).createSupabaseAdminModule(queryMock, ["from", "select"]),
);

import { GET } from "./route";

describe("GET /api/funding/aggregate", () => {
  it("returns only public category totals and no payment identity", async () => {
    queryMock.in.mockResolvedValueOnce({
      data: [
        { category: "equipment", net_amount_cents: 12500, currency: "eur" },
        { category: "development", net_amount_cents: 0, currency: "eur" },
      ],
      error: null,
    });

    const response = await (GET as unknown as (request: Request) => Promise<Response>)(new Request("http://localhost/api/funding/aggregate"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      currency: "eur",
      goal: null,
      categories: {
        equipment: { netAmountCents: 12500, currency: "eur" },
        development: { netAmountCents: 0, currency: "eur" },
      },
    });
    expect(JSON.stringify(payload)).not.toContain("stripe_");
    expect(JSON.stringify(payload)).not.toContain("email");
  });

  it("fails closed when the canonical aggregate is unavailable", async () => {
    queryMock.in.mockResolvedValueOnce({ data: null, error: { message: "missing table" } });
    expect((await (GET as unknown as (request: Request) => Promise<Response>)(new Request("http://localhost/api/funding/aggregate"))).status).toBe(503);
  });
});
