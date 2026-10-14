import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getDevAuthBypassSession } from "@/lib/authz-identity";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
} from "@/lib/profiles";
import { requireSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  DISPLAY_NAME_MODE_COOKIE,
} from "@/lib/account/display-name-mode-store";
import { getDevAuthBypassUserId } from "@/lib/auth/dev-auth";
import type { UserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";

const updateDisplayNameModeSchema = z.object({
  displayNameMode: z.enum(["full_name", "pseudo"]),
});

const DISPLAY_NAME_MODE_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
type DisplayNameModeResponse = UserIdentity;

async function updateDisplayNameProjection({
  supabase,
  userId,
  identity,
  displayNameMode,
}: {
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseClerkRlsClient>>>;
  userId: string;
  identity: NonNullable<Awaited<ReturnType<typeof getCurrentUserIdentity>>>;
  displayNameMode: "full_name" | "pseudo";
}) {
  let clerkUser: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>> | null = null;
  if (userId !== getDevAuthBypassUserId()) {
    const client = await clerkClient();
    clerkUser = await client.users.getUser(userId);
    await client.users.updateUserMetadata(userId, { unsafeMetadata: { display_name_mode: displayNameMode } });
  }
  const displayName = resolveAccountDisplayName({
    firstName: clerkUser?.firstName?.trim() || identity.firstName?.trim() || null,
    lastName: clerkUser?.lastName?.trim() || null,
    username: identity.handle?.trim() || identity.username?.trim() || null,
    userId,
    mode: displayNameMode,
  });
  let projectionError: unknown = null;
  try {
    const { error } = await supabase.from("profiles").upsert({ id: userId, display_name_mode: displayNameMode, display_name: displayName, updated_at: new Date().toISOString() }, { onConflict: "id" });
    projectionError = error;
  } catch (error) {
    projectionError = error;
  }
  if (projectionError) return NextResponse.json({ error: "Le mode d’affichage Clerk est enregistré, mais sa projection Supabase n’est pas confirmée.", status: "clerk_updated_supabase_sync_pending" }, { status: 503 });
  revalidateTag("admin-referral-lineage-export", "max");
  const response = NextResponse.json({ status: "updated", displayNameMode, displayName });
  response.cookies.set(DISPLAY_NAME_MODE_COOKIE, displayNameMode, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export async function GET(request?: Request) {
  const devBypass = await getDevAuthBypassSession();
  const access = request
    ? await requireActionRequestAccess(request)
    : await auth().then(({ userId }) => userId ? { ok: true as const, userId } : { ok: false as const });
  const userId = devBypass?.userId ?? (access?.ok ? access.userId : null);
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity({ userId });
  const payload =
    identity && identity.userId === userId
      ? (identity satisfies DisplayNameModeResponse)
      : null;
  if (!payload) return unauthorizedJsonResponse();

  return NextResponse.json(payload, {
    headers: DISPLAY_NAME_MODE_CACHE_HEADERS,
  });
}

export async function PATCH(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const identity = await getCurrentUserIdentity({ userId: access.userId });
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

  let supabase: Awaited<ReturnType<typeof requireSupabaseClerkRlsClient>> | null = null;
  try {
    supabase = await requireSupabaseClerkRlsClient();
  } catch (error) {
    console.warn(
      "[DisplayNameMode] Clerk/Supabase access token unavailable for required RLS flow",
      error,
    );
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint: "La mise à jour du profil nécessite un JWT Clerk valide transmis à Supabase via accessToken.",
      },
      { status: 503 },
    );
  }

  try {
    return await updateDisplayNameProjection({ supabase, userId, identity, displayNameMode: normalizeDisplayNameMode(parsed.data.displayNameMode) });
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/display-name-mode (general)");
  }
}
