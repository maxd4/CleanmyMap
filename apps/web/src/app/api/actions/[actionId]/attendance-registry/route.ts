import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageAction } from "@/lib/actions/permissions";
import { loadActionById } from "@/lib/actions/store";
import { loadActionOrganizerRowsForAction } from "@/lib/actions/participation/organizers";
import { listActionAttendanceEntries, listActionAttendanceTeams, mutateActionAttendanceEntry, mutateActionAttendanceTeam } from "@/lib/actions/participation/attendance-registry";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification force-dynamic: the authenticated action registry reflects current private attendance state.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };
const mutationSchema = z.object({
  requestId: z.string().uuid(),
  operation: z.enum(["add", "rename", "delete", "link", "mark", "team_create", "team_rename", "team_delete", "member_assign", "leader_set"]),
  entryId: z.string().uuid().nullable().optional(),
  expectedRevision: z.number().int().positive().nullable().optional(),
  displayLabel: z.string().max(320).optional(),
  clerkUserId: z.string().trim().min(1).max(255).optional(),
  attendanceStatus: z.enum(["unknown", "present", "absent"]).optional(),
  teamId: z.string().uuid().optional(),
  targetTeamId: z.string().uuid().nullable().optional(),
  expectedRevisions: z.array(z.object({ teamId: z.string().uuid(), revision: z.number().int().positive() })).max(2).optional(),
  teamName: z.string().max(160).optional(),
  leaderEntryId: z.string().uuid().nullable().optional(),
});

function privateJson(body: unknown, status = 200) {
  // Justification no-store: attendance entries and account links are private, mutable action data.
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authorizeAction(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [action, identity, organizerRows] = await Promise.all([
    loadActionById(supabase, actionId),
    getCurrentUserIdentity({ userId }),
    loadActionOrganizerRowsForAction(supabase, actionId),
  ]);
  if (!action) return { ok: false as const, status: 404 as const };
  const allowed = canManageAction(
    { userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
    { createdByClerkId: action.created_by_clerk_id, actionPhase: action.action_phase, status: action.status },
    organizerRows.map((row) => row.organizer_clerk_id),
  );
  return allowed ? { ok: true as const, supabase, action } : { ok: false as const, status: 403 as const };
}

function mutationStatus(error: unknown): number {
  const value = error as { code?: string };
  if (value.code === "40001" || value.code === "23505") return 409;
  if (value.code === "P0001") return 409;
  if (value.code === "22023") return 400;
  if (value.code === "P0002") return 404;
  return 500;
}

export async function GET(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  try {
    const { actionId } = await context.params;
    const access = await authorizeAction(actionId.trim(), auth.userId);
    if (!access.ok) return privateJson({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, access.status);
    const [entries, teams] = await Promise.all([
      listActionAttendanceEntries(access.supabase, access.action.id),
      listActionAttendanceTeams(access.supabase, access.action.id),
    ]);
    return privateJson({
      actionId: access.action.id,
      entries,
      teams,
      declared: {
        total: access.action.volunteers_count ?? null,
        adults: access.action.adult_count ?? null,
        retired: access.action.retired_count ?? null,
        children: access.action.children_count ?? null,
      },
      canMarkPresent: Boolean(access.action.event_start_at && Date.now() >= Date.parse(access.action.event_start_at)),
    });
  } catch {
    return handleApiError(new Error("Private attendance registry read failed."), "GET /api/actions/[actionId]/attendance-registry");
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: "Paramètres invalides.", details: parsed.error.flatten().fieldErrors }, 400);
  const input = parsed.data;
  const teamOperation = input.operation.startsWith("team_") || input.operation === "member_assign" || input.operation === "leader_set";
  if (!teamOperation && ((input.operation === "add" && !input.displayLabel) || (["rename", "link", "delete", "mark"].includes(input.operation) && (!input.entryId || !input.expectedRevision)))) {
    return privateJson({ error: "Les paramètres de cette opération sont incomplets." }, 400);
  }
  if (teamOperation && ((input.operation === "team_create" && !input.teamName)
    || (["team_rename", "team_delete", "leader_set"].includes(input.operation) && !input.teamId)
    || (input.operation === "team_rename" && !input.teamName)
    || (input.operation === "member_assign" && (!input.entryId || input.targetTeamId === undefined)))) {
    return privateJson({ error: "Les paramètres de cette opération d’équipe sont incomplets." }, 400);
  }
  if (input.operation === "rename" && !input.displayLabel) return privateJson({ error: "Le libellé est requis." }, 400);
  if (input.operation === "link" && !input.clerkUserId) return privateJson({ error: "Le compte Clerk est requis." }, 400);
  if (input.operation === "mark" && !input.attendanceStatus) return privateJson({ error: "Le pointage est requis." }, 400);
  if (input.operation === "add" && input.attendanceStatus === "absent") return privateJson({ error: "Une entrée commence sans présence observée." }, 400);
  try {
    const { actionId } = await context.params;
    const access = await authorizeAction(actionId.trim(), auth.userId);
    if (!access.ok) return privateJson({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, access.status);
    const clerkUserId = input.clerkUserId?.trim();
    if ((input.operation === "add" && clerkUserId) || input.operation === "link") {
      if (!clerkUserId?.startsWith("user_")) return privateJson({ error: "Le compte Clerk est invalide." }, 400);
      try {
        await (await clerkClient()).users.getUser(clerkUserId);
      } catch {
        return privateJson({ error: "Le compte Clerk n’existe pas." }, 400);
      }
    }
    const payload: Record<string, string | null> = {};
    if (input.displayLabel !== undefined) payload.display_label = input.displayLabel;
    if (clerkUserId) payload.clerk_user_id = clerkUserId;
    if (input.attendanceStatus) payload.attendance_status = input.attendanceStatus;
    if (teamOperation) {
      const teamMutation = await mutateActionAttendanceTeam(access.supabase, {
        actionId: access.action.id,
        actorClerkId: auth.userId,
        requestId: input.requestId,
        operation: input.operation as "team_create" | "team_rename" | "team_delete" | "member_assign" | "leader_set",
        teamId: input.teamId,
        entryId: input.entryId,
        targetTeamId: input.targetTeamId,
        expectedRevisions: input.expectedRevisions,
        payload: input.teamName !== undefined ? { name: input.teamName } : input.leaderEntryId !== undefined ? { leaderEntryId: input.leaderEntryId } : {},
      });
      return privateJson({ teamMutation });
    }
    const entry = await mutateActionAttendanceEntry(access.supabase, {
      actionId: access.action.id,
      actorClerkId: auth.userId,
      requestId: input.requestId,
      operation: input.operation as "add" | "rename" | "delete" | "link" | "mark",
      entryId: input.entryId,
      expectedRevision: input.expectedRevision,
      payload,
    });
    return privateJson({ entry });
  } catch (error) {
    const value = error as { code?: string };
    const status = mutationStatus(error);
    if (status !== 500) return privateJson({ error: value.code === "23505" ? "Une équipe porte déjà ce nom dans cette action." : status === 409 ? "Cette entrée a changé. Rechargez le registre." : "La mutation du registre n’est pas applicable." }, status);
    return handleApiError(new Error("Private attendance registry mutation failed."), "POST /api/actions/[actionId]/attendance-registry");
  }
}
