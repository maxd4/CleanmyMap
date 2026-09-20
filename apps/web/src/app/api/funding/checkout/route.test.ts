import { describe, expect, it, vi } from "vitest";

const createSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit/api-wrapper", () => ({
  createRateLimitedHandler: (handlers: Record<string, unknown>) => Object.values(handlers)[0],
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    STRIPE_SECRET_KEY: "sk_test_local",
  },
}));
vi.mock("@/lib/services/stripe", () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: createSessionMock } } }),
}));

import { POST } from "./route";

const post = (body: string, headers?: HeadersInit) =>
  (POST as unknown as (request: Request) => Promise<Response>)(
    new Request("http://localhost/api/funding/checkout", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", ...headers },
    }),
  );

describe("POST /api/funding/checkout", () => {
  it("rejects an unknown target and an invalid amount", async () => {
    expect((await post(JSON.stringify({ category: "other", amountCents: 2500 }))).status).toBe(400);
    expect((await post(JSON.stringify({ category: "equipment", amountCents: 0 }))).status).toBe(400);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("rejects an excessive payload before calling Stripe", async () => {
    const response = await post(JSON.stringify({ category: "equipment", amountCents: 2500, extra: "x".repeat(10_000) }));
    expect(response.status).toBe(413);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("creates a server-side Checkout session for a supported category", async () => {
    createSessionMock.mockResolvedValueOnce({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" });

    const response = await post(JSON.stringify({ category: "development", amountCents: 2500 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_123" });
    expect(createSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: "payment",
      metadata: { funding_category: "development" },
      payment_intent_data: { metadata: { funding_category: "development" } },
      line_items: [expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 2500, currency: "eur" }) })],
    }));
  });
});
