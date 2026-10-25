import { NextRequest, NextResponse } from "next/server";
import { createRateLimitedHandler } from "@/lib/rate-limit/api-wrapper";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isValidCheckoutSessionId(value: string | null): value is string {
  return Boolean(value && /^cs_[A-Za-z0-9_]+$/.test(value) && value.length <= 255);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFundingRow(value: unknown): value is { category: string; status: "paid" | "partially_refunded" | "refunded" } {
  return isRecord(value) && typeof value.category === "string" && (value.status === "paid" || value.status === "partially_refunded" || value.status === "refunded");
}

async function getCheckoutStatus(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!isValidCheckoutSessionId(sessionId)) {
    return NextResponse.json({ error: "Session Checkout invalide." }, { status: 400 });
  }

  const rawResult: unknown = await getSupabaseAdminClient()
    .from("funding_contributions")
    .select("category, status")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!isRecord(rawResult) || !("data" in rawResult) || !("error" in rawResult)) {
    console.error("[Funding] Checkout status unavailable", { message: "invalid Supabase response" });
    return NextResponse.json({ error: "La confirmation est temporairement indisponible." }, { status: 503 });
  }

  if (rawResult.error) {
    console.error("[Funding] Checkout status unavailable", { message: isRecord(rawResult.error) && typeof rawResult.error.message === "string" ? rawResult.error.message : "Supabase error" });
    return NextResponse.json({ error: "La confirmation est temporairement indisponible." }, { status: 503 });
  }

  if (rawResult.data === null) {
    return NextResponse.json({ confirmed: false, state: "pending" });
  }

  if (!isFundingRow(rawResult.data)) {
    return NextResponse.json({ error: "La confirmation est temporairement indisponible." }, { status: 503 });
  }

  return NextResponse.json({
    confirmed: rawResult.data.status === "paid" || rawResult.data.status === "partially_refunded" || rawResult.data.status === "refunded",
    state: rawResult.data.status,
    category: rawResult.data.category,
  });
}

export const GET = createRateLimitedHandler({ GET: getCheckoutStatus });
