import { isRouteOriginUnavailableError } from "./route-request";
import type { RouteResponseOrigin } from "./route-types";

export function getRouteOriginLabel(source: RouteResponseOrigin["source"], fr: boolean): string {
  if (source === "browser") return fr ? "Position actuelle" : "Current position";
  if (source === "approximate_saved_area") {
    return fr
      ? "Centre approximatif de votre zone enregistrée"
      : "Approximate centre of your saved area";
  }
  return fr ? "Origine sélectionnée sur la carte" : "Map-selected origin";
}

export function getRouteRecommendationErrorMessage(error: unknown, fr: boolean): string {
  if (isRouteOriginUnavailableError(error)) {
    return fr
      ? "Aucun point de départ n’est disponible. Autorisez la localisation ou enregistrez une zone, puis réessayez."
      : "No starting point is available. Allow location access or save an area, then try again.";
  }

  return fr
    ? "Impossible de calculer les points prioritaires. Vérifiez les paramètres de géolocalisation."
    : "Unable to compute priority stops. Check location settings.";
}
