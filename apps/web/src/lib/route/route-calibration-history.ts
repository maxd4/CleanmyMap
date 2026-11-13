import type { ActionPreparationData } from "@/lib/actions/types";

export function preserveHistoricalRouteCalibrationContext(
  current: ActionPreparationData | null | undefined,
  incoming: ActionPreparationData | null | undefined,
): ActionPreparationData {
  const currentContext = current?.routeCalibrationContext;
  const currentVersioning = current?.routeVersioning;
  const next = incoming ?? {};
  if (!currentContext) {
    const withoutIncomingContext = { ...next };
    delete withoutIncomingContext.routeCalibrationContext;
    if (!currentVersioning) {
      delete withoutIncomingContext.routeVersioning;
      delete withoutIncomingContext.routeGeometryProvenance;
    }
    return {
      ...withoutIncomingContext,
      ...(current?.operationalRoute && next.operationalRoute === undefined
        ? { operationalRoute: structuredClone(current.operationalRoute) }
        : {}),
      ...(currentVersioning ? { routeVersioning: structuredClone(currentVersioning) } : {}),
    };
  }

  if (
    next.routeCalibrationContext !== undefined &&
    JSON.stringify(next.routeCalibrationContext) !== JSON.stringify(currentContext)
  ) {
    throw new Error("Le contexte historique de calibration ne peut pas être réécrit.");
  }
  const preserved = {
    ...next,
    routeCalibrationContext: structuredClone(currentContext),
    ...(current?.operationalRoute && next.operationalRoute === undefined
      ? { operationalRoute: structuredClone(current.operationalRoute) }
      : {}),
    ...(currentVersioning
      ? { routeVersioning: structuredClone(currentVersioning) }
      : {}),
  };
  if (!currentVersioning) {
    delete preserved.routeVersioning;
    delete preserved.routeGeometryProvenance;
  }
  return preserved;
}
