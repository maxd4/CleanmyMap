import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureReferralInviteForUser,
} from "@/lib/gamification/referrals";
import { fetchCachedReferralSummary } from "@/lib/gamification/referrals-cache";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const summary = await fetchCachedReferralSummary(userId);
    return NextResponse.json({ status: "ok", summary });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/referrals");
  }
}

export async function POST() {
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
