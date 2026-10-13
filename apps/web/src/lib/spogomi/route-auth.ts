import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthorizedSpogomiEvent = Exclude<
  Awaited<ReturnType<typeof loadSpogomiEventForOrganizer>>,
  false | null
>;

async function resolveAuthorizedSpogomiEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
  notFoundMessage = "Événement introuvable.",
): Promise<{ event: AuthorizedSpogomiEvent } | { response: NextResponse }> {
  const event = await loadSpogomiEventForOrganizer(supabase, eventId, userId);
  if (event === false) return { response: forbiddenJsonResponse() };
  if (!event) return { response: NextResponse.json({ error: notFoundMessage }, { status: 404 }) };
  return { event };
}

export async function loadAuthorizedSpogomiEvent(
  eventId: string,
  userId: string,
  notFoundMessage = "Événement introuvable.",
) {
  const supabase = getSupabaseServerClient(true);
  const authorized = await resolveAuthorizedSpogomiEvent(supabase, eventId, userId, notFoundMessage);
  return { supabase, authorized };
}
