import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type BadgeTotals = {
  wasteKg: number;
  butts: number;
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId: sessionUserId } = await auth();
  if (!sessionUserId) return unauthorizedJsonResponse();

  const { userId } = await ctx.params;
  if (!userId || userId !== sessionUserId) {
    return forbiddenJsonResponse({ hint: "Vous ne pouvez accéder qu'à vos propres badges." });
  }

  try {
    // The API enforces ownership; this endpoint must remain read-only.
    const supabase = getSupabaseServerClient(true);
    const { data: row, error } = await supabase
      .from("user_badge_totals")
      .select("user_id, waste_kg, butts")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    const payload: BadgeTotals = {
      wasteKg: Number(row?.waste_kg ?? 0),
      butts: Number(row?.butts ?? 0),
    };

    return NextResponse.json({ status: "ok", totals: payload });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/badges/:userId");
  }
}
