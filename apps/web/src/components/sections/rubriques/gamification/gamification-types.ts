import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import type {
  GamificationReconciliationHistoryEntry,
  PendingGamificationReconciliation,
} from "@/lib/gamification/gamification-reconciliation-notice";

export type MeResponse = {
  status: "ok";
  progression: UserProgressionResponse;
  reconciliation: PendingGamificationReconciliation | null;
  reconciliationHistory: GamificationReconciliationHistoryEntry[];
  reconciliationTarget: GamificationReconciliationHistoryEntry | null;
};
