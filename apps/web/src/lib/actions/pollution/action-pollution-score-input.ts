import type { ActionDataContract } from "../contracts/contract-model";
import type { PollutionScoreInputs } from "./pollution-score";

export function toPollutionScoreInput(
  action: ActionDataContract,
): PollutionScoreInputs {
  return {
    wasteKg: action.metadata.wasteKg,
    cigaretteButts: action.metadata.cigaretteButts,
    volunteersCount: action.metadata.volunteersCount,
    durationMinutes: action.metadata.durationMinutes,
    actionType: action.type,
    status: action.status,
    actionPhase: action.metadata.actionPhase,
  };
}
