import { describe, expect, it } from "vitest";
import type { ActionDrawing } from "@/lib/actions/types";
import { resolveDrawnGeometry } from "./action-drawing-map.geometry";

const drawnPolyline: ActionDrawing = {
  kind: "polyline",
  coordinates: [
    [48.85, 2.35],
    [48.851, 2.351],
  ],
};

describe("resolveDrawnGeometry", () => {
  it("marks a successful OSRM replacement as routed", () => {
    const snappedCoordinates: [number, number][] = [
      [48.8501, 2.3501],
      [48.8505, 2.3507],
      [48.851, 2.351],
    ];

    expect(resolveDrawnGeometry(drawnPolyline, snappedCoordinates)).toEqual({
      drawing: { kind: "polyline", coordinates: snappedCoordinates },
      geometrySource: "routed",
    });
  });

  it("keeps the actual drawn line manual when OSRM cannot replace it", () => {
    expect(resolveDrawnGeometry(drawnPolyline, null)).toEqual({
      drawing: drawnPolyline,
      geometrySource: "manual",
    });
  });

  it("never routes a manually drawn polygon", () => {
    const polygon: ActionDrawing = {
      kind: "polygon",
      coordinates: [
        [48.85, 2.35],
        [48.851, 2.351],
        [48.852, 2.35],
      ],
    };

    expect(resolveDrawnGeometry(polygon, drawnPolyline.coordinates)).toEqual({
      drawing: polygon,
      geometrySource: "manual",
    });
  });
});
