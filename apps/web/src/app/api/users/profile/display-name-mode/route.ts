import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getCurrentUserIdentity } from "@/lib/authz";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
} from "@/lib/profiles";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  DISPLAY_NAME_MODE_COOKIE,
  setDisplayNameModeOverride,
} from "@/lib/account/display-name-mode-store";
import { getDevAuthBypassUserId } from "@/lib/auth/dev-auth";

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
  const identity = await getCurrentUserIdentity();
  const userId = identity?.userId;
  if (!userId) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateDisplayNameModeSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const supabase =
    (await getSupabaseClerkRlsClient()) ?? getSupabaseAdminClient();

  try {
    const displayNameMode = normalizeDisplayNameMode(parsed.data.displayNameMode);
    const displayName = resolveAccountDisplayName({
      firstName: identity.firstName?.trim() || null,
      lastName: null,
      username: identity.username?.trim() || null,
      userId,
      mode: displayNameMode,
    });

    setDisplayNameModeOverride(userId, displayNameMode);

    try {
      if (userId !== getDevAuthBypassUserId()) {
        const client = await clerkClient();
        const updateUser = client.users.updateUser;
        if (typeof updateUser === "function") {
          await updateUser.call(client.users, userId, {
            unsafeMetadata: {
              display_name_mode: displayNameMode,
            },
          });
        }
      }
    } catch (error) {
      console.warn(
        "[DisplayNameMode] Clerk metadata sync skipped, local override stored",
        error,
      );
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name_mode: displayNameMode,
            display_name: displayName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (error) {
        console.warn(
          "[DisplayNameMode] Supabase sync skipped, local override stored",
          error,
        );
      }
    } catch (error) {
      console.warn(
        "[DisplayNameMode] Supabase sync skipped, local override stored",
        error,
      );
    }

    const response = NextResponse.json({
      status: "updated",
      displayNameMode,
      displayName,
    });
    response.cookies.set(DISPLAY_NAME_MODE_COOKIE, displayNameMode, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/display-name-mode (general)");
  }
}
