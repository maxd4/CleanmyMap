import type { ActionContext } from "./action-context";

export function deriveContextualCollectionUnits(params: {
  actionContext: ActionContext | null | undefined;
  childrenCount: number | null;
  adultCount: number | null;
  retiredCount: number | null;
  volunteersCount?: number | null;
}): { wasteUnits: number | null; buttsUnits: number | null } {
  const values = [params.childrenCount, params.adultCount, params.retiredCount];
  if (values.some((value) => value === null || !Number.isInteger(value) || value < 0)) {
    return { wasteUnits: null, buttsUnits: null };
  }
  const children = params.childrenCount as number;
  const adults = params.adultCount as number;
  const retired = params.retiredCount as number;
  if (
    params.volunteersCount !== undefined &&
    (params.volunteersCount === null ||
      !Number.isInteger(params.volunteersCount) ||
      params.volunteersCount < 0 ||
      children + adults + retired !== params.volunteersCount)
  ) {
    return { wasteUnits: null, buttsUnits: null };
  }
  if (params.actionContext === "school") {
    if (retired !== 0) return { wasteUnits: null, buttsUnits: null };
    const wasteUnits = adults + 0.45 * children;
    return {
      wasteUnits: wasteUnits > 0 ? wasteUnits : null,
      buttsUnits: adults > 0 ? adults : null,
    };
  }
  if (params.actionContext !== "citizen" && params.actionContext !== "company") {
    return { wasteUnits: null, buttsUnits: null };
  }
  const units = adults + 0.5 * children + 0.5 * retired;
  return { wasteUnits: units > 0 ? units : null, buttsUnits: units > 0 ? units : null };
}
