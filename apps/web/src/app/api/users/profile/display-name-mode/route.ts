import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getCurrentUserIdentity } from "@/lib/authz";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
} from "@/lib/profiles";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";

const updateDisplayNameModeSchema = z.object({
  displayNameMode: z.enum(["full_name", "pseudo"]),
});

export async function GET() {
  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  return NextResponse.json({
    userId: identity.userId,
    displayName: identity.displayName,
    displayNameMode: identity.displayNameMode ?? "full_name",
    handle: identity.handle,
    username: identity.username,
    firstName: identity.firstName,
    email: identity.email,
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateDisplayNameModeSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint:
          "Activez l'intégration native Clerk/Supabase et vérifiez que la session Clerk est disponible.",
      },
      { status: 503 },
    );
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const displayNameMode = normalizeDisplayNameMode(parsed.data.displayNameMode);
    const displayName = resolveAccountDisplayName({
      firstName: user.firstName?.trim() || null,
      lastName: user.lastName?.trim() || null,
      username: user.username?.trim() || null,
      userId,
      mode: displayNameMode,
    });

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        display_name_mode: displayNameMode,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) return handleApiError(error, "PATCH /api/users/profile/display-name-mode");

    return NextResponse.json({
      status: "updated",
      displayNameMode,
      displayName,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/display-name-mode (general)");
  }
}
