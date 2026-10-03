import { Popup, Polyline, Tooltip } from "react-leaflet";
import type { ActionMapGeometryRenderStyle, ActionMapGeometryViewModel } from "./actions-map-geometry.utils";
import type { ActionMapItem } from "@/lib/actions/types";
import { ActionPopupContent } from "../popup/action-popup-content";
import { GeometryTooltipContent, type GeometryTooltipReading } from "./map-geometry-tooltip-content";
import { formatActionGeometryTooltipTitle } from "./actions-map-geometry.utils";

type CoverageGeometryRenderInput = {
  item: ActionMapItem;
  geometry: ActionMapGeometryViewModel;
  renderStyle: ActionMapGeometryRenderStyle;
  displayColor: string;
  visibleWeight: number;
  handlers: { click: () => void; mouseover: () => void; mouseout: () => void };
  tooltipProps: {
    geometryModeLabel: string;
    geometryPointsLabel: string;
    geometryMetricLabel: string | null;
    color: string;
    actionReading?: GeometryTooltipReading;
  };
  commonPopupProps: Parameters<typeof ActionPopupContent>[0];
  isSelected: boolean;
  withInteraction?: boolean;
};

export function resolveVisibleShapePathOptions({
  geometryKind,
  displayColor,
  renderStyle,
  visibleWeight,
  isSelected,
}: Pick<CoverageGeometryRenderInput, "displayColor" | "renderStyle" | "isSelected"> & {
  geometryKind: "polygon" | "polyline";
  visibleWeight: number;
}) {
  return {
    color: displayColor,
    weight: visibleWeight,
    opacity: isSelected ? 1 : renderStyle.strokeOpacity ?? (geometryKind === "polygon" ? 0.95 : 0.92),
    ...(geometryKind === "polygon"
      ? { fillOpacity: (renderStyle.fillOpacity ?? 0.24) + (isSelected ? 0.08 : 0) }
      : {}),
    dashArray: renderStyle.dashArray,
  };
}

export function GeometryInteractionOverlays({
  item,
  geometryKind,
  tooltipProps,
  commonPopupProps,
}: Pick<CoverageGeometryRenderInput, "item" | "tooltipProps" | "commonPopupProps"> & {
  geometryKind: "polygon" | "polyline";
}) {
  return (
    <>
      <Tooltip className="glass-tooltip" direction="auto" sticky>
        <GeometryTooltipContent title={formatActionGeometryTooltipTitle(geometryKind)} {...tooltipProps} />
      </Tooltip>
      <Popup className="glass-popup custom-popup">
        <ActionPopupContent {...commonPopupProps} key={item.id} />
      </Popup>
    </>
  );
}

export function renderCoveragePolylines({
  item,
  geometry,
  renderStyle,
  displayColor,
  visibleWeight,
  handlers,
  tooltipProps,
  commonPopupProps,
  isSelected,
  withInteraction = false,
}: CoverageGeometryRenderInput) {
  const coverageStyle = resolveVisibleShapePathOptions({
    geometryKind: "polyline",
    displayColor,
    renderStyle: { ...renderStyle, strokeWeight: Math.max(2, (renderStyle.strokeWeight ?? 4) - 1) },
    visibleWeight,
    isSelected,
  });
  return geometry.multiLinePositions.map((positions, index) => (
    <Polyline key={`coverage-${item.id}-${index}`} positions={positions} pathOptions={coverageStyle} eventHandlers={handlers}>
      {withInteraction && index === 0 ? <GeometryInteractionOverlays item={item} geometryKind="polyline" tooltipProps={tooltipProps} commonPopupProps={commonPopupProps} /> : null}
    </Polyline>
  ));
}

export function renderMultilineGeometry(input: CoverageGeometryRenderInput) {
  return renderCoveragePolylines({ ...input, withInteraction: true });
}
