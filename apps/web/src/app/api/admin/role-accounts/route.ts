import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { adminAccessErrorJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getManagedRoleAccountById,
  listManagedRoleAccounts,
  searchManagedRoleAccounts,
  type RoleAccountRecord,
} from "@/lib/admin/role-management";

export const runtime = "nodejs";

const mutationSchema = z.object({
  userId: z.string().trim().min(1),
  action: z.enum(["assign", "revoke"]),
  role: z.enum(["admin", "elu"]).optional(),
});

function isAdminLikeRole(role: RoleAccountRecord["roleLabel"]) {
  return role === "admin" || role === "elu" || role === "max";
}

export async function GET(request: Request) {
  const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
  if (role !== "max") {
    return adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const accounts = query ? await searchManagedRoleAccounts(query) : await listManagedRoleAccounts();

  return NextResponse.json({
    status: "ok",
    query: query || null,
    count: accounts.length,
    accounts,
  });
}

export async function POST(request: Request) {
  const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
  if (role !== "max") {
    return adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" });
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

  const client = await clerkClient();
  const currentUser = await client.users.getUser(parsed.data.userId);
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

  await syncClerkUserToSupabase(updatedUser);
  const account = await getManagedRoleAccountById(parsed.data.userId);

  return NextResponse.json({
    status: "ok",
    account,
  });
}
