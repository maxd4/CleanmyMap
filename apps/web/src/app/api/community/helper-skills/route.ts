import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedAccess } from "@/lib/authz";
import { parseJsonBodyWithValidation, handleApiError } from "@/lib/http/api-errors";
import {
  COMMUNITY_HELP_CATEGORIES,
  type CommunityHelpCategory,
} from "@/lib/community/action-needs";
import {
  listCommunityHelperSkills,
  replaceCommunityHelperSkills,
} from "@/lib/community/helper-skills-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const categoriesSchema = z.object({
  categories: z
    .array(z.enum(COMMUNITY_HELP_CATEGORIES))
    .max(COMMUNITY_HELP_CATEGORIES.length)
    .refine((categories) => new Set(categories).size === categories.length, {
      message: "Les catégories ne peuvent pas être dupliquées.",
    }),
}).strict();

function categoriesFromRows(rows: Array<{ category: CommunityHelpCategory }>) {
  return rows.map((row) => row.category);
}

export async function GET() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await listCommunityHelperSkills(getSupabaseServerClient(true), access.userId);
    return NextResponse.json({ status: "ok", categories: categoriesFromRows(rows) });
  } catch (error) {
    return handleApiError(error, "GET /api/community/helper-skills");
  }
}

export async function PUT(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBodyWithValidation(request, categoriesSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const rows = await replaceCommunityHelperSkills(
      getSupabaseServerClient(true),
      access.userId,
      parsed.data.categories,
    );
    return NextResponse.json({ status: "updated", categories: categoriesFromRows(rows) });
  } catch (error) {
    return handleApiError(error, "PUT /api/community/helper-skills");
  }
}
