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

function parseNeedsActionId(url: URL): string | Response | null {
  const value = url.searchParams.get("actionId")?.trim() || null;
  return value && !isUuid(value)
    ? validationErrorResponse({ actionId: ["Identifiant d'action invalide."] })
    : value;
}

function parseNeedsCategory(url: URL): typeof COMMUNITY_HELP_CATEGORIES[number] | Response | null {
  const value = url.searchParams.get("category")?.trim() || null;
  if (!value) return null;
  const parsed = categorySchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : validationErrorResponse({ category: ["Catégorie de besoin invalide."] });
}

function parseNeedsStatus(url: URL): (typeof ACTION_NEED_STATUSES[number] | "expired") | Response | null {
  const value = url.searchParams.get("effectiveStatus")?.trim() || null;
  if (!value) return null;
  const parsed = effectiveStatusSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : validationErrorResponse({ effectiveStatus: ["Statut de besoin invalide."] });
}

function parseNeedsQuery(url: URL):
  | { ok: true; value: { actionId: string | null; category: typeof COMMUNITY_HELP_CATEGORIES[number] | null; effectiveStatus: (typeof ACTION_NEED_STATUSES[number] | "expired") | null; limit: number; offset: number } }
  | { ok: false; response: Response } {
  const actionId = parseNeedsActionId(url);
  const category = parseNeedsCategory(url);
  const effectiveStatus = parseNeedsStatus(url);
  for (const value of [actionId, category, effectiveStatus]) {
    if (value instanceof Response) return { ok: false, response: value };
  }
  const actionIdValue = actionId instanceof Response ? null : actionId;
  const categoryValue = category instanceof Response ? null : category;
  const effectiveStatusValue = effectiveStatus instanceof Response ? null : effectiveStatus;
  return {
    ok: true,
    value: {
      actionId: actionIdValue,
      category: categoryValue,
      effectiveStatus: effectiveStatusValue,
      limit: parsePositiveInteger(url.searchParams.get("limit"), 1, 50, 20),
      offset: parsePositiveInteger(url.searchParams.get("offset"), 0, 1000, 0),
    },
  };
}

async function loadNeedsResponse(userId: string | null, query: Extract<ReturnType<typeof parseNeedsQuery>, { ok: true }>): Promise<Response> {
  try {
    const result = await listActionNeeds(getSupabaseServerClient(true), userId, query.value);
    return NextResponse.json(
      { status: "ok", ...result },
      {
        headers: {
          // Authenticated responses may include a user-specific projection, so
          // they stay private, fresh, and unshared. Anonymous responses contain
          // only the public projection and may use this short bounded cache;
          // Vary: Cookie keeps the two representations separated.
          "Cache-Control": userId ? "private, no-store" : "public, max-age=15, stale-while-revalidate=30",
          Vary: "Cookie",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/community/needs");
  }
}

export async function GET(request: Request) {
  const { userId } = await getSafeAuthSession();
  const parsedQuery = parseNeedsQuery(new URL(request.url));
  if (!parsedQuery.ok) return parsedQuery.response;

  return loadNeedsResponse(userId, parsedQuery);
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
