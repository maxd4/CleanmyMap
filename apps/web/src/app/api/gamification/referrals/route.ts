import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import {
  ensureReferralInviteForUser,
  loadReferralSummary,
} from "@/lib/gamification/referrals";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const summary = await loadReferralSummary(supabase, userId);
    return NextResponse.json({ status: "ok", summary });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/referrals");
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const result = await ensureReferralInviteForUser(supabase, userId);
    return NextResponse.json({
      status: "ok",
      created: result.created,
      summary: result.summary,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/referrals");
  }
}
