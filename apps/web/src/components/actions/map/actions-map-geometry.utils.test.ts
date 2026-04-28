import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";
import {
  buildDrawingLeafletPositions,
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  normalizeActionDrawing,
  summarizeActionDrawingValidation,
  resolveActionMapGeometryViewModel,
  resolveInfrastructureAnchor,
  resolveGeometryRenderStyle,
} from "./actions-map-geometry.utils";

function buildMapItem(partial: Partial<ActionMapItem>): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-04-08",
    location_label: "Lieu test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 0,
    cigarette_butts: 0,
    status: "approved",
    created_by_clerk_id: null,
    ...partial,
  };
}

describe("actions map geometry utils", () => {
  it("normalizes drawing coordinates and rejects incomplete tracés", () => {
    expect(
      normalizeActionDrawing({
        kind: "polyline",
        coordinates: [[48.85, 2.35]],
      }),
    ).toBeNull();

    expect(
      normalizeActionDrawing({
        kind: "polygon",
        coordinates: [
          [48.85, 2.35],
          [48.851, 2.351],
          [Number.NaN, 2.352],
        ],
      }),
    ).toBeNull();

    expect(
      normalizeActionDrawing({
        kind: "polyline",
        coordinates: [
          [48.85, 2.35],
          [48.851, 2.351],
          [48.851, 2.351],
          [Number.NaN, 2.352],
        ],
      }),
    ).toEqual({
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.851, 2.351],
      ],
    });
  });

  it("builds leaflet positions from sanitized coordinates", () => {
    expect(
      buildDrawingLeafletPositions({
        kind: "polygon",
        coordinates: [
          [48.85, 2.35],
          [48.851, 2.351],
          [48.852, 2.352],
          [48.852, 2.352],
          [Number.NaN, 2.353],
        ],
      }),
    ).toEqual([
      [48.85, 2.35],
      [48.851, 2.351],
      [48.852, 2.352],
    ]);
  });

  it("summarizes drawing validity for the form", () => {
    const summary = summarizeActionDrawingValidation({
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.85, 2.35],
        [48.851, 2.351],
      ],
    });

    expect(summary.isValid).toBe(true);
    expect(summary.hasDuplicates).toBe(true);
    expect(summary.pointCount).toBe(2);
    expect(summary.rawPointCount).toBe(3);
    expect(summary.message).toContain("Doublons");
    expect(summary.normalized).toEqual({
      kind: "polyline",
      coordinates: [
        [48.85, 2.35],
        [48.851, 2.351],
      ],
    });
  });

  it("builds a drawing view model with a centroid anchor", () => {
    const contract = buildActionDataContract({
      id: "action-drawing",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "Canal Saint-Martin",
      latitude: 48.855,
      longitude: 2.357,
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.854, 2.355],
          [48.855, 2.357],
          [48.856, 2.359],
        ],
      },
    });

    const item = toActionMapItem(contract);
    const geometry = resolveActionMapGeometryViewModel(item);

    expect(geometry.renderMode).toBe("drawing");
    expect(geometry.kind).toBe("polyline");
    expect(geometry.positions).toEqual([
      [48.854, 2.355],
      [48.855, 2.357],
      [48.856, 2.359],
    ]);
    expect(geometry.anchor).toEqual([48.855, 2.357]);
    expect(geometry.label).toContain("Géométrie réelle");
    expect(geometry.pointCount).toBe(3);
    expect(geometry.confidence).toBe(1);
    expect(formatGeometryPointCount(geometry.pointCount)).toBe("3 points");
    expect(formatGeometryModeLabel(geometry.presentation)).toBe(
      "Géométrie réelle",
    );
    expect(formatGeometryConfidenceLabel(geometry.confidence)).toBe(
      "Confiance 100%",
    );
    expect(geometry.metrics.label).toMatch(/^Longueur ~ /);
    expect(resolveGeometryRenderStyle(geometry).strokeWeight).toBe(4);
  });

  it("computes an approximate area label for polygon drawings", () => {
    const contract = buildActionDataContract({
      id: "action-zone",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-08",
      locationLabel: "Square test",
      latitude: 48.86,
      longitude: 2.34,
      manualDrawing: {
        kind: "polygon",
        coordinates: [
          [48.86, 2.34],
          [48.8605, 2.342],
          [48.859, 2.343],
          [48.8588, 2.3405],
        ],
      },
    });

    const item = toActionMapItem(contract);
    const geometry = resolveActionMapGeometryViewModel(item);

    expect(geometry.renderMode).toBe("drawing");
    expect(geometry.kind).toBe("polygon");
    expect(geometry.metrics.kind).toBe("area");
    expect(geometry.metrics.label).toMatch(/^Surface ~ /);
    expect(resolveGeometryRenderStyle(geometry).strokeWeight).toBe(2);
  });

  it("falls back to a point geometry when the drawing is invalid", () => {
    const item = buildMapItem({
      manual_drawing: {
        kind: "polyline",
        coordinates: [[48.85, 2.35]],
      },
      latitude: 48.86,
      longitude: 2.36,
    });

    const geometry = resolveActionMapGeometryViewModel(item);

    expect(geometry.renderMode).toBe("point");
    expect(geometry.kind).toBe("point");
    expect(geometry.positions).toEqual([[48.86, 2.36]]);
    expect(geometry.anchor).toEqual([48.86, 2.36]);
    expect(resolveInfrastructureAnchor(item)).toEqual([48.86, 2.36]);
    expect(formatGeometryPointCount(geometry.pointCount)).toBe("1 point");
    expect(resolveGeometryRenderStyle(geometry).pointRadius).toBe(4.5);
  });
});
