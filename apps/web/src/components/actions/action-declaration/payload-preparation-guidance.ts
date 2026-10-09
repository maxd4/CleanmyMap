import {
  buildWasteFieldGuidance,
  WASTE_CATEGORY_SLUGS,
} from "../../../lib/waste";
import type { FormState } from "./model";

type HistoricalGuidanceField = "safetyInstructions" | "recommendedMaterials";

const HISTORICAL_GUIDANCE_HEADINGS: Record<HistoricalGuidanceField, string> = {
  safetyInstructions: "Consignes dérivées du référentiel",
  recommendedMaterials: "Matériel dérivé du référentiel",
};

const canonicalGuidance = buildWasteFieldGuidance(WASTE_CATEGORY_SLUGS);
const CANONICAL_GUIDANCE_LINES: Record<HistoricalGuidanceField, ReadonlySet<string>> = {
  safetyInstructions: new Set([
    ...canonicalGuidance.toAvoid,
    ...canonicalGuidance.toReport,
  ]),
  recommendedMaterials: new Set(canonicalGuidance.toPrepare),
};

function hasCanonicalGuidanceLines(
  lines: readonly string[],
  field: HistoricalGuidanceField,
): boolean {
  return (
    lines.length > 0 &&
    lines.every((line) => {
      const content = line.startsWith("- ") ? line.slice(2).trim() : "";
      return content.length > 0 && CANONICAL_GUIDANCE_LINES[field].has(content);
    })
  );
}

/**
 * Removes only the exact trailing block emitted by the former payload builder.
 * Free-form or structurally ambiguous text is returned unchanged so that a
 * user's historical instruction is never silently discarded.
 */
export function stripHistoricalDerivedGuidance(
  value: string | null | undefined,
  field: HistoricalGuidanceField,
): string | undefined {
  if (value === null || value === undefined) return undefined;

  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return value;

  const heading = HISTORICAL_GUIDANCE_HEADINGS[field];
  const marker = `${heading}:\n`;
  const separator = `\n\n${marker}`;
  const markerStart = normalized.startsWith(marker)
    ? 0
    : normalized.lastIndexOf(separator);
  if (markerStart < 0) return value;

  const blockStart = markerStart === 0 ? 0 : markerStart + 2;
  const blockLines = normalized.slice(blockStart + marker.length).split("\n");
  if (!hasCanonicalGuidanceLines(blockLines, field)) return value;

  const manual = normalized.slice(0, blockStart).trim();
  return manual;
}

export function buildPreparationGuidanceFields(form: FormState) {
  return {
    accessibility: form.accessibility.trim() || undefined,
    safetyInstructions: form.safetyInstructions.trim() || undefined,
    recommendedMaterials: form.recommendedMaterials.trim() || undefined,
  };
}
