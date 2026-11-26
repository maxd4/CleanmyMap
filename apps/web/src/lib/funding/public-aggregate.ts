import { FUNDING_CATEGORIES, isFundingCategory, type FundingCategory } from "./config";

export type FundingAggregateResponse = {
  currency: "eur";
  categories: Record<FundingCategory, { netAmountCents: number; currency: "eur" }>;
  goal: null;
  updatedAt: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function validCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function latestIsoTimestamp(values: unknown[]): string | null {
  let latestMs = -Infinity;
  let latestIso: string | null = null;
  for (const value of values) {
    const iso = validIsoTimestamp(value);
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (ms > latestMs) {
      latestMs = ms;
      latestIso = iso;
    }
  }
  return latestIso;
}

/** Missing or malformed totals must not be represented as a confirmed zero. */
export function parseFundingAggregate(value: unknown): FundingAggregateResponse | null {
  const body = record(value);
  const categories = record(body?.categories);
  if (body?.currency !== "eur" || !categories || Object.keys(categories).length !== FUNDING_CATEGORIES.length) return null;
  if (body.updatedAt !== undefined && body.updatedAt !== null && validIsoTimestamp(body.updatedAt) === null) return null;
  const result = {} as FundingAggregateResponse["categories"];
  let total = 0;
  for (const category of FUNDING_CATEGORIES) {
    const row = record(categories[category]);
    if (row?.currency !== "eur" || !validCents(row.netAmountCents)) return null;
    total += row.netAmountCents;
    result[category] = { currency: "eur", netAmountCents: row.netAmountCents };
  }
  if (!Number.isSafeInteger(total)) return null;
  return { currency: "eur", categories: result, goal: null, updatedAt: validIsoTimestamp(body.updatedAt) };
}

/** The table is seeded with both categories. Absence is a failed read, not zero. */
export function fundingAggregateFromRows(value: unknown): FundingAggregateResponse | null {
  if (!Array.isArray(value) || value.length !== FUNDING_CATEGORIES.length) return null;
  const categories: Record<string, unknown> = {};
  const timestamps: unknown[] = [];
  for (const item of value) {
    const row = record(item);
    if (!row || !isFundingCategory(row.category) || Object.hasOwn(categories, row.category)) return null;
    const raw = row.net_amount_cents;
    const cents = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
    categories[row.category] = { currency: row.currency, netAmountCents: cents };
    timestamps.push(row.updated_at);
  }
  return parseFundingAggregate({
    currency: "eur",
    categories,
    goal: null,
    updatedAt: latestIsoTimestamp(timestamps),
  });
}

export type FundingReturnState = "pending" | "paid" | "partially_refunded" | "refunded" | "unavailable";

export function parseFundingReturn(value: unknown): FundingReturnState {
  const body = record(value);
  if (body?.confirmed === false && body.state === "pending") return "pending";
  if (body?.confirmed === true && (body.state === "paid" || body.state === "partially_refunded" || body.state === "refunded")) return body.state;
  return "unavailable";
}
