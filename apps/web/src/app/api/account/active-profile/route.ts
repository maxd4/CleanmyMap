import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCurrentUserRoleLabel,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import {
  getProfileEntryPath,
  getSwitchableProfiles,
  normalizeProfileRole,
} from "@/lib/profiles";

const requestSchema = z
  .object({
    activeProfile: z.string().trim().transform((value, context) => {
      const normalized = normalizeProfileRole(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Invalid active profile" });
        return z.NEVER;
      }
      return normalized;
    }),
  })
  .strict();

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

  const role = await getCurrentUserRoleLabel();
  if (role === "anonymous") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetProfile = parsed.data.activeProfile;
  if (!getSwitchableProfiles(role).includes(targetProfile)) {
    return NextResponse.json(
      { error: "Profil actif cible interdit pour ce rôle." },
      { status: 403 },
    );
  }

  const client = await clerkClient();
  const currentUser = await client.users.getUser(access.userId);
  const updatedUser = await client.users.updateUser(access.userId, {
    // Clerk replaces the metadata object, so preserve every existing key.
    // The only value changed by this endpoint is activeProfile; role remains
    // sourced from the existing metadata and is never assigned here.
    publicMetadata: {
      ...(currentUser.publicMetadata as Record<string, unknown>),
      activeProfile: targetProfile,
    },
  });

  await syncClerkUserToSupabase(updatedUser);

  return NextResponse.json({
    role,
    activeProfile: targetProfile,
    profilePath: getProfileEntryPath(targetProfile),
  });
}
