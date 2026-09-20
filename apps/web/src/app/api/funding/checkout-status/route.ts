import { NextRequest, NextResponse } from "next/server";
import { createRateLimitedHandler } from "@/lib/rate-limit/api-wrapper";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isValidCheckoutSessionId(value: string | null): value is string {
  return Boolean(value && /^cs_[A-Za-z0-9_]+$/.test(value) && value.length <= 255);
}

async function getCheckoutStatus(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!isValidCheckoutSessionId(sessionId)) {
    return NextResponse.json({ error: "Session Checkout invalide." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("funding_contributions")
    .select("category, status")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[Funding] Checkout status unavailable", { message: error.message });
    return NextResponse.json({ error: "La confirmation est temporairement indisponible." }, { status: 503 });
  }

  if (!data) {
    return NextResponse.json({ confirmed: false, state: "pending" });
  }

  return NextResponse.json({
    confirmed: data.status === "paid" || data.status === "partially_refunded" || data.status === "refunded",
    state: data.status,
    category: data.category,
  });
}

export const GET = createRateLimitedHandler({ GET: getCheckoutStatus });
