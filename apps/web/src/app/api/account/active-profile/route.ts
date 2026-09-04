import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCurrentUserIdentity,
  getCurrentUserRoleLabel,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import { getDevAuthBypassSession } from "@/lib/authz-identity";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import {
  getProfileEntryPath,
  getSwitchableProfiles,
  normalizeProfileRole,
} from "@/lib/profiles";

const activeRoleSchema = z.string().trim().transform((value, context) => {
      const normalized = normalizeProfileRole(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Invalid active role" });
        return z.NEVER;
      }
      return normalized;
    });

const requestSchema = z
  .object({
    activeRole: activeRoleSchema.optional(),
    // Compatibility input for clients from the previous activeProfile
    // contract. It is normalized into ACTIVE_ROLE and never changes role.
    activeProfile: activeRoleSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.activeRole) !== Boolean(value.activeProfile), {
    message: "activeRole is required",
  });

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Profil actif demandé invalide." },
      { status: 400 },
    );
  }

  const identity = await getCurrentUserIdentity();
  const role = identity?.role ?? (await getCurrentUserRoleLabel());
  if (role === "anonymous" || !identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetRole = parsed.data.activeRole ?? parsed.data.activeProfile;
  if (!targetRole || !getSwitchableProfiles(role).includes(targetRole)) {
    return NextResponse.json(
      { error: "Profil actif cible interdit pour ce rôle." },
      { status: 403 },
    );
  }

  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return NextResponse.json({
      role,
      activeRole: targetRole,
      activeProfile: targetRole,
      profilePath: getProfileEntryPath(targetRole),
    });
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(access.userId);
  const publicMetadata: Record<string, unknown> = {
    ...(currentUser.publicMetadata as Record<string, unknown>),
    activeRole: targetRole,
  };
  delete publicMetadata.activeProfile;
  const updatedUser = await client.users.updateUser(access.userId, {
    // Clerk replaces the metadata object, so preserve every existing key.
    // The only authorization-adjacent value changed by this endpoint is
    // activeRole; role/profile remain untouched and are never assigned here.
    publicMetadata,
  });

  await syncClerkUserToSupabase(updatedUser);

  return NextResponse.json({
    role,
    activeRole: targetRole,
    activeProfile: targetRole,
    profilePath: getProfileEntryPath(targetRole),
  });
}
