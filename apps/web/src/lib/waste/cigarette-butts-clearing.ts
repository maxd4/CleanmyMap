import type {
  ActionCigaretteButtsMeasurements,
  CigaretteButtsInputSource,
  CigaretteButtsMeasurementInput,
  CigaretteButtsProvenance,
  RawCigaretteButtsMeasurementInput,
} from "./cigarette-butts-engine";

export type MeasurementClearFlags = {
  countExplicitlyCleared: boolean;
  massExplicitlyCleared: boolean;
  volumeExplicitlyCleared: boolean;
  volumeClearRequested: boolean;
};

type NormalizeMeasurements = (
  input: CigaretteButtsMeasurementInput,
) => ActionCigaretteButtsMeasurements;

type InferInputSource = (
  measurements: ActionCigaretteButtsMeasurements | null | undefined,
) => CigaretteButtsInputSource;

type MeasurementSource = CigaretteButtsInputSource | undefined;

export function resolveUnambiguousCigaretteButtsSourceReplacement(
  persistedSource: CigaretteButtsInputSource,
  input: RawCigaretteButtsMeasurementInput,
  explicitMeasurementFields: readonly string[],
  countChanged: boolean,
  massChanged: boolean,
  volumeChanged: boolean,
): Array<"count" | "mass_kg" | "volume_l"> {
  const persistedField = sourceValueField(persistedSource);
  if (!persistedField || input[persistedField] !== null || !explicitMeasurementFields.includes(persistedField)) {
    return [];
  }

  const candidates: Array<"count" | "mass_kg" | "volume_l"> = [];
  const candidateFields = [
    ["count", "cigaretteButtsCount", "countExplicitlyCleared", countChanged],
    ["mass_kg", "cigaretteButtsMassKg", "massExplicitlyCleared", massChanged],
    ["volume_l", "cigaretteButtsVolumeLiters", "volumeExplicitlyCleared", volumeChanged],
  ] as const;
  for (const [source, field, clearField, changed] of candidateFields) {
    if (
      field !== persistedField &&
      explicitMeasurementFields.includes(field) &&
      changed &&
      hasSourceValue(input, clearField)
    ) {
      candidates.push(source);
    }
  }
  return candidates;
}

export function resolveFallbackCigaretteButtsInputSource(
  inputSource: CigaretteButtsInputSource | undefined,
  persistedSource: CigaretteButtsInputSource,
  countChanged: boolean,
  massChanged: boolean,
  volumeChanged: boolean,
): CigaretteButtsInputSource {
  if (countChanged && !massChanged && !volumeChanged) return "count";
  if (massChanged && !countChanged && !volumeChanged) return "mass_kg";
  if (volumeChanged && !countChanged && !massChanged) return "volume_l";
  return inputSource && isScalarSource(inputSource) ? inputSource : persistedSource;
}

export function normalizeClearedCigaretteButtsMeasurements(
  effectiveInput: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements | null | undefined,
  flags: MeasurementClearFlags,
  normalizeMeasurements: NormalizeMeasurements,
  inferInputSource: InferInputSource,
  resolvedInputSource?: MeasurementSource,
): ActionCigaretteButtsMeasurements | null {
  if (!existing) return null;
  const persistedSource = inferInputSource(existing);
  if (!hasClearedMeasurement(flags)) return null;
  if (isSourceReplacement(persistedSource, resolvedInputSource, effectiveInput, flags)) {
    return null;
  }
  if (flags.volumeExplicitlyCleared && !flags.countExplicitlyCleared && !flags.massExplicitlyCleared) {
    return normalizeVolumeClearedMeasurements(
      effectiveInput,
      existing,
      flags,
      normalizeMeasurements,
      inferInputSource,
    );
  }

  const orphanedCount = (
    flags.massExplicitlyCleared && isMassSource(persistedSource) &&
    isDerivedMeasurement(existing.cigaretteButtsCountProvenance, "count", persistedSource)
  ) || (
    flags.volumeExplicitlyCleared && persistedSource === "volume_l" &&
    isDerivedMeasurement(existing.cigaretteButtsCountProvenance, "count", persistedSource)
  );
  const orphanedMass = (
    flags.countExplicitlyCleared && persistedSource === "count" &&
    isDerivedMeasurement(existing.cigaretteButtsMassProvenance, "mass", persistedSource)
  ) || (
    flags.volumeExplicitlyCleared && persistedSource === "volume_l" &&
    isDerivedMeasurement(existing.cigaretteButtsMassProvenance, "mass", persistedSource)
  );
  const orphanedVolume = (
    flags.countExplicitlyCleared && persistedSource === "count" &&
    isDerivedMeasurement(existing.cigaretteButtsVolumeProvenance, "volume", persistedSource)
  ) || (
    flags.massExplicitlyCleared && isMassSource(persistedSource) &&
    isDerivedMeasurement(existing.cigaretteButtsVolumeProvenance, "volume", persistedSource)
  );
  return normalizePartiallyClearedMeasurements(
    effectiveInput,
    existing,
    flags,
    orphanedCount,
    orphanedMass,
    orphanedVolume,
    normalizeMeasurements,
    inferInputSource,
  );
}

function isSourceReplacement(
  persistedSource: CigaretteButtsInputSource,
  resolvedInputSource: MeasurementSource,
  input: RawCigaretteButtsMeasurementInput,
  flags: MeasurementClearFlags,
): boolean {
  if (!resolvedInputSource || !isScalarSource(resolvedInputSource)) return false;
  const persistedField = sourceMeasurementField(persistedSource);
  const replacementField = sourceMeasurementField(resolvedInputSource);
  if (!persistedField || !replacementField || persistedField === replacementField) return false;
  return flags[persistedField] && !flags[replacementField] && hasSourceValue(input, replacementField);
}

