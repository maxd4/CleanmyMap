import type { CreateActionPayload } from "../../../lib/actions/types";
import {
  deriveVolunteerParticipationFromTotal,
  normalizeVolunteerParticipation,
  type VolunteerParticipationInput,
} from "../../../lib/actions/volunteer-participation";
import type { FormState } from "./model";
import type { CreateActionPayloadParts } from "./payload-contract";
import { toOptionalNumber, toRequiredNumber } from "./payload-numbers";
import { resolveOrganizerPayload } from "./organizer-payload";
import type { DeclarationMode } from "./types";

export function buildVolunteerParticipationFromForm(
  form: FormState,
): VolunteerParticipationInput {
  const childrenCount = toOptionalNumber(form.childrenCount) ?? null;
  const adultCount = toOptionalNumber(form.adultCount) ?? null;
  const retiredCount = toOptionalNumber(form.retiredCount) ?? null;
  if (adultCount === null && childrenCount === 0 && retiredCount === 0) {
    return {
      childrenCount: null,
      adultCount: null,
      retiredCount: null,
    };
  }
  return {
    childrenCount,
    adultCount,
    retiredCount,
  };
}

export function buildActionVolunteerParticipationFromForm(
  form: FormState,
): VolunteerParticipationInput {
  return deriveVolunteerParticipationFromTotal({
    volunteersCount: toOptionalNumber(form.volunteersCount) ?? null,
    childrenCount: toOptionalNumber(form.childrenCount) ?? null,
    retiredCount: toOptionalNumber(form.retiredCount) ?? null,
  });
}

export function resolveCreateActionMeasurementParts(
  form: FormState,
  isEntrepriseMode: boolean,
  declarationMode: DeclarationMode,
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
  const cigaretteButtsCondition = form.wasteMegotsCondition;
  const rawCigaretteButtsMeasurements = {
    cigaretteButtsCount: enteredButtsCount,
    cigaretteButtsMassKg: enteredMegotsKg,
    cigaretteButtsVolumeLiters: enteredVolumeLiters,
    cigaretteButtsCondition,
    cigaretteButtsInputSource: form.cigaretteButtsInputSource,
  };
  const volunteerParticipationInput =
    declarationMode === "complete"
      ? buildActionVolunteerParticipationFromForm(form)
      : buildVolunteerParticipationFromForm(form);
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
      toOptionalNumber(form.volunteersCount) ??
      parts.volunteerParticipation.participantsCount ??
      1,
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
