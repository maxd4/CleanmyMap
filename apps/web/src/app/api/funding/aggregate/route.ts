import { NextResponse } from "next/server";
import { createRateLimitedHandler } from "@/lib/rate-limit/api-wrapper";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { FUNDING_CATEGORIES, type FundingCategory } from "@/lib/funding/config";

export const runtime = "nodejs";

type AggregateRow = {
  category: FundingCategory;
  net_amount_cents: number;
  currency: string;
};

async function getAggregate() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("funding_public_aggregates")
    .select("category, net_amount_cents, currency")
    .in("category", FUNDING_CATEGORIES);

  if (error) {
    console.error("[Funding] Public aggregate unavailable", { message: error.message });
    return NextResponse.json(
      { error: "Les montants collectés sont temporairement indisponibles." },
      { status: 503 },
    );
  }

  const amounts = Object.fromEntries(
    FUNDING_CATEGORIES.map((category) => [category, { netAmountCents: 0, currency: "eur" }]),
  ) as Record<FundingCategory, { netAmountCents: number; currency: string }>;

  for (const row of (data ?? []) as AggregateRow[]) {
    if (!FUNDING_CATEGORIES.includes(row.category)) continue;
    amounts[row.category] = {
      netAmountCents: Math.max(0, Number(row.net_amount_cents) || 0),
      currency: row.currency.toLowerCase(),
    };
  }

  return NextResponse.json(
    { currency: "eur", categories: amounts, goal: null },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}

export const GET = createRateLimitedHandler({ GET: getAggregate });
