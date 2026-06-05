import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";

export const runtime = "nodejs";
export const revalidate = 300; // Cache 5 minutes

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Calculate funnel stages
    const stages = [
      { name: "total_users", label: "Utilisateurs totaux" },
      { name: "has_points", label: "Avec points gagnés" },
      { name: "first_badge", label: "Avec badge débloqué" },
      { name: "high_activity", label: "Activité soutenue (500+ pts)" },
    ];

    // Fetch user counts per stage
    const { count: totalUsers } = await supabase
      .from("user_points")
      .select("total_points", { count: "exact", head: true });

    const { count: usersWithPoints } = await supabase
      .from("user_points")
      .select("total_points", { count: "exact", head: true })
      .gt("total_points", 0);

    const { count: usersWithBadges } = await supabase
      .from("user_points")
      .select("total_points", { count: "exact", head: true })
      .gte("total_points", 10);

    const { count: usersHighActivity } = await supabase
      .from("user_points")
      .select("total_points", { count: "exact", head: true })
      .gte("total_points", 500);

    const counts = [
      totalUsers ?? 0,
      usersWithPoints ?? 0,
      usersWithBadges ?? 0,
      usersHighActivity ?? 0,
    ];

    const funnel = stages.map((stage, idx) => {
      const count = counts[idx];
      const conversion = idx === 0 ? 100 : (count / (counts[0] || 1)) * 100;
      return {
        ...stage,
        count,
        conversion: Math.round(conversion * 10) / 10,
      };
    });

    return NextResponse.json({
      status: "ok",
      funnel,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/analytics/funnel");
  }
}
