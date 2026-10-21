import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { loadActionById } from "@/lib/actions/store-queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { DetailLevelId, ModuleState } from "@/lib/reports/report-pdf-data";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { buildSingleActionReportGenerationResult } from "@/lib/reports/single-action-report-builder";

export type SingleActionReportRequest = {
  type: "single_action";
  actionId: string;
};

export class SingleActionReportTargetUnavailableError extends Error {
  constructor() {
    super("The requested action is not an eligible public completed action.");
    this.name = "SingleActionReportTargetUnavailableError";
  }
}

function isEligibleSingleAction(row: {
  status: string;
  action_phase?: string | null;
  published_at?: string | null;
  moderation_visibility?: string | null;
  access_mode?: string | null;
}): boolean {
  return row.status === "approved" &&
    row.action_phase === "post_action_complete" &&
    Boolean(row.published_at) &&
    row.moderation_visibility === "visible" &&
    row.access_mode !== "invite_link";
}

export async function resolveSingleActionReportContract(actionId: string): Promise<ActionDataContract> {
  const row = await loadActionById(getSupabaseServerClient(true), actionId);
  if (!row || !isEligibleSingleAction(row)) {
    throw new SingleActionReportTargetUnavailableError();
  }
  const contract = toActionContract(row);
  if (contract.type !== "action" || contract.status !== "approved" || contract.metadata.actionPhase !== "post_action_complete") {
    throw new SingleActionReportTargetUnavailableError();
  }
  return contract;
}

export function getSingleActionReportScopeLabel(contract: ActionDataContract): string {
  const preparedTitle = contract.metadata.preparationData?.actionTitle;
  return typeof preparedTitle === "string" && preparedTitle.trim()
    ? preparedTitle.trim()
    : contract.location.label.trim() || contract.id;
}

export function buildSingleActionReportGenerationInput(params: {
  request: SingleActionReportRequest;
  contract: ActionDataContract;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  now: Date;
  generationId?: string;
}): ReportGenerationHistoryInput {
  return buildSingleActionReportGenerationResult({
    contract: params.contract,
    actionId: params.request.actionId,
    scopeLabel: getSingleActionReportScopeLabel(params.contract),
    detailLevel: params.detailLevel,
    modules: params.modules,
    now: params.now,
    generationId: params.generationId ?? randomUUID(),
  });
}
import { randomUUID } from "node:crypto";
