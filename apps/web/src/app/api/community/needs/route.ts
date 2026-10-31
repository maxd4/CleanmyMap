import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  handleApiError,
  parseJsonBodyWithValidation,
  validationErrorResponse,
} from "@/lib/http/api-errors";
import { parsePositiveInteger } from "@/lib/http/query-params";
import {
  ACTION_NEED_STATUSES,
  COMMUNITY_HELP_CATEGORIES,
} from "@/lib/community/action-needs";
import {
  listActionNeeds,
  canManageActionNeed,
  toActionNeedItemForContext,
  ACTION_NEED_SELECT_FIELDS,
} from "@/lib/community/action-needs-service";
import { loadActionById } from "@/lib/actions/store";

export const runtime = "nodejs";
// Vercel contract: need reads and mutations require a dynamic authorization-aware response.
export const dynamic = "force-dynamic";

const actionIdSchema = z.string().uuid();
const categorySchema = z.enum(COMMUNITY_HELP_CATEGORIES);
const effectiveStatusSchema = z.enum([...ACTION_NEED_STATUSES, "expired"] as const);
const titleSchema = z.string().trim().min(3).max(80);
const descriptionSchema = z.string().trim().min(1).max(500);
const quantityLabelSchema = z.string().trim().max(80).nullable().optional();
const expiresAtSchema = z.string().datetime({ offset: true }).nullable().optional();

const createSchema = z.object({
  actionId: actionIdSchema,
  category: categorySchema,
  title: titleSchema,
  description: descriptionSchema,
  quantityLabel: quantityLabelSchema,
  expiresAt: expiresAtSchema,
}).strict();

function isUuid(value: string): boolean {
  return actionIdSchema.safeParse(value).success;
}

function forbiddenResponse() {
  return NextResponse.json({ error: "Vous n'avez pas accès à ce besoin.", kind: "permission" }, { status: 403 });
}

export async function GET(request: Request) {
  const { userId } = await getSafeAuthSession();
  const url = new URL(request.url);
  const actionIdValue = url.searchParams.get("actionId")?.trim() || null;
  if (actionIdValue && !isUuid(actionIdValue)) {
    return validationErrorResponse({ actionId: ["Identifiant d'action invalide."] });
  }

  const categoryValue = url.searchParams.get("category")?.trim() || null;
  const category = categoryValue ? categorySchema.safeParse(categoryValue) : null;
  if (categoryValue && !category?.success) {
    return validationErrorResponse({ category: ["Catégorie de besoin invalide."] });
  }

  const effectiveStatusValue = url.searchParams.get("effectiveStatus")?.trim() || null;
  const effectiveStatus = effectiveStatusValue ? effectiveStatusSchema.safeParse(effectiveStatusValue) : null;
  if (effectiveStatusValue && !effectiveStatus?.success) {
    return validationErrorResponse({ effectiveStatus: ["Statut de besoin invalide."] });
  }

  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 50, 20);
  const offset = parsePositiveInteger(url.searchParams.get("offset"), 0, 1000, 0);

  try {
    const result = await listActionNeeds(getSupabaseServerClient(true), userId, {
      actionId: actionIdValue,
      category: category?.success ? category.data : null,
      effectiveStatus: effectiveStatus?.success ? effectiveStatus.data : null,
      limit,
      offset,
    });
    return NextResponse.json(
      { status: "ok", ...result },
      {
        headers: {
          // Vercel contract: authenticated need reads are private/no-store; anonymous previews may be short-lived public cache.
          "Cache-Control": userId ? "private, no-store" : "public, max-age=15, stale-while-revalidate=30",
          Vary: "Cookie",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/community/needs");
  }
}

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = await parseJsonBodyWithValidation(request, createSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const supabase = getSupabaseServerClient(true);
    const action = await loadActionById(supabase, parsed.data.actionId);
    if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    if (!(await canManageActionNeed(supabase, access.userId, action))) return forbiddenResponse();

    const inserted = await supabase
      .from("action_needs")
      .insert({
        action_id: parsed.data.actionId,
        created_by_clerk_id: access.userId,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        quantity_label: parsed.data.quantityLabel ?? null,
        expires_at: parsed.data.expiresAt ?? null,
      })
      .select(ACTION_NEED_SELECT_FIELDS)
      .single();
    if (inserted.error) throw inserted.error;

    return NextResponse.json({
      status: "created",
      item: toActionNeedItemForContext(inserted.data, action, true),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/community/needs");
  }
}
