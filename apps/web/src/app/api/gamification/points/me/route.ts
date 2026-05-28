import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const supabase = getSupabaseServerClient();
    
    // Fetch user's current points
    const { data, error } = await supabase
      .from("user_points")
      .select("total_points, earned_points, spent_points, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return handleApiError(error, "GET /api/gamification/points/me");
    }

    // Return default if no points record exists yet
    const points = data ?? {
      total_points: 0,
      earned_points: 0,
      spent_points: 0,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "ok",
      points,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/points/me");
  }
}
