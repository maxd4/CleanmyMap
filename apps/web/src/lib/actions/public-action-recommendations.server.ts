import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActions } from "./store";
import type { ActionRow } from "@/types/database";
import {
  derivePublicActionRecommendations,
  type PublicActionRecommendation,
} from "./public-action-recommendations";

const PUBLIC_RECOMMENDATION_READ_LIMIT = 60;

export async function loadPublicActionRecommendations(
  supabase: SupabaseClient,
  source: ActionRow,
  now = new Date(),
): Promise<PublicActionRecommendation[]> {
  const candidates = await fetchActions(supabase, {
    limit: PUBLIC_RECOMMENDATION_READ_LIMIT,
    status: "approved",
    includeFuturePublicActions: true,
    futureOnly: true,
  });
  return derivePublicActionRecommendations(source, candidates, now);
}
