import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBodyWithSchema } from "@/lib/security/validation";
import { env } from "@/lib/env";
import { getCurrentUserIdentity, requireCreatorAccess } from "@/lib/authz";
import {
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
} from "@/lib/auth/role-resolution";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { adminAccessErrorJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  getManagedRoleAccountById,
  listManagedRoleAccounts,
  searchManagedRoleAccounts,
  type RoleAccountRecord,
} from "@/lib/admin/role-management";

export const runtime = "nodejs";

const mutationSchema = z.object({
  userId: z.string().trim().min(1).max(255),
  action: z.enum(["assign", "revoke"]),
  role: z.enum(["admin", "elu"]).optional(),
  reason: z.string().trim().min(5).max(500),
});

function isAdminLikeRole(role: RoleAccountRecord["roleLabel"]) {
  return role === "admin" || role === "elu";
}

type RoleManagementAuditParams = {
  operationId: string;
  actorUserId: string;
  operation: "assign_role" | "revoke_role";
  reason: string;
  targetUserId: string;
  previousRole: RoleAccountRecord["roleLabel"] | "unknown";
  expectedRole: string;
  stage: "clerk_lookup" | "clerk_update" | "supabase_sync";
};

function buildRoleManagementAuditDetails(
  params: RoleManagementAuditParams,
  includeStage: boolean,
): Record<string, unknown> {
  return {
    operation: params.operation,
    reason: params.reason,
    targetUserId: params.targetUserId,
    previousValue: { role: params.previousRole },
    newValue: { role: params.expectedRole },
    ...(includeStage ? { stage: params.stage } : {}),
  };
}

async function appendRoleManagementErrorAudit(
  params: RoleManagementAuditParams,
): Promise<void> {
  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: "role_management",
    outcome: "error",
    targetId: params.targetUserId,
    details: buildRoleManagementAuditDetails(params, true),
  });
}

type RoleMutationData = z.infer<typeof mutationSchema>;

async function applyRoleAccountMutation(params: {
  data: RoleMutationData;
  actorUserId: string;
  targetRole: RoleAccountRecord["roleLabel"] | undefined;
  appendAudit: typeof appendAdminOperationAudit;
}): Promise<Response> {
  const { data, actorUserId, targetRole, appendAudit } = params;
  const operationId = randomUUID();
  const operation: RoleManagementAuditParams["operation"] =
    data.action === "assign" ? "assign_role" : "revoke_role";
  const expectedRole = targetRole ?? "benevole";
  let previousRole: RoleAccountRecord["roleLabel"] | "unknown" = "unknown";
  let stage: RoleManagementAuditParams["stage"] = "clerk_lookup";
  const auditParams = () => ({
    operationId,
    actorUserId,
    operation,
    reason: data.reason,
    targetUserId: data.userId,
    previousRole,
    expectedRole,
    stage,
  });

  try {
    const client = await clerkClient();
    const currentUser = await client.users.getUser(data.userId);
    previousRole = resolveCanonicalTargetRole(currentUser);

    if (previousRole === "max") {
      await appendRoleManagementErrorAudit(auditParams());
      return NextResponse.json(
        { error: "Le compte IMU owner ne peut pas être modifié ici." },
        { status: 403 },
      );
    }

    stage = "clerk_update";
    const updatedUser = await client.users.updateUser(data.userId, {
      publicMetadata: {
        ...(currentUser.publicMetadata as Record<string, unknown>),
        role: targetRole,
        profile: targetRole,
      },
      privateMetadata: {
        ...(currentUser.privateMetadata as Record<string, unknown>),
        role: targetRole,
        profile: targetRole,
      },
    });

    stage = "supabase_sync";
    const syncedProfile = await syncClerkUserToSupabase(updatedUser);
    if (!syncedProfile) {
      throw new Error("Supabase role synchronization did not persist a profile.");
    }
  } catch {
    await appendRoleManagementErrorAudit(auditParams());
    return NextResponse.json(
      { error: "Impossible de mettre à jour ce compte." },
      { status: 500 },
    );
  }

  await appendAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId,
    operationType: "role_management",
    outcome: "success",
    targetId: data.userId,
    details: buildRoleManagementAuditDetails(auditParams(), false),
  });
  const account = await getManagedRoleAccountById(data.userId);
  return NextResponse.json({ status: "ok", account });
}

function resolveCanonicalTargetRole(user: {
  id: string;
  publicMetadata?: Record<string, unknown> | null;
  privateMetadata?: Record<string, unknown> | null;
}): RoleAccountRecord["roleLabel"] {
  return resolveClerkRole({
    user,
    adminUserIds: parseAdminUserIds(env.CLERK_ADMIN_USER_IDS),
    maxUserIds: parseMaxUserIds(env.CLERK_MAX_USER_IDS),
  });
}

export async function GET(request: Request) {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const accounts = query ? await searchManagedRoleAccounts(query) : await listManagedRoleAccounts();

  return NextResponse.json({
    status: "ok",
    query: query || null,
    count: accounts.length,
    accounts,
  });
}

export async function POST(request: Request) {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return unauthorizedJsonResponse();
  }

  const parsed = await parseJsonBodyWithSchema(request, mutationSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.userId === identity.userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre niveau ici." },
      { status: 400 },
    );
  }

  const targetRole = parsed.data.action === "revoke"
    ? "benevole"
    : parsed.data.role;

  if (parsed.data.action === "assign" && !targetRole) {
    return NextResponse.json({ error: "Rôle cible manquant." }, { status: 400 });
  }

  if (
    parsed.data.action === "assign" &&
    targetRole &&
    !isAdminLikeRole(targetRole)
  ) {
    return NextResponse.json({ error: "Rôle cible interdit." }, { status: 400 });
  }

  return applyRoleAccountMutation({
    data: parsed.data,
    actorUserId: identity.userId,
    targetRole,
    appendAudit: appendAdminOperationAudit,
  });
}
