import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserRoleLabel, isAdminRole, isMaxRole } from "@/lib/authz";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import {
  getProfileEntryPath,
  isSelfServiceProfile,
  normalizeProfileRole,
} from "@/lib/profiles";

const requestSchema = z.object({
  profile: z.string().trim().transform((value, context) => {
    const normalized = normalizeProfileRole(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Invalid profile" });
      return z.NEVER;
    }
    return normalized;
  }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Profil demandé invalide." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(session.userId);
  const isCurrentAdmin = isAdminRole({
    publicMetadata: currentUser.publicMetadata,
    privateMetadata: currentUser.privateMetadata,
  });

  const currentRole = await getCurrentUserRoleLabel();
  const targetRole = parsed.data.profile;
  const persistedRole = targetRole;

  // Seuls les admins ou les profils "self-service" peuvent changer de rôle
  const canSwitch =
    isCurrentAdmin || currentRole === "max" || isSelfServiceProfile(currentRole);

  if (!canSwitch) {
    return NextResponse.json(
      {
        error: "Ce compte ne peut pas modifier son rôle via le badge.",
      },
      { status: 403 },
    );
  }

  // Les non-admins ne peuvent cibler que des profils "self-service"
  if (
    currentRole !== "max" &&
    !isCurrentAdmin &&
    !isSelfServiceProfile(targetRole)
  ) {
    return NextResponse.json(
      { error: "Rôle cible interdit." },
      { status: 403 },
    );
  }

  if (
    targetRole === "max" &&
    currentRole !== "max" &&
    !isMaxRole({
      publicMetadata: currentUser.publicMetadata,
      privateMetadata: currentUser.privateMetadata,
    })
  ) {
    return NextResponse.json(
      { error: "Le rôle IMU est réservé à l'owner." },
      { status: 403 },
    );
  }

  if (currentRole === targetRole) {
    return NextResponse.json({
      role: targetRole,
      profilePath: getProfileEntryPath(targetRole),
    });
  }

  const updatedUser = await client.users.updateUser(session.userId, {
    publicMetadata: {
      ...(currentUser.publicMetadata as Record<string, unknown>),
      role: persistedRole,
      profile: persistedRole,
    },
    privateMetadata: {
      ...(currentUser.privateMetadata as Record<string, unknown>),
      role: persistedRole,
      profile: persistedRole,
    },
  });

  await syncClerkUserToSupabase(updatedUser);

  return NextResponse.json({
    role: targetRole,
    profilePath: getProfileEntryPath(targetRole),
  });
}
