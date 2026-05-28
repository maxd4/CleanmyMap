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

async function ensureRow(supabase: ReturnType<typeof getSupabaseServerClient>, userId: string) {
  const { data, error } = await supabase
    .from("user_badge_totals")
    .select("user_id, waste_kg, butts")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const insert = await supabase
    .from("user_badge_totals")
    .insert({ user_id: userId })
    .select("user_id, waste_kg, butts")
    .single();
  if (insert.error) throw insert.error;
  return insert.data;
}

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
    // We intentionally use service role here because the current RLS policy for
    // `user_badge_totals` may not allow inserts/updates; the API enforces ownership.
    const supabase = getSupabaseServerClient(true);
    const row = await ensureRow(supabase, userId);

    const payload: BadgeTotals = {
      wasteKg: Number(row.waste_kg ?? 0),
      butts: Number(row.butts ?? 0),
    };

    return NextResponse.json({ status: "ok", totals: payload });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/badges/:userId");
  }
}

