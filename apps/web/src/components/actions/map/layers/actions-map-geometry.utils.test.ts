import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";
import { getGeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import {
  buildDrawingLeafletPositions,
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  formatActionGeometryTooltipTitle,
  normalizeActionDrawing,
  summarizeActionDrawingValidation,
  resolveActionMapGeometryViewModel,
  resolveGeometryConfidenceLabel,
  resolveInfrastructureAnchor,
  resolvePolylineDirectionMarkers,
  resolveGeometryRenderStyle,
  resolvePolylineEndpointMarkers,
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
  function buildContractMapItem({
    geometrySource,
    kind = "polyline",
    preparationData,
  }: {
    geometrySource: "manual" | "gpx_import" | "routed" | "estimated_route" | "reference" | "estimated_area";
    kind?: "polyline" | "polygon";
    preparationData?: Parameters<typeof buildActionDataContract>[0]["preparationData"];
  }): ActionMapItem {
    return toActionMapItem(
      buildActionDataContract({
        id: `${geometrySource}-${kind}`,
        type: "action",
        status: "approved",
        source: "actions",
        observedAt: "2026-04-08",
        locationLabel: "Lieu test",
        latitude: 48.85,
        longitude: 2.35,
        manualDrawing: {
          kind,
          coordinates:
            kind === "polygon"
              ? [[48.85, 2.35], [48.851, 2.351], [48.852, 2.35]]
              : [[48.85, 2.35], [48.851, 2.351]],
        },
        geometrySource,
        preparationData,
      }),
    );
  }

  it.each([
    ["polyline", "manual", "Parcours déclaré"],
    ["polyline", "routed", "Parcours reconstruit"],
    ["polygon", "manual", "Zone d’action"],
    ["polygon", "reference", "Zone de référence"],
    ["polygon", "estimated_area", "Zone indicative"],
  ] as const)("maps %s/%s to %s", (kind, origin, expected) => {
    expect(
      formatGeometryModeLabel(kind, {
        origin,
        reality: origin === "routed" || origin === "estimated_area" ? "estimated" : "real",
        label: expected,
        strokeStyle: origin === "routed" ? "dashed" : "solid",
      }),
    ).toBe(expected);
  });

  it("uses métier labels for action polyline and polygon tooltips", () => {
    expect(formatActionGeometryTooltipTitle("polyline")).toBe("Parcours d'action");
    expect(formatActionGeometryTooltipTitle("polygon")).toBe("Zone d'action");
  });

  it("renders independent accepted observations as separate coverage lines", () => {
    const item = toActionMapItem(
      buildActionDataContract({
        id: "multi-trace-action",
        type: "action",
        status: "approved",
        source: "actions",
        observedAt: "2026-04-08",
        locationLabel: "Parc test",
        latitude: 48.85,
        longitude: 2.35,
        derivedGeometryKind: "multiline",
        derivedGeometryGeoJson: JSON.stringify({
          type: "MultiLineString",
          coordinates: [
            [[2.35, 48.85], [2.351, 48.851]],
            [[2.36, 48.86], [2.361, 48.861]],
          ],
        }),
        geometrySource: "gps_tracking",
        preparationData: {
          observedCoverage: {
            type: "MultiLineString",
            coordinates: [
              [[2.35, 48.85], [2.351, 48.851]],
              [[2.36, 48.86], [2.361, 48.861]],
            ],
            traceCount: 2,
            individualDistancesKm: [0.2, 0.3],
            coverageDistanceKm: null,
            coverageVersion: "observed-traces-v1",
          },
        },
      }),
    );

    const geometry = resolveActionMapGeometryViewModel(item);
    expect(geometry.kind).toBe("multiline");
    expect(geometry.multiLinePositions).toHaveLength(2);
    expect(geometry.positions).toEqual([]);
    expect(geometry.coverageTraceCount).toBe(2);
    expect(geometry.presentation.label).toBe("Couverture observée par plusieurs bénévoles");
    expect(geometry.metrics.label).toContain("distances individuelles conservées");
  });

  it("shows confidence only for estimated geometry and preserves stroke semantics", () => {
    expect(
      resolveGeometryConfidenceLabel({ reality: "real" }, 0.95),
    ).toBeNull();
    expect(
      resolveGeometryConfidenceLabel({ reality: "estimated" }, 0.6),
    ).toBe("Confiance 60%");
    expect(
      resolveGeometryRenderStyle({
        kind: "polyline",
        presentation: {
          origin: "routed",
          reality: "estimated",
          label: "Parcours reconstruit · estimation",
          strokeStyle: "dashed",
        },
      }).dashArray,
    ).toBe("8 8");
    expect(
      resolveGeometryRenderStyle({
        kind: "polyline",
        presentation: {
          origin: "estimated_route",
          reality: "estimated",
          label: "Parcours estimé",
          strokeStyle: "dashed",
          variant: "estimated",
        },
      }).dashArray,
    ).toBe("4 8");
    expect(
      resolveGeometryRenderStyle({
        kind: "polyline",
        presentation: {
          origin: "manual",
          reality: "real",
          label: "Géométrie réelle · manuelle",
          strokeStyle: "solid",
        },
      }).dashArray,
    ).toBeUndefined();
  });

  it("renders a reliable reference polygon as a clear filled solid zone", () => {
    const style = resolveGeometryRenderStyle({
      kind: "polygon",
      presentation: {
        origin: "reference",
        reality: "real",
        label: "Zone réelle · référence",
        strokeStyle: "solid",
      },
    });

    expect(style.fillOpacity).toBe(0.32);
    expect(style.strokeOpacity).toBe(0.95);
    expect(style.dashArray).toBeUndefined();
    expect(
      formatGeometryModeLabel("polygon", {
        origin: "reference",
        reality: "real",
        label: "Zone réelle · référence",
        strokeStyle: "solid",
      }),
    ).toBe("Zone réelle · référence");
  });

  it("renders estimated_area as a transparent solid indicative zone", () => {
    for (const geometrySource of ["manual", "reference", "estimated_area"] as const) {
      const contractItem = toActionMapItem(
        buildActionDataContract({
          id: `${geometrySource}-polygon-contract`,
          type: "action",
          status: "approved",
          source: "actions",
          observedAt: "2026-04-08",
          locationLabel: "Zone polygonale",
          latitude: 48.85,
          longitude: 2.35,
          manualDrawing: {
            kind: "polygon",
            coordinates: [
              [48.85, 2.35],
              [48.851, 2.351],
              [48.852, 2.35],
            ],
          },
          geometrySource,
          geometryConfidence: geometrySource === "estimated_area" ? 0.42 : 0.95,
          wasteKg: 0,
        }),
      );

      expect(getGeometryPresentation(contractItem).strokeStyle).toBe("solid");
    }

    const style = resolveGeometryRenderStyle({
      kind: "polygon",
      presentation: {
        origin: "estimated_area",
        reality: "estimated",
        label: "Zone indicative · emprise estimée",
        strokeStyle: "solid",
      },
    });

    expect(style.fillOpacity).toBe(0.14);
    expect(style.strokeOpacity).toBe(0.68);
    expect(style.dashArray).toBeUndefined();
    expect(
      formatGeometryModeLabel("polygon", {
        origin: "estimated_area",
        reality: "estimated",
        label: "Zone indicative · emprise estimée",
        strokeStyle: "solid",
      }),
    ).toBe("Zone indicative · emprise estimée");
  });

  it("creates endpoint markers for manual and routed polylines", () => {
    const positions: [number, number][] = [
      [48.8566, 2.3522],
      [48.8576, 2.3532],
    ];

    expect(
      resolvePolylineEndpointMarkers({
        kind: "polyline",
        positions,
        presentation: {
          origin: "routed",
          reality: "estimated",
          label: "Parcours reconstruit · estimation",
          strokeStyle: "dashed",
        },
      }),
    ).toEqual({ start: positions[0], end: positions[1], isLoop: false });
    expect(
      resolvePolylineEndpointMarkers({
        kind: "polyline",
        positions,
        presentation: {
          origin: "manual",
          reality: "real",
          label: "Géométrie réelle · manuelle",
          strokeStyle: "solid",
        },
      }),
    ).toEqual({ start: positions[0], end: positions[1], isLoop: false });
  });

  it("collapses coincident endpoints into one loop marker", () => {
    const positions: [number, number][] = [
      [48.8566, 2.3522],
      [48.8576, 2.3532],
      [48.8566, 2.3522],
    ];

    expect(
      resolvePolylineEndpointMarkers({
        kind: "polyline",
        positions,
        presentation: {
          origin: "routed",
          reality: "estimated",
          label: "Parcours reconstruit · estimation",
          strokeStyle: "dashed",
        },
      }),
    ).toEqual({ start: positions[0], end: positions[2], isLoop: true });
  });

  it("places three direction markers by cumulative distance and local bearing", () => {
    const markers = resolvePolylineDirectionMarkers([
      [48.8566, 2.3522],
      [48.8566, 2.3622],
      [48.8666, 2.3622],
    ]);

    expect(markers).toHaveLength(3);
    expect(markers[0].position[1]).toBeGreaterThan(2.3522);
    expect(markers[0].position[0]).toBeCloseTo(48.8566, 3);
    expect(markers[0].bearing).toBeCloseTo(90, 0);
    expect(markers[2].position[0]).toBeGreaterThan(48.8566);
    expect(markers[2].bearing).toBeCloseTo(0, 0);
  });

  it("reserves the dashed stroke for reconstructed routed polylines", () => {
    const style = resolveGeometryRenderStyle({
      kind: "polyline",
      presentation: {
        origin: "routed",
        reality: "estimated",
        label: "Parcours reconstruit · estimation",
        strokeStyle: "dashed",
      },
    });

    expect(style.dashArray).toBe("8 8");
    expect(style.fillOpacity).toBeNull();
    expect(
      formatGeometryModeLabel("polyline", {
        origin: "routed",
        reality: "estimated",
        label: "Parcours reconstruit · estimation",
        strokeStyle: "dashed",
      }),
    ).toBe("Parcours reconstruit · estimation");
  });

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
    expect(geometry.label).toBe("Parcours déclaré");
    expect(geometry.pointCount).toBe(3);
    expect(geometry.confidence).toBe(1);
    expect(formatGeometryPointCount(geometry.pointCount)).toBe("3 points");
    expect(formatGeometryModeLabel(geometry.kind, geometry.presentation)).toBe(
      "Parcours déclaré",
    );
    expect(formatGeometryConfidenceLabel(geometry.confidence)).toBe(
      "Confiance 100%",
    );
    expect(geometry.metrics.label).toMatch(/^Parcours déclaré · /);
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
    expect(geometry.metrics.label).toMatch(/^Zone d’action · /);
    expect(resolveGeometryRenderStyle(geometry).strokeWeight).toBe(2);
  });

  it("keeps distance labels tied to their geometry provenance", () => {
    const observed = resolveActionMapGeometryViewModel(
      buildContractMapItem({
        geometrySource: "gpx_import",
        preparationData: {
          routeObservedDistanceKm: 2.4,
          gpxImport: {
            source: "gpx_import",
            observedDistanceKm: 2.4,
            pointCount: 2,
            inferredTopology: "point_to_point",
          },
        },
      }),
    );
    const reconstructed = resolveActionMapGeometryViewModel(
      buildContractMapItem({
        geometrySource: "routed",
        preparationData: {
          routeNetworkDistanceKm: 2.1,
        },
      }),
    );
    const estimated = resolveActionMapGeometryViewModel(
      buildContractMapItem({
        geometrySource: "estimated_route",
        preparationData: {
          routeGeometryMode: "network",
          routeGeometryProvider: "osrm",
          routeNetworkDistanceKm: 2.1,
          routeTargetDistanceKm: 2,
        },
      }),
    );
    const fallback = resolveActionMapGeometryViewModel(
      buildContractMapItem({
        geometrySource: "estimated_route",
        preparationData: {
          routeGeometryMode: "fallback",
          routeGeometryProvider: "none",
        },
      }),
    );
    const targetOnly = resolveActionMapGeometryViewModel(
      buildContractMapItem({
        geometrySource: "estimated_route",
        preparationData: { routeTargetDistanceKm: 2 },
      }),
    );

    expect(observed.metrics.label).toBe("Distance observée · 2,4 km");
    expect(reconstructed.metrics.label).toBe(
      "Distance du parcours reconstruit · 2,1 km",
    );
    expect(estimated.metrics.label).toBe(
      "Parcours estimé · 2,1 km · Distance cible · 2,0 km",
    );
    expect(fallback.metrics.label).toMatch(
      /^Distance indicative à vol d’oiseau · /,
    );
    expect(resolveGeometryRenderStyle(fallback).dashArray).toBe("4 8");
    expect(resolveGeometryRenderStyle(fallback).strokeOpacity).toBe(0.62);
    expect(targetOnly.metrics.label).toBe("Distance cible · 2,0 km");
    expect(observed.metrics.label).not.toContain("Longueur");
    expect(reconstructed.metrics.label).not.toContain("Longueur");
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
