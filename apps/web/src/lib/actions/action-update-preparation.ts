import { preserveHistoricalRouteCalibrationContext } from "@/lib/route/route-calibration";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import {
  normalizeAdministrativeRequirements,
  preserveCanonicalAdministrativeRequirements,
} from "./administrative-requirements";
import {
  preserveCanonicalFormalitiesWorkflow,
  preserveFormalitiesContextWhenOmitted,
} from "./formalities-workflow";

export function prepareActionUpdateBody(
  current: ActionRow,
  parsedBody: ActionUpdateInput,
): ActionUpdateInput {
  if (parsedBody.preparationData === undefined) {
    return parsedBody;
  }

  const preservedAdministrativeRequirements = preserveCanonicalAdministrativeRequirements(
    current.preparation_data,
    preserveHistoricalRouteCalibrationContext(
      current.preparation_data,
      parsedBody.preparationData,
    ),
  );
  const withFormalitiesWorkflow = preserveCanonicalFormalitiesWorkflow(
    current.preparation_data,
    preservedAdministrativeRequirements as Record<string, unknown>,
  );
  const preservedPreparationData = preserveFormalitiesContextWhenOmitted(
    current.preparation_data,
    withFormalitiesWorkflow,
  ) as typeof parsedBody.preparationData;

  return { ...parsedBody, preparationData: preservedPreparationData };
}

export function hasPendingAdministrativeRequirements(
  current: ActionRow,
  body: ActionUpdateInput,
): boolean {
  const nextActionPhase = body.actionPhase ?? current.action_phase;
  const nextPreparationState =
    body.preparationData?.preparationState ??
    current.preparation_data?.preparationState;

  return (
    nextActionPhase === "pre_action" &&
    nextPreparationState === "action_en_cours" &&
    normalizeAdministrativeRequirements(
      current.preparation_data?.administrativeRequirements,
    ).status === "pending"
  );
}
