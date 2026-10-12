import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPublishedSpogomiEventResultsBySlug } from "@/lib/spogomi/public-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ eventSlug: string }> }) {
  try {
    const results = await loadPublishedSpogomiEventResultsBySlug((await context.params).eventSlug, getSupabaseServerClient(true));
    if (!results) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.public.results");
  }
}
