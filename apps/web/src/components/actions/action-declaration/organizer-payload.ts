import type { FormState } from "./types";

export function resolveOrganizerPayload(form: FormState, isEntrepriseMode = false): {
  isSpontaneousAction: boolean;
  organizerName: string;
  associationName: string;
} {
  void isEntrepriseMode;
  const isSpontaneousAction =
    form.organizerType === "spontaneous" ||
    form.associationName === "Action spontanée" ||
    form.associationName === "__autre_benevole__";
  const organizerName = form.organizerName.trim() || (isSpontaneousAction ? form.actorName.trim() : "");
  return {
    isSpontaneousAction,
    organizerName,
    associationName: isSpontaneousAction ? "Action spontanée" : organizerName || form.associationName,
  };
}

export function buildOrganizerPayloadFields(form: FormState, organizerName: string) {
  return {
    organizerType: form.organizerType || undefined,
    organizerId: form.organizerId,
    organizerName,
  };
}
