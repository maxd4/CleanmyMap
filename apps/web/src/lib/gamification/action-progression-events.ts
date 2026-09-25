import { computeActionBalanceSummary } from "./action-balance";
import { computeMonthlyRegularityAwards } from "./monthly-regularity";
import type { ActionRow, EventInsertParams } from "./progression-types";

type WriteProgressionEvent = (params: EventInsertParams) => Promise<boolean>;

export async function writeActionProgressionEvents(params: {
  userId: string;
  actions: ActionRow[];
  validatedActionIds: Set<string>;
  writeEvent: WriteProgressionEvent;
}): Promise<void> {
  const { userId, actions, validatedActionIds, writeEvent } = params;

  for (const award of computeMonthlyRegularityAwards(actions)) {
    await writeEvent({
      userId,
      eventType: "action_monthly_regularity",
      sourceTable: "actions",
      sourceId: award.sourceId,
      statusPhase: "validated",
      weight: 1,
      xpBase: award.xpAwarded,
      xpAwarded: award.xpAwarded,
      occurredOn: award.occurredOn,
      metadata: {
        monthKey: award.monthKey,
        actionCount: award.actionCount,
        streak: award.streak,
      },
    });
  }

  for (const award of computeActionBalanceSummary(actions, validatedActionIds).awards) {
    await writeEvent({
      userId,
      eventType: "action_balance_cycle",
      sourceTable: "actions",
      sourceId: award.sourceId,
      statusPhase: "validated",
      weight: 1,
      xpBase: award.xpAwarded,
      xpAwarded: award.xpAwarded,
      occurredOn: award.occurredOn,
      metadata: {
        cycleIndex: award.cycleIndex,
        requiredPerType: award.requiredPerType,
      },
    });
  }
}
