import type { FormState } from "../model";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";

export function applyOrganizerFormUpdates(
  nextForm: FormState,
  previousForm: FormState,
  updates: Partial<FormState>,
): void {
  if ("organizerType" in updates && updates.organizerType !== previousForm.organizerType) {
    const nextOrganizerType = updates.organizerType ?? "";
    nextForm.organizerType = nextOrganizerType;
    const organizerTypeDrafts = {
      ...previousForm.organizerTypeDrafts,
      ...(previousForm.organizerType ? {
        [previousForm.organizerType]: {
          organizerId: previousForm.organizerId,
          organizerName: previousForm.organizerName,
          associationName: previousForm.associationName,
        },
      } : {}),
    };
    const restored = nextOrganizerType ? organizerTypeDrafts[nextOrganizerType] : undefined;
    nextForm.organizerTypeDrafts = organizerTypeDrafts;
    nextForm.organizerId = restored?.organizerId ?? null;
    nextForm.organizerName = restored?.organizerName ?? (nextOrganizerType === "spontaneous"
      ? nextForm.organizerAccounts.trim()
        ? SPONTANEOUS_PENDING_ORGANIZER_LABEL
        : nextForm.actorName
      : "");
    nextForm.associationName = restored?.associationName ?? (nextOrganizerType === "spontaneous" ? "Action spontanée" : "");
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
  if (nextForm.organizerType && ("organizerName" in updates || "organizerId" in updates)) {
    nextForm.organizerTypeDrafts = {
      ...nextForm.organizerTypeDrafts,
      [nextForm.organizerType]: {
        organizerId: nextForm.organizerId,
        organizerName: nextForm.organizerName,
        associationName: nextForm.associationName,
      },
    };
  }
}
