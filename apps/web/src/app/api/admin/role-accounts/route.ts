import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getCurrentUserIdentity, requireCreatorAccess } from "@/lib/authz";
import {
  resolveClerkRole,
  type ClerkUserForRole,
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

function resolveCanonicalTargetRole(user: {
  id: string;
  primaryEmailAddress?: ClerkUserForRole["primaryEmailAddress"];
  publicMetadata?: Record<string, unknown> | null;
  privateMetadata?: Record<string, unknown> | null;
}): RoleAccountRecord["roleLabel"] {
  return resolveClerkRole({
    user,
    ownerUserId: env.CLERK_IMU_OWNER_USER_ID,
    ownerEmail: env.CLERK_IMU_OWNER_EMAIL,
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = mutationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

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

  const operationId = randomUUID();
  const operation = parsed.data.action === "assign" ? "assign_role" : "revoke_role";
  const expectedRole = targetRole ?? "benevole";
  let previousRole: RoleAccountRecord["roleLabel"] | "unknown" = "unknown";
  let stage: "clerk_lookup" | "clerk_update" | "supabase_sync" = "clerk_lookup";

  const buildAuditDetails = (includeStage = false): Record<string, unknown> => ({
    operation,
    reason: parsed.data.reason,
    targetUserId: parsed.data.userId,
    previousValue: { role: previousRole },
    newValue: { role: expectedRole },
    ...(includeStage ? { stage } : {}),
  });

  const appendRoleManagementErrorAudit = async (): Promise<void> => {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: identity.userId,
      operationType: "role_management",
      outcome: "error",
      targetId: parsed.data.userId,
      details: buildAuditDetails(true),
    });
  };

  try {
    stage = "clerk_lookup";
    const client = await clerkClient();
    const currentUser = await client.users.getUser(parsed.data.userId);
    previousRole = resolveCanonicalTargetRole(currentUser);

    if (previousRole === "max") {
      await appendRoleManagementErrorAudit();
      return NextResponse.json(
        { error: "Le compte IMU owner ne peut pas être modifié ici." },
        { status: 403 },
      );
    }

    stage = "clerk_update";
    const updatedUser = await client.users.updateUser(parsed.data.userId, {
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
    await appendRoleManagementErrorAudit();
    return NextResponse.json(
      { error: "Impossible de mettre à jour ce compte." },
      { status: 500 },
    );
  }

  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: identity.userId,
    operationType: "role_management",
    outcome: "success",
    targetId: parsed.data.userId,
    details: buildAuditDetails(),
  });

  const account = await getManagedRoleAccountById(parsed.data.userId);

  return NextResponse.json({
    status: "ok",
    account,
  });
}
