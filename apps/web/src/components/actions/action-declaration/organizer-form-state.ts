import type { FormState } from "./types";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";

export function applyOrganizerFormUpdates(
  nextForm: FormState,
  previousForm: FormState,
  updates: Partial<FormState>,
): void {
  if (updates.organizerType !== undefined && updates.organizerType !== previousForm.organizerType) {
    nextForm.organizerType = updates.organizerType;
    const organizerTypeDrafts = {
      ...previousForm.organizerTypeDrafts,
      ...(previousForm.organizerType ? {
        [previousForm.organizerType]: {
          organizerId: previousForm.organizerId,
          organizerName: previousForm.organizerName,
          associationName: previousForm.associationName,
          ...(previousForm.organizerReferenceStatus ? { organizerReferenceStatus: previousForm.organizerReferenceStatus } : {}),
        },
      } : {}),
    };
    const restored = updates.organizerType ? organizerTypeDrafts[updates.organizerType] : undefined;
    nextForm.organizerTypeDrafts = organizerTypeDrafts;
    nextForm.organizerId = restored?.organizerId ?? null;
    nextForm.organizerName = restored?.organizerName ?? (updates.organizerType === "spontaneous" && nextForm.organizerAccounts.trim()
      ? SPONTANEOUS_PENDING_ORGANIZER_LABEL
      : "");
    nextForm.associationName = restored?.associationName ?? (updates.organizerType === "spontaneous" ? "Action spontanée" : "");
    nextForm.organizerReferenceStatus = restored?.organizerReferenceStatus ?? null;
  }
  if (updates.organizerName !== undefined && !("organizerId" in updates)) {
    nextForm.organizerId = null;
    nextForm.associationName = nextForm.organizerType === "spontaneous" ? "Action spontanée" : updates.organizerName.trim();
  }
  if (nextForm.organizerType && ("organizerName" in updates || "organizerId" in updates)) {
    nextForm.organizerTypeDrafts = {
      ...nextForm.organizerTypeDrafts,
      [nextForm.organizerType]: {
        organizerId: nextForm.organizerId,
        organizerName: nextForm.organizerName,
        associationName: nextForm.associationName,
        ...(nextForm.organizerReferenceStatus ? { organizerReferenceStatus: nextForm.organizerReferenceStatus } : {}),
      },
    };
  }
}
