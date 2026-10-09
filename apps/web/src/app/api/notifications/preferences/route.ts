import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Vercel justification: authenticated preferences are session-scoped and must not be statically cached.
export const dynamic = "force-dynamic";

const preferencesPatchSchema = z.object({
  informationalEnabled: z.boolean().optional(),
  actionRemindersEnabled: z.boolean().optional(),
  actionId: z.string().uuid().optional(),
  muted: z.boolean().optional(),
}).refine(
  (value) => Object.keys(value).length > 0
    && (value.actionId === undefined ? value.muted === undefined : value.muted !== undefined),
  "Une préférence de notification est requise.",
);

async function readPreferences(userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [{ data: preferences, error: preferencesError }, { data: mutes, error: mutesError }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("informational_enabled, action_reminders_enabled")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("notification_information_mutes")
      .select("action_id")
      .eq("user_id", userId),
  ]);
  if (preferencesError) throw preferencesError;
  if (mutesError) throw mutesError;
  return {
    informationalEnabled: preferences?.informational_enabled !== false,
    actionRemindersEnabled: preferences?.action_reminders_enabled !== false,
    mutedInformationActionIds: (mutes ?? []).flatMap((mute) =>
      typeof mute.action_id === "string" ? [mute.action_id] : [],
    ),
  };
}

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(rateLimit.allowed, rateLimit.retryAfter, rateLimit);
  if (rateLimitResponse) return rateLimitResponse;

  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  try {
    // Cache justification: preference data is private to the authenticated user.
    return NextResponse.json(await readPreferences(userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/notifications/preferences");
  }
}

export async function PATCH(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 20, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(rateLimit.allowed, rateLimit.retryAfter, rateLimit);
  if (rateLimitResponse) return rateLimitResponse;

  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = preferencesPatchSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const supabase = getSupabaseServerClient(true);
    const values = {
      user_id: userId,
      ...(parsed.data.informationalEnabled === undefined
        ? {}
        : { informational_enabled: parsed.data.informationalEnabled }),
      ...(parsed.data.actionRemindersEnabled === undefined
        ? {}
        : { action_reminders_enabled: parsed.data.actionRemindersEnabled }),
    };
    if (Object.keys(values).length > 1) {
      const { error } = await supabase.from("notification_preferences").upsert(values, { onConflict: "user_id" });
      if (error) throw error;
    }
    if (parsed.data.actionId && parsed.data.muted !== undefined) {
      if (parsed.data.muted) {
        const { error } = await supabase.from("notification_information_mutes").upsert({
          user_id: userId,
          action_id: parsed.data.actionId,
        }, { onConflict: "user_id,action_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notification_information_mutes")
          .delete()
          .eq("user_id", userId)
          .eq("action_id", parsed.data.actionId);
        if (error) throw error;
      }
    }
    // Cache justification: preference mutations must never be cached or shared.
    return NextResponse.json(await readPreferences(userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/notifications/preferences");
  }
}
