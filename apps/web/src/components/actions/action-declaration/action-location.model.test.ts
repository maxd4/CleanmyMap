import { describe, expect, it } from "vitest";
import type { ActionDrawing } from "@/lib/actions/types";
import { createInitialFormState } from "./payload";
import { buildActionLocationViewModel } from "./action-location.model";

const manualDrawing: ActionDrawing = {
  kind: "polyline",
  coordinates: [[48.85, 2.35], [48.86, 2.36]],
};

const previewDrawing: ActionDrawing = {
  kind: "polyline",
  coordinates: [[48.8, 2.3], [48.81, 2.31], [48.82, 2.32]],
};

describe("action location view model", () => {
  it("keeps GPX as the active geometry and exposes its validation summary", () => {
    const form = createInitialFormState("Alice");
    const result = buildActionLocationViewModel({
      form,
      manualDrawing,
      manualDrawingSource: "gpx_import",
      routePreviewDrawing: null,
      routePreviewSource: null,
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1.2,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
    });

    expect(result.activeGeometry?.source).toBe("gpx_import");
    expect(result.displayedDrawing).toEqual(manualDrawing);
    expect(result.isGpx).toBe(true);
    expect(result.isManual).toBe(false);
    expect(result.hasDrawing).toBe(true);
  });

  it("does not reclassify a reconstructed route as a manual drawing", () => {
    const form = createInitialFormState("Alice");
    const result = buildActionLocationViewModel({
      form,
      manualDrawing: null,
      manualDrawingSource: null,
      routePreviewDrawing: previewDrawing,
      routePreviewSource: "routed",
      gpxImport: null,
    });

    expect(result.activeGeometry?.source).toBe("routed");
    expect(result.displayedDrawing).toEqual(previewDrawing);
    expect(result.isManual).toBe(false);
    expect(result.statusTone).not.toBe("neutral");
  });
});
