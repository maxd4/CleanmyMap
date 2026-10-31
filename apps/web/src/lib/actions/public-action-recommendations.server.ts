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
    // The territorial and future-pre-action filters are applied before the store pages the result.
    limit: null,
    status: "approved",
    includeFuturePublicActions: true,
    futurePublicPreActionsOnly: true,
    futureOnly: true,
    ...readScope,
  });
  return derivePublicActionRecommendations(source, candidates, now);
}
