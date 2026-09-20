import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const queryMock = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/rate-limit/api-wrapper", () => ({
  createRateLimitedHandler: (handlers: Record<string, unknown>) => Object.values(handlers)[0],
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({
    from: queryMock.from.mockReturnThis(),
    select: queryMock.select.mockReturnThis(),
    eq: queryMock.eq.mockReturnThis(),
    maybeSingle: queryMock.maybeSingle,
  }),
}));

import { GET } from "./route";

const get = (sessionId: string) =>
  (GET as unknown as (request: NextRequest) => Promise<Response>)(new NextRequest(`http://localhost/api/funding/checkout-status?session_id=${sessionId}`));

describe("GET /api/funding/checkout-status", () => {
  it("rejects a forged or malformed Checkout session id", async () => {
    expect((await get("not-a-session")).status).toBe(400);
  });

  it("keeps the success return pending until the webhook projection exists", async () => {
    queryMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await get("cs_test_123");
    expect(await response.json()).toEqual({ confirmed: false, state: "pending" });
  });

  it("reports the backend-confirmed state without exposing PII", async () => {
    queryMock.maybeSingle.mockResolvedValueOnce({ data: { category: "equipment", status: "paid" }, error: null });
    const response = await get("cs_test_123");
    expect(await response.json()).toEqual({ confirmed: true, state: "paid", category: "equipment" });
  });
});
