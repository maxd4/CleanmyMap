import type { ActionRow } from "@/types/database";
import { deriveActionFormalitiesFactsFromAction } from "./formalities-action-context";
import { qualifyActionFormalities } from "./formalities-qualification";
import { buildFormalitiesTerritoryFingerprint } from "./formalities-rules";
import {
  buildFormalitiesWorkflowState,
  getBlockedRequiredFormalityIds,
  normalizeActionFormalitiesWorkflow,
} from "./formalities-workflow";

export type ActionFormalitiesPublicationValidation =
  | {
      ok: true;
      formalitiesContext: Awaited<ReturnType<typeof deriveActionFormalitiesFactsFromAction>>;
      formalitiesWorkflow: ReturnType<typeof buildFormalitiesWorkflowState>;
    }
  | {
      ok: false;
      blockedFormalityIds: string[];
    };

/** Requalifies the persisted action before any operation can publish it. */
export async function validateActionFormalitiesForPublication(
  current: ActionRow,
): Promise<ActionFormalitiesPublicationValidation> {
  const formalitiesContext = await deriveActionFormalitiesFactsFromAction(current);
  const qualification = qualifyActionFormalities(formalitiesContext);
  const formalitiesWorkflow = buildFormalitiesWorkflowState({
    facts: formalitiesContext,
    qualification,
    previous: normalizeActionFormalitiesWorkflow(current.preparation_data?.formalitiesWorkflow),
    actionDependencies: {
      locationLabel: current.location_label,
      actionDate: current.action_date,
      territoryFingerprint: buildFormalitiesTerritoryFingerprint(formalitiesContext.territory),
    },
  });
  const blockedFormalityIds = getBlockedRequiredFormalityIds(qualification, formalitiesWorkflow);
  if (blockedFormalityIds.length > 0) {
    return { ok: false, blockedFormalityIds };
  }
  return { ok: true, formalitiesContext, formalitiesWorkflow };
}
