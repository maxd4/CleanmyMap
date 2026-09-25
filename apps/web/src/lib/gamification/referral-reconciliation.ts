import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  insertProgressionEvent,
  loadActionRowsForUser,
  loadValidatedActionIdsForUser,
} from "./progression-data";
import type { ProgressionEventType } from "./progression-types";

export type ReferralContributionProof = {
  sourceTable: "actions";
  sourceId: string;
  occurredOn: string;
};

type CurrentReferralContribution = {
  proof: ReferralContributionProof;
  eligibleSourceIds: Set<string>;
};

type ReferralEventRow = {
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ReferralReconciliationConfig = {
  eventType: ProgressionEventType;
  sourceTable: string;
  sourceIdPrefix: string;
  xp: number;
  cacheTag: string;
};

async function loadCurrentReferralContribution(
  supabase: SupabaseClient,
  inviteeUserId: string,
  fallbackOccurredOn?: string,
): Promise<CurrentReferralContribution | null> {
  const actions = await loadActionRowsForUser(supabase, inviteeUserId);
  const validatedActionIds = await loadValidatedActionIdsForUser(supabase, inviteeUserId, {
    actionRows: actions,
  });
  const eligibleActions = actions
    .filter((action) => action.status === "approved" && validatedActionIds.has(action.id))
    .sort((left, right) => {
      const dateOrder = (right.action_date || right.created_at || "").localeCompare(
        left.action_date || left.created_at || "",
      );
      return dateOrder || left.id.localeCompare(right.id);
    });
  const eligibleAction = eligibleActions[0];

  if (!eligibleAction) {
    return null;
  }

  return {
    proof: {
      sourceTable: "actions",
      sourceId: eligibleAction.id,
      occurredOn: (
        eligibleAction.action_date ||
        eligibleAction.created_at ||
        fallbackOccurredOn ||
        new Date().toISOString()
      ).slice(0, 10),
    },
    eligibleSourceIds: new Set(eligibleActions.map((action) => action.id)),
  };
}

async function loadReferralEvents(
  supabase: SupabaseClient,
  inviterUserId: string,
  inviteeUserId: string,
  config: ReferralReconciliationConfig,
): Promise<ReferralEventRow[]> {
  const sourceId = `${config.sourceIdPrefix}${inviteeUserId}`;
  const { data, error } = await supabase
    .from("progression_events")
    .select("id, metadata")
    .eq("user_id", inviterUserId)
    .eq("event_type", config.eventType)
    .eq("source_table", config.sourceTable)
    .eq("source_id", sourceId)
    .eq("status_phase", "validated")
    .limit(10000);

  if (error) {
    throw error;
  }

  return (data ?? []) as ReferralEventRow[];
}

async function deleteReferralEvents(
  supabase: SupabaseClient,
  inviterUserId: string,
  inviteeUserId: string,
  config: ReferralReconciliationConfig,
): Promise<void> {
  const sourceId = `${config.sourceIdPrefix}${inviteeUserId}`;
  const { error } = await supabase
    .from("progression_events")
    .delete()
    .eq("user_id", inviterUserId)
    .eq("event_type", config.eventType)
    .eq("source_table", config.sourceTable)
    .eq("source_id", sourceId)
    .eq("status_phase", "validated");

  if (error) {
    throw error;
  }
}

async function refreshInviterProgressionProfile(
  supabase: SupabaseClient,
  inviterUserId: string,
): Promise<void> {
  const { refreshProgressionProfile } = await import("./progression-tracking");
  await refreshProgressionProfile(supabase, inviterUserId);
}

function hasCurrentReferralProof(
  existingEvent: ReferralEventRow | null,
  currentContribution: CurrentReferralContribution | null,
  inviteeUserId: string,
): boolean {
  const existingProof = existingEvent?.metadata ?? null;
  return (
    existingEvent !== null &&
    currentContribution !== null &&
    existingProof?.inviteeUserId === inviteeUserId &&
    existingProof?.contributionSourceTable === "actions" &&
    currentContribution.eligibleSourceIds.has(
      String(existingProof?.contributionSourceId ?? ""),
    )
  );
}

export async function reconcileReferralAward(
  supabase: SupabaseClient,
  inviterUserId: string,
  inviteeUserId: string,
  config: ReferralReconciliationConfig,
  fallbackOccurredOn?: string,
): Promise<{
  inserted: boolean;
  proof: ReferralContributionProof | null;
}> {
  const [currentContribution, existingEvents] = await Promise.all([
    loadCurrentReferralContribution(supabase, inviteeUserId, fallbackOccurredOn),
    loadReferralEvents(supabase, inviterUserId, inviteeUserId, config),
  ]);
  const existingEvent = existingEvents.length === 1 ? existingEvents[0] : null;

  if (!currentContribution && existingEvents.length === 0) {
    return { inserted: false, proof: null };
  }

  if (
    currentContribution !== null &&
    hasCurrentReferralProof(existingEvent, currentContribution, inviteeUserId)
  ) {
    return { inserted: false, proof: currentContribution.proof };
  }

  if (existingEvents.length > 0) {
    await deleteReferralEvents(supabase, inviterUserId, inviteeUserId, config);
  }

  if (!currentContribution) {
    await refreshInviterProgressionProfile(supabase, inviterUserId);
    revalidateTag(config.cacheTag, "max");
    return { inserted: false, proof: null };
  }

  const sourceId = `${config.sourceIdPrefix}${inviteeUserId}`;
  const inserted = await insertProgressionEvent(supabase, {
    userId: inviterUserId,
    eventType: config.eventType,
    sourceTable: config.sourceTable,
    sourceId,
    statusPhase: "validated",
    weight: 1,
    xpBase: config.xp,
    xpAwarded: config.xp,
    occurredOn: currentContribution.proof.occurredOn,
    metadata: {
      inviteeUserId,
      contributionSourceTable: currentContribution.proof.sourceTable,
      contributionSourceId: currentContribution.proof.sourceId,
      referralAwardedXp: config.xp,
    },
  });

  await refreshInviterProgressionProfile(supabase, inviterUserId);
  revalidateTag(config.cacheTag, "max");
  return { inserted, proof: currentContribution.proof };
}
