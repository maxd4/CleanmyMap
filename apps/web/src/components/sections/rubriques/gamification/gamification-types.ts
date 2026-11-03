import type { UserProgressionResponse } from "@/lib/gamification/progression/progression-types";
import type {
  GamificationReconciliationHistoryEntry,
  PendingGamificationReconciliation,
} from "@/lib/gamification/reconciliation/gamification-reconciliation-notice";

export type MeResponse = {
  status: "ok";
  progression: UserProgressionResponse;
  reconciliation: PendingGamificationReconciliation | null;
  reconciliationHistory: GamificationReconciliationHistoryEntry[];
  reconciliationTarget: GamificationReconciliationHistoryEntry | null;
};
