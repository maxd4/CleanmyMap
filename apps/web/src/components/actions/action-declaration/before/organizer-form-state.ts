import type { FormState } from "../model";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";

export function applyOrganizerFormUpdates(
  nextForm: FormState,
  previousForm: FormState,
  updates: Partial<FormState>,
): void {
  if ("organizerType" in updates && updates.organizerType !== previousForm.organizerType) {
    nextForm.organizerId = null;
    nextForm.organizerName = updates.organizerType === "spontaneous"
      ? nextForm.organizerAccounts.trim()
        ? SPONTANEOUS_PENDING_ORGANIZER_LABEL
        : nextForm.actorName
      : "";
    nextForm.associationName = updates.organizerType === "spontaneous" ? "Action spontanée" : "";
  }
  if ("organizerName" in updates && !("organizerId" in updates)) {
    nextForm.organizerId = null;
    nextForm.associationName = nextForm.organizerType === "spontaneous"
      ? "Action spontanée"
      : String(updates.organizerName ?? "").trim();
  }
  if ("organizerId" in updates && updates.organizerId) {
    nextForm.associationName = nextForm.organizerName;
  }
}
