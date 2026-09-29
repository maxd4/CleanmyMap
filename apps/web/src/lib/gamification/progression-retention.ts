import type { SupabaseClient } from "@supabase/supabase-js";
import { formatScorePercent } from "@/lib/formatters/score";
import {
  actionQualityScoreFromRow,
  fetchActionById,
  parseAssociationNameFromActionNotes,
} from "./progression-data";
import type { PostActionRetentionLoop } from "./progression-types";
import { toFloat, toInt } from "./progression-utils";
import { getUserProgression } from "./progression-user";

type ProgressionEventRow = {
  status_phase?: string | null;
  xp_awarded?: number | null;
};

async function loadValidatedXpAwarded(
  supabase: SupabaseClient,
  userId: string,
  actionId: string,
): Promise<number> {
  const result = await supabase
    .from("progression_events")
    .select("status_phase, xp_awarded")
    .eq("user_id", userId)
    .eq("source_table", "actions")
    .eq("source_id", actionId);
  if (result.error) {
    return 0;
  }

  return ((result.data ?? []) as ProgressionEventRow[]).reduce((total, event) => {
    if (event.status_phase !== "validated") {
      return total;
    }
    const value = Number(event.xp_awarded ?? 0);
    return Number.isFinite(value) && value > 0 ? total + value : total;
  }, 0);
}

function buildRetentionCopy(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  progression: Awaited<ReturnType<typeof getUserProgression>>,
): Pick<PostActionRetentionLoop, "summary" | "thanksMessage" | "share" | "nextActionSuggestion"> {
  if (!action) {
    throw new Error("Cannot build retention copy without an action");
  }

  const qualityScore = actionQualityScoreFromRow(action);
  const qualityLabel = qualityScore >= 80 ? "A" : qualityScore >= 60 ? "B" : "C";
  const associationName = parseAssociationNameFromActionNotes(action.notes);
  const thanksMessage =
    associationName !== "Sans association"
      ? `${associationName} remercie ${action.actor_name?.trim() || "Contributeur"} pour cette contribution vérifiée à ${action.location_label}.`
      : `${action.actor_name?.trim() || "Contributeur"} renforce l'action locale à ${action.location_label}.`;
  const summary = [
    action.waste_kg === null
      ? "masse de déchets non renseignée"
      : `${Math.round(toFloat(action.waste_kg, 0) * 10) / 10} kg collectes`,
    `${toInt(action.cigarette_butts, 0)} megots retires`,
    `qualite ${qualityLabel} (${formatScorePercent(qualityScore)})`,
  ].join(" - ");
  const shareText =
    `J'ai contribue a une action locale avec CleanMyMap: ${summary}.` +
    ` Mon niveau actuel est ${progression.currentLevel}.`;
  const nextActionSuggestion =
    progression.nextLevel.requirements.current.collectiveEvents <
    progression.nextLevel.requirements.thresholds.minCollectiveEvents
      ? "Participe a une action collective cette semaine pour renforcer ton impact local."
      : qualityScore < 80
        ? "Ajoute geolocalisation precise et details terrain a la prochaine action pour augmenter la qualite."
        : "Utilise l'itineraire IA pour planifier une intervention sur une zone sous-couverte.";

  return {
    summary,
    thanksMessage,
    share: { text: shareText, url: "/sections/gamification" },
    nextActionSuggestion,
  };
}

export async function buildPostActionRetentionLoop(
  supabase: SupabaseClient,
  params: { userId: string; actionId: string },
): Promise<PostActionRetentionLoop | null> {
  const action = await fetchActionById(supabase, params.actionId);
  if (!action) {
    return null;
  }

  const [progression, xpAwarded] = await Promise.all([
    getUserProgression(supabase, params.userId),
    loadValidatedXpAwarded(supabase, params.userId, params.actionId),
  ]);
  const copy = buildRetentionCopy(action, progression);

  return {
    ...copy,
    // A current badge is not proof that this action unlocked it. Only expose
    // a badge when a future attribution event is explicitly linked to this action.
    badge: null,
    xpAwarded: Math.round(xpAwarded * 100) / 100,
  };
}
