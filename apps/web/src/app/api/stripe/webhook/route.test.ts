import { describe, expect, it, vi } from "vitest";

const constructEventMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "stripe-signature": "sig_test" }),
}));
vi.mock("@/lib/env", () => ({
  env: { STRIPE_SECRET_KEY: "sk_test_local", STRIPE_WEBHOOK_SECRET: "whsec_test" },
}));
vi.mock("@/lib/services/stripe", () => ({
  getStripeClient: () => ({ webhooks: { constructEvent: constructEventMock } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({ rpc: rpcMock }),
}));

import { POST } from "./route";

const post = () => POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));

describe("POST /api/stripe/webhook", () => {
  it("rejects an invalid signature or payload", async () => {
    constructEventMock.mockImplementationOnce(() => { throw new Error("bad signature"); });
    const response = await post();
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("delegates a paid Checkout event to the idempotent funding RPC", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      created: 1_750_000_000,
      data: {
        object: {
          id: "cs_test_1",
          payment_status: "paid",
          amount_total: 2500,
          currency: "eur",
          payment_intent: "pi_test_1",
          metadata: { funding_category: "equipment" },
        },
      },
    });
    rpcMock.mockResolvedValueOnce({ error: null });

    const response = await post();
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("apply_funding_checkout", expect.objectContaining({
      p_event_id: "evt_checkout_1",
      p_session_id: "cs_test_1",
      p_payment_intent_id: "pi_test_1",
      p_category: "equipment",
      p_amount_total_cents: 2500,
    }));
  });

  it("delegates the absolute refunded amount so replay cannot double subtract", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_refund_1",
      type: "charge.refunded",
      created: 1_750_000_000,
      data: { object: { payment_intent: "pi_test_1", amount_refunded: 2500, currency: "eur" } },
    });
    rpcMock.mockResolvedValueOnce({ error: null });

    const response = await post();
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("apply_funding_refund", expect.objectContaining({
      p_event_id: "evt_refund_1",
      p_payment_intent_id: "pi_test_1",
      p_amount_refunded_cents: 2500,
    }));
  });
});
