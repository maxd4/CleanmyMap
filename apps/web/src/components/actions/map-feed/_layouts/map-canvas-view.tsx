import type { ActionsMapLayoutCommonProps } from "../map-feed.types";

type MapCanvasViewProps = {
  layoutProps: ActionsMapLayoutCommonProps;
  fullViewport?: boolean;
};

export function MapCanvasView({ layoutProps, fullViewport }: MapCanvasViewProps) {
  const {
    MapCanvas,
    items,
    allItems,
    sourceCompleteness,
    selectedActionId,
    onSelectAction,
    onClearSelection,
    frameSelectedActionId,
    compact,
    tone,
    onViewportChange,
    onViewportInteraction,
    initialViewport,
    viewportRequest,
    viewportRequestKey,
    recenterViewport,
    scoreScope,
    onScoreScopeChange,
    displayMode,
    onDisplayModeChange,
    filters,
    onZoneQueryChange,
    onDateScopeChange,
    onCategoryToggle,
    onResetFilters,
  } = layoutProps;

  if (!MapCanvas) return null;

  return (
    <MapCanvas
      items={items}
      sourceItems={allItems}
      sourceCompleteness={sourceCompleteness}
      selectedActionId={selectedActionId}
      onSelectAction={onSelectAction}
      onClearSelection={onClearSelection}
      frameSelectedActionId={frameSelectedActionId}
      compact={compact}
      fullViewport={fullViewport}
      tone={tone}
      onViewportChange={onViewportChange}
      onViewportInteraction={onViewportInteraction}
      initialViewport={initialViewport}
      viewportRequest={viewportRequest}
      viewportRequestKey={viewportRequestKey}
      recenterViewport={recenterViewport}
      scoreScope={scoreScope}
      onScoreScopeChange={onScoreScopeChange}
      displayMode={displayMode}
      onDisplayModeChange={onDisplayModeChange}
      filters={filters}
      onZoneQueryChange={onZoneQueryChange}
      onDateScopeChange={onDateScopeChange}
      onCategoryToggle={onCategoryToggle}
      onResetFilters={onResetFilters}
    />
  );
}
