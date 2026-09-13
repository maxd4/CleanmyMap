import {
  normalizeCigaretteButtsMeasurements,
  type ActionCigaretteButtsMeasurements,
  type CigaretteButtsMeasurementInput,
} from "@/lib/waste/cigarette-butts";

type ModerationMeasurementEdits = {
  cigaretteButtsMeasurements?: CigaretteButtsMeasurementInput | null;
  cigaretteButts?: number | null;
  cigaretteButtsMassKg?: number | null;
  cigaretteButtsVolumeLiters?: number | null;
  cigaretteButtsCondition?: "propre" | "humide" | "mouille" | null;
  cigaretteButtsKg?: number | null;
};

type ParsedModerationMeasurements = {
  cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
  cigaretteButtsKg?: number | null;
};

const MEASUREMENT_EDIT_KEYS = [
  "cigaretteButtsMeasurements",
  "cigaretteButts",
  "cigaretteButtsMassKg",
  "cigaretteButtsVolumeLiters",
  "cigaretteButtsCondition",
  "cigaretteButtsKg",
] as const;

export function resolveModeratedCigaretteButtsMeasurements(params: {
  edits: ModerationMeasurementEdits;
  parsedMetadata: ParsedModerationMeasurements;
  existingCigaretteButts: number | null;
}): {
  hasMeasurementEdit: boolean;
  measurements: ActionCigaretteButtsMeasurements | undefined;
} {
  const { edits, parsedMetadata, existingCigaretteButts } = params;
  const hasMeasurementEdit = MEASUREMENT_EDIT_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(edits, key),
  );

  if (edits.cigaretteButtsMeasurements !== undefined) {
    return {
      hasMeasurementEdit: true,
      measurements:
        edits.cigaretteButtsMeasurements === null
          ? normalizeCigaretteButtsMeasurements({})
          : normalizeCigaretteButtsMeasurements({
              ...edits.cigaretteButtsMeasurements,
              deriveMissingFromMassOrCount: false,
            }),
    };
  }

  if (!hasMeasurementEdit) {
    return {
      hasMeasurementEdit: false,
      measurements: parsedMetadata.cigaretteButtsMeasurements ?? undefined,
    };
  }

  return {
    hasMeasurementEdit: true,
    measurements: normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount:
        edits.cigaretteButts !== undefined
          ? edits.cigaretteButts
          : parsedMetadata.cigaretteButtsMeasurements?.cigaretteButtsCount ??
            existingCigaretteButts,
      cigaretteButtsMassKg:
        edits.cigaretteButtsMassKg !== undefined
          ? edits.cigaretteButtsMassKg
          : edits.cigaretteButtsKg !== undefined
            ? edits.cigaretteButtsKg
            : parsedMetadata.cigaretteButtsMeasurements?.cigaretteButtsMassKg ??
              parsedMetadata.cigaretteButtsKg,
      cigaretteButtsVolumeLiters:
        edits.cigaretteButtsVolumeLiters !== undefined
          ? edits.cigaretteButtsVolumeLiters
          : parsedMetadata.cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters,
      cigaretteButtsCondition:
        edits.cigaretteButtsCondition !== undefined
          ? edits.cigaretteButtsCondition
          : parsedMetadata.cigaretteButtsMeasurements?.cigaretteButtsCondition,
      deriveMissingFromMassOrCount: true,
    }),
  };
}