function hasSourceValue(
  input: RawCigaretteButtsMeasurementInput,
  field: MeasurementField,
): boolean {
  const value = field === "countExplicitlyCleared"
    ? input.cigaretteButtsCount
    : field === "massExplicitlyCleared"
      ? input.cigaretteButtsMassKg
      : input.cigaretteButtsVolumeLiters;
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0;
}

function isScalarSource(source: CigaretteButtsInputSource): boolean {
  return source === "count" || isMassSource(source) || source === "volume_l";
}

function hasClearedMeasurement(flags: MeasurementClearFlags): boolean {
  return flags.countExplicitlyCleared ||
    flags.massExplicitlyCleared ||
    flags.volumeExplicitlyCleared;
}

function normalizeVolumeClearedMeasurements(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements,
  flags: MeasurementClearFlags,
  normalizeMeasurements: NormalizeMeasurements,
  inferInputSource: InferInputSource,
): ActionCigaretteButtsMeasurements {
  const source = inferInputSource(existing);
  return normalizePartiallyClearedMeasurements(
    input,
    existing,
    flags,
    source === "volume_l" && isDerivedMeasurement(existing.cigaretteButtsCountProvenance, "count", source),
    source === "volume_l" && isDerivedMeasurement(existing.cigaretteButtsMassProvenance, "mass", source),
    false,
    normalizeMeasurements,
    inferInputSource,
  );
}

function normalizePartiallyClearedMeasurements(
  input: RawCigaretteButtsMeasurementInput,
  existing: ActionCigaretteButtsMeasurements,
  flags: MeasurementClearFlags,
  orphanedCount: boolean,
  orphanedMass: boolean,
  orphanedVolume: boolean,
  normalizeMeasurements: NormalizeMeasurements,
  inferInputSource: InferInputSource,
): ActionCigaretteButtsMeasurements {
  const result = normalizeMeasurements({
    ...input,
    cigaretteButtsCount: orphanedCount ? null : input.cigaretteButtsCount,
    cigaretteButtsMassKg: orphanedMass ? null : input.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters: orphanedVolume ? null : input.cigaretteButtsVolumeLiters,
    deriveMissingFromMassOrCount: false,
  });
  preserveUnclearedMeasurementProvenance(result, existing, flags);
  const persistedSource = inferInputSource(existing);
  const sourceField = sourceMeasurementField(persistedSource);
  const sourceCleared = sourceField !== null && flags[sourceField];
  result.cigaretteButtsConversionFormulaVersion = sourceCleared
    ? null
    : existing.cigaretteButtsConversionFormulaVersion;
  result.cigaretteButtsVolumeConversionFormulaVersion = sourceCleared
    ? null
    : existing.cigaretteButtsVolumeConversionFormulaVersion;
  result.cigaretteButtsInputSource = sourceCleared
    ? inferInputSource({ ...result, cigaretteButtsInputSource: undefined })
    : persistedSource;
  return result;
}

type MeasurementField = keyof Pick<
  MeasurementClearFlags,
  "countExplicitlyCleared" | "massExplicitlyCleared" | "volumeExplicitlyCleared"
>;

function sourceMeasurementField(
  source: CigaretteButtsInputSource,
): MeasurementField | null {
  if (source === "count") return "countExplicitlyCleared";
  if (isMassSource(source)) return "massExplicitlyCleared";
  if (source === "volume_l") return "volumeExplicitlyCleared";
  return null;
}

function sourceValueField(
  source: CigaretteButtsInputSource,
): "cigaretteButtsCount" | "cigaretteButtsMassKg" | "cigaretteButtsVolumeLiters" | null {
  if (source === "count") return "cigaretteButtsCount";
  if (isMassSource(source)) return "cigaretteButtsMassKg";
  if (source === "volume_l") return "cigaretteButtsVolumeLiters";
  return null;
}

function isMassSource(source: CigaretteButtsInputSource): boolean {
  return source === "mass" || source === "mass_kg";
}

function isDerivedMeasurement(
  provenance: CigaretteButtsProvenance,
  field: "count" | "mass" | "volume",
  source: CigaretteButtsInputSource,
): boolean {
  if (provenance === "estimated") return true;
  if (field === "volume") return provenance === "volume_converted" && source !== "volume_l";
  if (field === "count") {
    return isMassSource(source)
      ? provenance === "weight_converted"
      : source === "volume_l" && provenance === "volume_converted";
  }
  return (source === "count" || source === "volume_l") && provenance === "weight_converted";
}

function preserveUnclearedMeasurementProvenance(
  result: ActionCigaretteButtsMeasurements,
  existing: ActionCigaretteButtsMeasurements,
  flags: MeasurementClearFlags,
): void {
  if (!flags.countExplicitlyCleared && result.cigaretteButtsCount === existing.cigaretteButtsCount) {
    result.cigaretteButtsCountProvenance = existing.cigaretteButtsCountProvenance;
  }
  if (!flags.massExplicitlyCleared && result.cigaretteButtsMassKg === existing.cigaretteButtsMassKg) {
    result.cigaretteButtsMassProvenance = existing.cigaretteButtsMassProvenance;
  }
  if (!flags.volumeExplicitlyCleared && result.cigaretteButtsVolumeLiters === existing.cigaretteButtsVolumeLiters) {
    result.cigaretteButtsVolumeProvenance = existing.cigaretteButtsVolumeProvenance;
    result.cigaretteButtsVolumeConversionFormulaVersion =
      existing.cigaretteButtsVolumeConversionFormulaVersion;
  }
}
