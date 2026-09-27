import type { ActionPreparationData } from "@/lib/actions/types";

export function preserveHistoricalRouteCalibrationContext(
  current: ActionPreparationData | null | undefined,
  incoming: ActionPreparationData | null | undefined,
): ActionPreparationData {
  const currentContext = current?.routeCalibrationContext;
  const currentVersioning = current?.routeVersioning;
  const next = incoming ?? {};
  if (!currentContext) {
    return {
      ...next,
      ...(currentVersioning ? { routeVersioning: structuredClone(currentVersioning) } : {}),
    };
  }

  if (
    next.routeCalibrationContext !== undefined &&
    JSON.stringify(next.routeCalibrationContext) !== JSON.stringify(currentContext)
  ) {
    throw new Error("Le contexte historique de calibration ne peut pas être réécrit.");
  }
  return {
    ...next,
    routeCalibrationContext: structuredClone(currentContext),
    ...(currentVersioning
      ? { routeVersioning: structuredClone(currentVersioning) }
      : {}),
  };
}
