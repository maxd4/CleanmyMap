import { FUNDING_CATEGORIES, isFundingCategory, type FundingCategory } from "./config";

export type FundingAggregateResponse = {
  currency: "eur";
  categories: Record<FundingCategory, { netAmountCents: number; currency: "eur" }>;
  goal: null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function validCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Missing or malformed totals must not be represented as a confirmed zero. */
export function parseFundingAggregate(value: unknown): FundingAggregateResponse | null {
  const body = record(value);
  const categories = record(body?.categories);
  if (body?.currency !== "eur" || !categories || Object.keys(categories).length !== FUNDING_CATEGORIES.length) return null;
  const result = {} as FundingAggregateResponse["categories"];
  let total = 0;
  for (const category of FUNDING_CATEGORIES) {
    const row = record(categories[category]);
    if (row?.currency !== "eur" || !validCents(row.netAmountCents)) return null;
    total += row.netAmountCents;
    result[category] = { currency: "eur", netAmountCents: row.netAmountCents };
  }
  if (!Number.isSafeInteger(total)) return null;
  return { currency: "eur", categories: result, goal: null };
}

/** The table is seeded with both categories. Absence is a failed read, not zero. */
export function fundingAggregateFromRows(value: unknown): FundingAggregateResponse | null {
  if (!Array.isArray(value) || value.length !== FUNDING_CATEGORIES.length) return null;
  const categories: Record<string, unknown> = {};
  for (const item of value) {
    const row = record(item);
    if (!row || !isFundingCategory(row.category) || Object.hasOwn(categories, row.category)) return null;
    const raw = row.net_amount_cents;
    const cents = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
    categories[row.category] = { currency: row.currency, netAmountCents: cents };
  }
  return parseFundingAggregate({ currency: "eur", categories, goal: null });
}

export type FundingReturnState = "pending" | "paid" | "partially_refunded" | "refunded" | "unavailable";

export function parseFundingReturn(value: unknown): FundingReturnState {
  const body = record(value);
  if (body?.confirmed === false && body.state === "pending") return "pending";
  if (body?.confirmed === true && (body.state === "paid" || body.state === "partially_refunded" || body.state === "refunded")) return body.state;
  return "unavailable";
}
