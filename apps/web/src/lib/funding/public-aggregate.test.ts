import { describe, expect, it } from "vitest";
import { fundingAggregateFromRows, parseFundingAggregate, parseFundingReturn } from "./public-aggregate";

const rows = [
  { category: "equipment", net_amount_cents: 0, currency: "eur", updated_at: "2026-11-20T10:00:00Z" },
  { category: "development", net_amount_cents: 1250, currency: "eur", updated_at: "2026-11-26T12:30:00.000Z" },
];

describe("public funding amounts", () => {
  it("preserves explicit zero, latest updatedAt, and exact cents without importing other data", () => {
    const result = fundingAggregateFromRows([{ ...rows[0], private_id: "sentinel" }, rows[1]]);
    expect(result).toEqual({
      currency: "eur",
      goal: null,
      updatedAt: "2026-11-26T12:30:00.000Z",
      categories: { equipment: { netAmountCents: 0, currency: "eur" }, development: { netAmountCents: 1250, currency: "eur" } },
    });
    expect(JSON.stringify(result)).not.toContain("sentinel");
    expect(parseFundingAggregate(result)).toEqual(result);
    expect(fundingAggregateFromRows([{ ...rows[0], net_amount_cents: "0" }, rows[1]])).toEqual(result);
    expect(fundingAggregateFromRows([
      { category: "equipment", net_amount_cents: 0, currency: "eur" },
      { category: "development", net_amount_cents: 0, currency: "eur" },
    ])?.updatedAt).toBeNull();
  });

  it.each([null, [], [rows[0]], [rows[0], rows[0]], [rows[0], { ...rows[1], currency: "usd" }], [rows[0], { ...rows[1], net_amount_cents: -1 }], [rows[0], { ...rows[1], net_amount_cents: " " }], [rows[0], { ...rows[1], net_amount_cents: 1.5 }]].map(value => ({ value })))("rejects incomplete or invalid source $value", ({ value }) => {
    expect(fundingAggregateFromRows(value)).toBeNull();
  });

  it("rejects an unsafe sum and an incomplete HTTP response", () => {
    expect(fundingAggregateFromRows([{ ...rows[0], net_amount_cents: Number.MAX_SAFE_INTEGER }, rows[1]])).toBeNull();
    expect(parseFundingAggregate({ currency: "eur", categories: { equipment: { netAmountCents: 0, currency: "eur" } } })).toBeNull();
  });

  it("does not confuse pending, paid, refunded, or malformed checkout responses", () => {
    expect(parseFundingReturn({ confirmed: false, state: "pending" })).toBe("pending");
    expect(parseFundingReturn({ confirmed: true, state: "paid" })).toBe("paid");
    expect(parseFundingReturn({ confirmed: true, state: "partially_refunded" })).toBe("partially_refunded");
    expect(parseFundingReturn({ confirmed: true, state: "refunded" })).toBe("refunded");
    expect(parseFundingReturn({ confirmed: true })).toBe("unavailable");
    expect(parseFundingReturn({ confirmed: false, state: "paid" })).toBe("unavailable");
  });
});
