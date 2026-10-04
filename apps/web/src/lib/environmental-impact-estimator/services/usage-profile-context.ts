import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactUsageProvenanceItem,
  EnvironmentalImpactUsageProvenanceSource,
} from "../types";
import { resolveNumber } from "./utils";

export interface UsageProfileContext {
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined;
  siteInput: EnvironmentalImpactScopeInput | null | undefined;
  userInput: EnvironmentalImpactScopeInput | null | undefined;
  usageInput: EnvironmentalImpactInfrastructureInput["usage"] | null;
  pushProvenance: (item: EnvironmentalImpactUsageProvenanceItem) => void;
}

export function resolveUsageField(
  ctx: UsageProfileContext,
  key: string,
  label: string,
  inputValue: number | null | undefined,
  fallbackValue: number,
  detail: string,
  source: EnvironmentalImpactUsageProvenanceSource,
): number {
  const hasInput = inputValue !== null && inputValue !== undefined;
  const value = resolveNumber(inputValue, fallbackValue);
  ctx.pushProvenance({
    key,
    label,
    value,
    source: hasInput ? "input" : source,
    detail,
  });
  return value;
}
