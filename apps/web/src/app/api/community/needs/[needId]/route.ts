import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import {
  ACTION_NEED_SELECT_FIELDS,
  canManageActionNeed,
  loadActionNeedById,
  toActionNeedItemForContext,
} from "@/lib/community/action-needs-service";
import {
  COMMUNITY_HELP_CATEGORIES,
  getActionNeedEffectiveStatus,
} from "@/lib/community/action-needs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categorySchema = z.enum(COMMUNITY_HELP_CATEGORIES);
const titleSchema = z.string().trim().min(3).max(80);
const descriptionSchema = z.string().trim().min(1).max(500);
const quantityLabelSchema = z.string().trim().max(80).nullable().optional();
const expiresAtSchema = z.string().datetime({ offset: true }).nullable().optional();

const updateSchema = z.object({
  operation: z.literal("update"),
  category: categorySchema.optional(),
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  quantityLabel: quantityLabelSchema,
  expiresAt: expiresAtSchema,
}).strict().refine(
  (value) => value.category !== undefined || value.title !== undefined || value.description !== undefined ||
    value.quantityLabel !== undefined || value.expiresAt !== undefined,
  { message: "Aucune modification fournie." },
);

const transitionSchema = z.object({
  operation: z.enum(["fulfill", "cancel"] as const),
}).strict();
const patchSchema = z.union([updateSchema, transitionSchema]);

function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

function conflictResponse() {
  return NextResponse.json(
    { error: "Le besoin est fermé, expiré ou a été modifié. Actualisez la page puis réessayez.", kind: "conflict" },
    { status: 409 },
  );
}

function forbiddenResponse() {
  return NextResponse.json({ error: "Vous n'avez pas accès à ce besoin.", kind: "permission" }, { status: 403 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ needId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const { needId } = await context.params;
  if (!isUuid(needId)) return NextResponse.json({ error: "Identifiant de besoin invalide." }, { status: 400 });
  const parsed = await parseJsonBodyWithValidation(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const supabase = getSupabaseServerClient(true);
    const current = await loadActionNeedById(supabase, needId);
    if (!current) return NextResponse.json({ error: "Besoin introuvable." }, { status: 404 });
    if (!(await canManageActionNeed(supabase, access.userId, current.action))) return forbiddenResponse();

    const now = new Date();
    if (getActionNeedEffectiveStatus(current.need, now) !== "open") return conflictResponse();

    let values:
      | { status: "fulfilled"; fulfilled_at: string }
      | { status: "cancelled"; fulfilled_at: null }
      | ReturnType<typeof buildUpdateValues>;
    if (parsed.data.operation === "update") {
      values = buildUpdateValues(parsed.data);
    } else if (parsed.data.operation === "fulfill") {
      values = { status: "fulfilled", fulfilled_at: now.toISOString() };
    } else {
      values = { status: "cancelled", fulfilled_at: null };
    }

    const update = supabase
      .from("action_needs")
      .update(values)
      .eq("id", needId)
      .eq("status", "open")
      .eq("updated_at", current.need.updated_at)
      .or(`expires_at.is.null,expires_at.gte.${now.toISOString()}`)
      .select(ACTION_NEED_SELECT_FIELDS)
      .maybeSingle();
    const result = await update;
    if (result.error) {
      if (typeof result.error === "object" && result.error !== null && "code" in result.error &&
        ((result.error as { code?: unknown }).code === "23514" || (result.error as { code?: unknown }).code === "40001")) {
        return conflictResponse();
      }
      throw result.error;
    }
    if (!result.data) return conflictResponse();

    return NextResponse.json({
      status: "updated",
      item: toActionNeedItemForContext(result.data, current.action, true, now),
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/community/needs/[needId]");
  }
}

function buildUpdateValues(value: {
  operation: "update";
  category?: z.infer<typeof categorySchema>;
  title?: string;
  description?: string;
  quantityLabel?: string | null;
  expiresAt?: string | null;
}) {
  return {
    ...(value.category !== undefined ? { category: value.category } : {}),
    ...(value.title !== undefined ? { title: value.title } : {}),
    ...(value.description !== undefined ? { description: value.description } : {}),
    ...(value.quantityLabel !== undefined ? { quantity_label: value.quantityLabel } : {}),
    ...(value.expiresAt !== undefined ? { expires_at: value.expiresAt } : {}),
  };
}
