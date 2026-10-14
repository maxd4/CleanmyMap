import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBodyWithSchema } from "@/lib/security/validation";
import { env } from "@/lib/env";
import { getCurrentUserIdentity, requireCreatorAccess } from "@/lib/authz";
import {
  isConfiguredImuOwnerUserId,
  resolveClerkRole,
} from "@/lib/auth/role-resolution";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { adminAccessErrorJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
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
}).strict();

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
    if (isConfiguredImuOwnerUserId(data.userId, env.CLERK_IMU_OWNER_USER_ID)) {
      await appendRoleManagementErrorAudit(auditParams());
      return NextResponse.json(
        { error: "Le compte IMU owner ne peut pas être modifié ici." },
        { status: 403 },
      );
    }
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
    imuOwnerUserId: env.CLERK_IMU_OWNER_USER_ID,
  });
}

function validateRoleMutationTarget(
  data: RoleMutationData,
  actorUserId: string,
): RoleAccountRecord["roleLabel"] | undefined | Response {
  if (data.userId === actorUserId) return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre niveau ici." }, { status: 400 });
  const targetRole = data.action === "revoke" ? "benevole" : data.role;
  if (data.action === "assign" && !targetRole) return NextResponse.json({ error: "Rôle cible manquant." }, { status: 400 });
  if (data.action === "assign" && targetRole && !isAdminLikeRole(targetRole)) return NextResponse.json({ error: "Rôle cible interdit." }, { status: 400 });
  return targetRole;
}

export async function GET(request: Request) {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const identity = await getCurrentUserIdentity();
  if (
    !identity ||
    identity.role !== "max" ||
    identity.activeRole !== "max" ||
    !isConfiguredImuOwnerUserId(identity.userId, env.CLERK_IMU_OWNER_USER_ID)
  ) {
    return adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" });
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    identity.userId,
    { limit: 30, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

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

  if (
    identity.role !== "max" ||
    identity.activeRole !== "max" ||
    !isConfiguredImuOwnerUserId(identity.userId, env.CLERK_IMU_OWNER_USER_ID)
  ) {
    return adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" });
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    identity.userId,
    { limit: 12, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseJsonBodyWithSchema(request, mutationSchema);
  if (!parsed.ok) return parsed.response;

  const targetRole = validateRoleMutationTarget(parsed.data, identity.userId);
  if (targetRole instanceof Response) return targetRole;

  return applyRoleAccountMutation({
    data: parsed.data,
    actorUserId: identity.userId,
    targetRole,
    appendAudit: appendAdminOperationAudit,
  });
}
