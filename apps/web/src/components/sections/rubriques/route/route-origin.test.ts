import { describe, expect, it } from "vitest";
import {
  getRouteOriginLabel,
  getRouteRecommendationErrorMessage,
} from "./route-origin";
import { RouteRecommendationError } from "./route-request";

describe("route origin presentation", () => {
  it("labels browser and saved-area origins without exposing coordinates", () => {
    expect(getRouteOriginLabel("browser", true)).toBe("Position actuelle");
    expect(getRouteOriginLabel("approximate_saved_area", true)).toBe(
      "Centre approximatif de votre zone enregistrée",
    );
    expect(getRouteOriginLabel("map", true)).toBe("Origine sélectionnée sur la carte");
  });

  it("uses a specific message when the API has no starting point", () => {
    expect(
      getRouteRecommendationErrorMessage(new RouteRecommendationError(422), true),
    ).toContain("Aucun point de départ n’est disponible");
    expect(
      getRouteRecommendationErrorMessage(new RouteRecommendationError(500), true),
    ).toContain("Impossible de calculer");
  });
});
