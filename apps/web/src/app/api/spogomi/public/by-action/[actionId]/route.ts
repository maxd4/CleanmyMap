import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPublishedSpogomiEventForAction } from "@/lib/spogomi/public-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ actionId: string }> }) {
  try {
    const actionId = (await context.params).actionId.trim();
    if (!actionId) return NextResponse.json({ event: null });
    const event = await loadPublishedSpogomiEventForAction(actionId, getSupabaseServerClient(true));
    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error, "spogomi.public.by-action");
  }
}
