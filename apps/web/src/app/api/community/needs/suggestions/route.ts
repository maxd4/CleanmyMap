import { NextResponse } from "next/server";

import { requireAuthenticatedAccess } from "@/lib/authz";
import { getCurrentUserTerritoryLocationPreference } from "@/lib/auth/user-territory";
import { parsePositiveInteger } from "@/lib/http/query-params";
import { listSuggestedActionNeeds } from "@/lib/community/action-needs-suggestions";
import { listCommunityHelperSkills } from "@/lib/community/helper-skills-service";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseServerClient(true);
    const skills = await listCommunityHelperSkills(supabase, access.userId);
    const limit = parsePositiveInteger(new URL(request.url).searchParams.get("limit"), 1, 50, 20);
    if (skills.length === 0) {
      return NextResponse.json({ status: "ok", items: [], limit });
    }
    const preference = await getCurrentUserTerritoryLocationPreference();
    const items = await listSuggestedActionNeeds(
      supabase,
      skills.map((skill) => skill.category),
      preference?.label ?? null,
      limit,
    );
    return NextResponse.json({ status: "ok", items, limit });
  } catch (error) {
    return handleApiError(error, "GET /api/community/needs/suggestions");
  }
}
