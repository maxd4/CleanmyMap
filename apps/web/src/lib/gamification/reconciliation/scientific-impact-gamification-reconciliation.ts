import type { SupabaseClient } from "@supabase/supabase-js";
import { GAMIFICATION_RULES_V1 } from "../progression/gamification-rules";
import {
  loadGamificationReconciliationSnapshot,
} from "./gamification-reconciliation-plan";
import {
  reconcileUserGamification,
  type GamificationReconciliationResult,
} from "./gamification-reconciliation";
import {
  buildGamificationReconciliationReceipt,
  loadPendingScientificImpactReceipt,
  persistGamificationReconciliationReceipt,
} from "./gamification-reconciliation-receipt";
import {
  MOHS_IMPACT_CALCULATION_VERSION,
  buildLegacyMohsScientificReconciliationId,
  buildMohsScientificReconciliationId,
  previewMohsImpactProgression,
  reconcileMohsImpactProgression,
  type MohsImpactReconciliationPreview,
  type MohsReconciliationResult,
} from "./mohs-impact-reconciliation";

export type ScientificImpactGamificationPreview = {
  plan: Awaited<ReturnType<typeof loadGamificationReconciliationSnapshot>>["plan"];
  impact: MohsImpactReconciliationPreview;
};

export type ScientificImpactGamificationResult = GamificationReconciliationResult & {
  impact: MohsReconciliationResult;
};

function attachImpactPlan(
  plan: ScientificImpactGamificationPreview["plan"],
  impact: Pick<MohsImpactReconciliationPreview, "methodVersion" | "eventsToAdd" | "eventsToUpdate" | "eventsToRemove" | "eligibleSourceRows" | "sourceFingerprint">,
) {
  return {
    ...plan,
    scientificImpact: {
      methodVersion: impact.methodVersion,
      eventsToAdd: impact.eventsToAdd,
      eventsToUpdate: impact.eventsToUpdate,
      eventsToRemove: impact.eventsToRemove,
      eligibleSourceRows: impact.eligibleSourceRows,
      sourceFingerprint: impact.sourceFingerprint,
    },
  };
}

/**
 * Read-only diff for the scientific impact projection and the ordinary
 * CURRENT gamification ledger. No source row or progression projection is
 * written by this function.
 */
export async function previewScientificImpactGamification(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScientificImpactGamificationPreview> {
  const [snapshot, impact] = await Promise.all([
    loadGamificationReconciliationSnapshot(supabase, userId, GAMIFICATION_RULES_V1),
    previewMohsImpactProgression(supabase, userId),
  ]);
  return {
    plan: attachImpactPlan(snapshot.plan, impact),
    impact,
  };
}

/**
 * Converges source-derived impact awards before refreshing the CURRENT
 * profile. Each step is replay-safe: a failure after the Mohs projection can
 * be resumed with the same user and will not duplicate logical events.
 */
export async function reconcileScientificImpactGamification(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScientificImpactGamificationResult> {
  const impact = await reconcileMohsImpactProgression(supabase, userId, {
    persistScientificReceiptIntent: true,
  });
  const impactChanged = impact.inserted > 0 || impact.updated > 0 || impact.removed > 0;
  const reconciliationId = buildMohsScientificReconciliationId(
    userId,
    impact.methodVersion,
    impact.sourceFingerprint,
  );
  const legacyReconciliationId = buildLegacyMohsScientificReconciliationId(
    userId,
    impact.methodVersion,
    impact.sourceFingerprint,
  );
  const pendingIntent = impactChanged
    ? null
    : await loadPendingScientificImpactReceipt(
        supabase,
        userId,
        reconciliationId,
        legacyReconciliationId === reconciliationId ? [] : [legacyReconciliationId],
      );
  const receiptReconciliationId = pendingIntent?.reconciliationId ?? reconciliationId;
  const scientificImpact = impactChanged
    ? {
        methodVersion: impact.methodVersion,
        sourceFingerprint: impact.sourceFingerprint,
        eventsAdded: impact.inserted,
        eventsUpdated: impact.updated,
        eventsRemoved: impact.removed,
      }
    : pendingIntent?.scientificImpact ?? null;
  const gamification = await reconcileUserGamification(supabase, userId, {
    rules: GAMIFICATION_RULES_V1,
    reasonCategory: "scientific_impact_update",
    persistReceipt: scientificImpact === null,
  });
  let receipt = gamification.receipt;
  if (scientificImpact) {
    receipt = {
      ...buildGamificationReconciliationReceipt(gamification.plan, {
        reasonCategory: "scientific_impact_update",
        reconciliationId: receiptReconciliationId,
        rules: GAMIFICATION_RULES_V1,
      }),
      scientificImpact,
      hasUserVisibleChanges: true,
    };
    await persistGamificationReconciliationReceipt(supabase, receipt);
  }
  return {
    ...gamification,
    impact,
    receipt,
    plan: attachImpactPlan(gamification.plan, {
      methodVersion: impact.methodVersion || MOHS_IMPACT_CALCULATION_VERSION,
      eventsToAdd: impact.inserted,
      eventsToUpdate: impact.updated,
      eventsToRemove: impact.removed,
      eligibleSourceRows: impact.eligibleSourceRows,
      sourceFingerprint: impact.sourceFingerprint,
    }),
  };
}
