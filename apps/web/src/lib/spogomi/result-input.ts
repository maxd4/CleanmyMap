import type { SpogomiResultItemInput } from "./types";

export function toSpogomiResultItemInput(item: Record<string, unknown>, categoryCode: string): SpogomiResultItemInput & { categoryCode: string } {
  return {
    categoryCode,
    measurementKind: item.measurement_kind as SpogomiResultItemInput["measurementKind"],
    unit: String(item.unit),
    quantity: item.quantity === null ? null : Number(item.quantity),
    massGrams: item.mass_grams === null || item.mass_grams === undefined ? null : Number(item.mass_grams),
    objectCount: item.object_count === null || item.object_count === undefined ? null : Number(item.object_count),
    measurementMethod: item.measurement_method === null || item.measurement_method === undefined ? null : String(item.measurement_method),
    provenance: String(item.provenance ?? ""),
    arbitrationComment: item.arbitration_comment === null || item.arbitration_comment === undefined ? null : String(item.arbitration_comment),
  };
}
