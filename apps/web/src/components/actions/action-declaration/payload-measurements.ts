import type { CreateActionPayload } from "../../../lib/actions/types";
import {
  normalizeVolunteerParticipation,
  type VolunteerParticipationInput,
} from "../../../lib/actions/volunteer-participation";
import type { FormState } from "./model";
import type { CreateActionPayloadParts } from "./payload-contract";
import { toOptionalNumber, toRequiredNumber } from "./payload-numbers";
import { resolveOrganizerPayload } from "./organizer-payload";

export function buildVolunteerParticipationFromForm(
  form: FormState,
): VolunteerParticipationInput {
  return {
    childrenCount: toOptionalNumber(form.childrenCount) ?? null,
    adultCount: toOptionalNumber(form.adultCount) ?? null,
    retiredCount: toOptionalNumber(form.retiredCount) ?? null,
  };
}

export function resolveCreateActionMeasurementParts(
  form: FormState,
  isEntrepriseMode: boolean,
): Pick<
  CreateActionPayloadParts,
  | "isSpontaneousAction"
  | "organizerName"
  | "associationName"
  | "enteredMegotsKg"
  | "enteredButtsCount"
  | "enteredVolumeLiters"
  | "cigaretteButtsCondition"
  | "rawCigaretteButtsMeasurements"
  | "volunteerParticipationInput"
  | "volunteerParticipation"
> {
  const { isSpontaneousAction, organizerName, associationName } = resolveOrganizerPayload(form, isEntrepriseMode);
  const enteredMegotsKg = toOptionalNumber(form.wasteMegotsKg) ?? null;
  const enteredButtsCount = toOptionalNumber(form.cigaretteButtsCount) ?? null;
  const enteredVolumeLiters = toOptionalNumber(form.cigaretteButtsVolumeLiters) ?? null;
  const cigaretteButtsCondition = form.wasteMegotsCondition === "propre"
    ? form.cigaretteButtsCondition
    : form.wasteMegotsCondition;
  const rawCigaretteButtsMeasurements = {
    cigaretteButtsCount: enteredButtsCount,
    cigaretteButtsMassKg: enteredMegotsKg,
    cigaretteButtsVolumeLiters: enteredVolumeLiters,
    cigaretteButtsCondition,
  };
  const volunteerParticipationInput = buildVolunteerParticipationFromForm(form);
  const volunteerParticipation = normalizeVolunteerParticipation(volunteerParticipationInput);
  return {
    isSpontaneousAction,
    organizerName,
    associationName,
    enteredMegotsKg,
    enteredButtsCount,
    enteredVolumeLiters,
    cigaretteButtsCondition,
    rawCigaretteButtsMeasurements,
    volunteerParticipationInput,
    volunteerParticipation,
  };
}

export function buildCreateActionPayloadMeasurementFields(
  form: FormState,
  parts: CreateActionPayloadParts,
): Partial<CreateActionPayload> {
  const { enteredMegotsKg, enteredButtsCount, enteredVolumeLiters, cigaretteButtsCondition } = parts;
  return {
    wasteKg: toOptionalNumber(form.wasteKg) ?? null,
    cigaretteButtsMeasurements: parts.rawCigaretteButtsMeasurements,
    cigaretteButtsMassKg: enteredMegotsKg,
    cigaretteButtsVolumeLiters: enteredVolumeLiters,
    cigaretteButtsCondition,
    cigaretteButtsKg: enteredMegotsKg,
    cigaretteButts: enteredButtsCount,
    cigaretteButtsCount: enteredButtsCount,
    volunteerParticipation: parts.volunteerParticipationInput as CreateActionPayload["volunteerParticipation"],
    volunteersCount:
      parts.volunteerParticipation.participantsCount ??
      Math.trunc(toRequiredNumber(form.volunteersCount, 0)),
    durationMinutes: Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
    eventStartTime: form.eventStartTime.trim() || null,
    eventEndTime: form.eventEndTime.trim() || null,
    wasteMeasurementMethod: form.wasteMeasurementMethod || undefined,
    wasteBreakdown: {
      recyclablesKg: toOptionalNumber(form.wasteRecyclablesKg) ?? null,
      glassKg: toOptionalNumber(form.wasteGlassKg) ?? null,
      householdWasteKg: toOptionalNumber(form.wasteHouseholdKg) ?? null,
      otherWasteKg: toOptionalNumber(form.wasteOtherKg) ?? null,
      unusualObjects: form.wasteUnusualObjects.trim() || null,
      specialHandlingWaste: form.wasteSpecialHandlingWaste.trim() || null,
    },
  };
}
