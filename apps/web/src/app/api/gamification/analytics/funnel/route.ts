import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { loadGamificationFunnelCounts } from "@/lib/gamification/counters";

export const runtime = "nodejs";
// Justification Vercel: la métrique doit rester fraîche côté build, mais la réponse peut être cacheable au CDN.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const stages = [
      { name: "total_users", label: "Utilisateurs totaux" },
      { name: "has_points", label: "Avec points gagnés" },
      { name: "first_badge", label: "Avec badge débloqué" },
      { name: "high_activity", label: "Activité soutenue (500+ pts)" },
    ];
    const counts = await loadGamificationFunnelCounts(supabase);
    const stageCounts = [
      counts.totalUsers,
      counts.usersWithPoints,
      counts.usersWithBadges,
      counts.usersHighActivity,
    ];

    const funnel = stages.map((stage, idx) => {
      const count = stageCounts[idx];
      const conversion = idx === 0 ? 100 : (count / (stageCounts[0] || 1)) * 100;
      return {
        ...stage,
        count,
        conversion: Math.round(conversion * 10) / 10,
      };
    });

    return NextResponse.json({
      status: "ok",
      funnel,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/analytics/funnel");
  }
}
