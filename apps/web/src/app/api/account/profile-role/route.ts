import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserRoleLabel, isAdminRole } from "@/lib/authz";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import {
  getProfileEntryPath,
  isSelfServiceProfile,
} from "@/lib/profiles";

const requestSchema = z.object({
  profile: z.enum(["benevole", "coordinateur", "scientifique"]),
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

  const currentRole = await getCurrentUserRoleLabel();
  if (!isSelfServiceProfile(currentRole)) {
    return NextResponse.json(
      {
        error:
          "Ce compte ne peut pas modifier son rôle via le badge.",
      },
      { status: 403 },
    );
  }

  const targetRole = parsed.data.profile;
  if (!isSelfServiceProfile(targetRole)) {
    return NextResponse.json(
      { error: "Rôle cible interdit." },
      { status: 403 },
    );
  }

  if (currentRole === targetRole) {
    return NextResponse.json({
      role: targetRole,
      profilePath: getProfileEntryPath(targetRole),
    });
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(session.userId);
  const isCurrentAdmin = isAdminRole({
    publicMetadata: currentUser.publicMetadata,
    privateMetadata: currentUser.privateMetadata,
  });

  if (isCurrentAdmin) {
    return NextResponse.json(
      {
        error:
          "Les comptes administrateur ne sont pas modifiables depuis cette interface.",
      },
      { status: 403 },
    );
  }

  const updatedUser = await client.users.updateUser(session.userId, {
    publicMetadata: {
      ...(currentUser.publicMetadata as Record<string, unknown>),
      role: targetRole,
    },
  });

  await syncClerkUserToSupabase(updatedUser);

  return NextResponse.json({
    role: targetRole,
    profilePath: getProfileEntryPath(targetRole),
  });
}
