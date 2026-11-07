import type { CreateActionPayload } from "../../../lib/actions/types";
import {
  buildVolunteerParticipationFromForm as buildVolunteerParticipationFromCategories,
  normalizeVolunteerParticipation,
  type VolunteerParticipationInput,
} from "../../../lib/actions/volunteer-participation";
import type { FormState } from "./model";
import type { CreateActionPayloadParts } from "./payload-contract";
import { toOptionalNumber, toRequiredNumber } from "./payload-numbers";
import { resolveOrganizerPayload } from "./organizer-payload";
import type { DeclarationMode } from "./types";
import {
  ACTION_WASTE_CHARACTERIZATION_SLUGS,
  type ActionWasteCharacterization,
} from "@/lib/waste";

function resolveCigaretteButtsLots(form: FormState) {
  if (form.cigaretteButtsLots === null) return undefined;
  return form.cigaretteButtsLots.map((lot) => ({
    id: lot.id,
    source: lot.source,
    value: Number(lot.value),
    condition: lot.condition,
  }));
}

function resolveWasteCharacterization(form: FormState): ActionWasteCharacterization | undefined {
  const characterization = Object.fromEntries(
    ACTION_WASTE_CHARACTERIZATION_SLUGS.flatMap((slug): Array<[typeof slug, number | null]> => {
      if (!Object.prototype.hasOwnProperty.call(form.wasteCharacterizationKg, slug)) return [];
      const raw = form.wasteCharacterizationKg[slug]?.trim() ?? "";
      if (!raw) return [[slug, null]];
      const value = toOptionalNumber(raw);
      return value === undefined ? [] : [[slug, value]];
    }),
  ) as ActionWasteCharacterization;
  return Object.keys(characterization).length > 0 ? characterization : undefined;
}

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
  return buildVolunteerParticipationFromCategories({
    childrenCount: form.childrenCount,
    adultCount: form.adultCount,
    retiredCount: form.retiredCount,
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
    cigaretteButtsLots: resolveCigaretteButtsLots(form),
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
  declarationMode: DeclarationMode,
): Partial<CreateActionPayload> {
  const { enteredMegotsKg, enteredButtsCount, enteredVolumeLiters, cigaretteButtsCondition } = parts;
  const derivedVolunteersCount =
    declarationMode === "complete"
      ? parts.volunteerParticipation.participantsCount
      : toOptionalNumber(form.volunteersCount) ?? parts.volunteerParticipation.participantsCount ?? 1;
  return {
    wasteKg: toOptionalNumber(form.wasteKg) ?? null,
    cigaretteButtsMeasurements: parts.rawCigaretteButtsMeasurements,
    cigaretteButtsLots: parts.rawCigaretteButtsMeasurements.cigaretteButtsLots,
    cigaretteButtsMassKg: enteredMegotsKg,
    cigaretteButtsVolumeLiters: enteredVolumeLiters,
    cigaretteButtsCondition,
    cigaretteButtsKg: enteredMegotsKg,
    cigaretteButts: enteredButtsCount,
    cigaretteButtsCount: enteredButtsCount,
    volunteerParticipation: parts.volunteerParticipationInput as CreateActionPayload["volunteerParticipation"],
    ...(derivedVolunteersCount === null || derivedVolunteersCount === undefined
      ? {}
      : { volunteersCount: derivedVolunteersCount }),
    durationMinutes: Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
    eventStartTime: form.eventStartTime.trim() || null,
    eventEndTime: form.eventEndTime.trim() || null,
    wasteMeasurementMethod: form.wasteMeasurementMethod || undefined,
    wasteBreakdown: {
      recyclablesKg: toOptionalNumber(form.wasteRecyclablesKg) ?? null,
      glassKg: toOptionalNumber(form.wasteGlassKg) ?? null,
      householdWasteKg: toOptionalNumber(form.wasteHouseholdKg) ?? null,
      otherWasteKg: toOptionalNumber(form.wasteOtherKg) ?? null,
      characterizationKg: resolveWasteCharacterization(form),
      unusualObjects: form.wasteUnusualObjects.trim() || null,
      specialHandlingWaste: form.wasteSpecialHandlingWaste.trim() || null,
    },
  };
}
