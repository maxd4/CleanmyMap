import { NextResponse } from "next/server";
import { createRateLimitedHandler } from "@/lib/rate-limit/api-wrapper";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { FUNDING_CATEGORIES } from "@/lib/funding/config";
import { fundingAggregateFromRows } from "@/lib/funding/public-aggregate";

export const runtime = "nodejs";

async function getAggregate() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("funding_public_aggregates")
    .select("category, net_amount_cents, currency, updated_at")
    .in("category", FUNDING_CATEGORIES);

  const payload = error ? null : fundingAggregateFromRows(data);
  if (!payload) {
    console.error("[Funding] Public aggregate unavailable", { message: error?.message ?? "Incomplete or invalid aggregate" });
    return NextResponse.json(
      { error: "Les montants collectés sont temporairement indisponibles." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    payload,
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}

export const GET = createRateLimitedHandler({ GET: getAggregate });
