import { buildActionInsights } from "../insights";
import { projectPublicActionMapItem } from "../public-dto";
import { toActionMapItem } from "../contracts/contract-mappers";
import type { ActionDataContract } from "../contracts/contract-model";
import type { ActionImpactLevel, ActionMapItem } from "../types";
import type { PollutionScoreReferences } from "../pollution/pollution-score";

export function buildPublicMapItems(
  contracts: ActionDataContract[],
  pollutionScoreReferences: PollutionScoreReferences | null,
  impact: ActionImpactLevel | null,
  qualityMin: number | null,
  limit: number,
): ActionMapItem[] {
  const now = new Date();
  return contracts
    .map((contract) => {
      const insights = buildActionInsights(contract, now);
      return projectPublicActionMapItem(toActionMapItem(contract, insights, pollutionScoreReferences));
    })
    .filter((item) => {
      if (impact && item.impact_level !== impact) {
        return false;
      }
      if (qualityMin === null) {
        return true;
      }
      return Number(item.quality_score ?? 0) >= qualityMin;
    })
    .slice(0, limit);
}
