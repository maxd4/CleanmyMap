import type { FormState } from "./types";
import { initialState } from "./model";
export { OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "./payload-contract";
export {
  parseOrganizerAccounts,
  normalizeParticipantAccounts,
} from "./payload-identity";
export {
  buildPreparationDataFromForm,
  applyPreparationDataToForm,
} from "./payload-preparation";
export { toOptionalNumber, toRequiredNumber } from "./payload-numbers";
export { isDrawingValid, isLocationLikelyPark } from "./payload-geometry";
export {
  buildCreateActionPayload,
  prepareCreateActionPayload,
} from "./payload-assembly";

export function createInitialFormState(
  actorName: string,
  recordType: FormState["recordType"] = "action",
): FormState {
  return { ...initialState, actorName, recordType };
}
