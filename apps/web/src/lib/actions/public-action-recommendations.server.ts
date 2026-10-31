import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActions } from "./store";
import type { ActionRow } from "@/types/database";
import {
  derivePublicActionRecommendations,
  getPublicActionRecommendationReadScope,
  type PublicActionRecommendation,
} from "./public-action-recommendations";

export async function loadPublicActionRecommendations(
  supabase: SupabaseClient,
  source: ActionRow,
  now = new Date(),
): Promise<PublicActionRecommendation[]> {
  const readScope = getPublicActionRecommendationReadScope(source);
  if (!readScope) return [];

  const candidates = await fetchActions(supabase, {
    // The territorial filter bounds the read; the store's paged safety bound prevents an unbounded request.
    limit: null,
    status: "approved",
    includeFuturePublicActions: true,
    futureOnly: true,
    ...readScope,
  });
  return derivePublicActionRecommendations(source, candidates, now);
}
