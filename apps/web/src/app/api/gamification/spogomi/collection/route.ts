import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadSpogomiCollectionForUser } from "@/lib/spogomi/recognition-service";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  try {
    // Justification Vercel: the private SPOGOMI collection changes after reconciliation and must not be cached.
    return NextResponse.json({ status: "ok", collection: await loadSpogomiCollectionForUser(getSupabaseServerClient(true), userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/spogomi/collection");
  }
}
