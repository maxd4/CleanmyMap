import type { FormState } from "./types";

export function applyOrganizerFormUpdates(
  nextForm: FormState,
  previousForm: FormState,
  updates: Partial<FormState>,
): void {
  if (updates.organizerType !== undefined && updates.organizerType !== previousForm.organizerType) {
    nextForm.organizerId = null;
    nextForm.organizerName = updates.organizerType === "spontaneous" ? nextForm.actorName : "";
    nextForm.associationName = updates.organizerType === "spontaneous" ? "Action spontanée" : "";
  }
  if (updates.organizerName !== undefined && !("organizerId" in updates)) {
    nextForm.organizerId = null;
    nextForm.associationName = nextForm.organizerType === "spontaneous" ? "Action spontanée" : updates.organizerName.trim();
  }
}
