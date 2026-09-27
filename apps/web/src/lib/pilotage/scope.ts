import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PilotageOverviewScope = {
  kind: "organized";
  userId: string;
};

type ActionIdRow = { id: string };
type OrganizerActionIdRow = { action_id: string };

export function mergeOrganizedActionIds(
  creatorRows: readonly ActionIdRow[],
  organizerRows: readonly OrganizerActionIdRow[],
): string[] {
  return [
    ...new Set(
      [...creatorRows.map((row) => row.id), ...organizerRows.map((row) => row.action_id)]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort();
}

export async function loadOrganizedActionIds(
  userId: string,
  supabase: SupabaseClient = getSupabaseServerClient(true),
): Promise<string[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const [creatorResult, organizerResult] = await Promise.all([
    supabase.from("actions").select("id").eq("created_by_clerk_id", normalizedUserId),
    supabase
      .from("action_organizers")
      .select("action_id")
      .eq("organizer_clerk_id", normalizedUserId),
  ]);

  if (creatorResult.error) {
    throw new Error(creatorResult.error.message);
  }
  if (organizerResult.error) {
    throw new Error(organizerResult.error.message);
  }

  return mergeOrganizedActionIds(
    (creatorResult.data ?? []) as ActionIdRow[],
    (organizerResult.data ?? []) as OrganizerActionIdRow[],
  );
}

/** Cache lanes identify the authorized corpus, not the person's identifier. */
export function buildPilotageScopeCacheKey(
  scope: PilotageOverviewScope | null | undefined,
  actionIds: readonly string[] | null,
): string {
  if (!scope) {
    return "global";
  }

  const corpus = (actionIds ?? []).map((value) => value.trim()).filter(Boolean).sort().join("\n");
  const digest = createHash("sha256").update(corpus).digest("hex").slice(0, 32);
  return `${scope.kind}:${digest}`;
}
