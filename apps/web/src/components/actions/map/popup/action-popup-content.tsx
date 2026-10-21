"use client";

import { mapItemCoordinates } from "@/lib/actions/data-contract";
import { ActionMapItem } from "@/lib/actions/types";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import type { CorridorHistory } from "@/lib/actions/pollution/corridor-history";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import { CorridorPopupContent } from "./corridor-popup-content";
import { SingleActionPopupContent } from "./action-popup-content-single";

type ActionPopupContentProps = {
  item: ActionMapItem;
  color: string;
  coords: { latitude: number | null; longitude: number | null };
  compact?: boolean;
  onViewGeometry?: () => void;
  corridorItems?: readonly ActionMapItem[];
  corridorHistory?: CorridorHistory;
  onViewGeometryForItem?: (item: ActionMapItem) => void;
  resolveColorForItem?: (item: ActionMapItem) => string;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceState?: CurrentPlaceState | null;
  scoreScope?: PollutionScoreScope;
  resolveCurrentPlaceStateForItem?: (
    item: ActionMapItem,
  ) => CurrentPlaceState | null;
  wrap?: boolean;
};

export function ActionPopupContent(props: ActionPopupContentProps) {
  const corridorItems = props.corridorItems ?? [];
  if (corridorItems.length >= 2 && props.corridorHistory) {
    return (
      <CorridorPopupContent
        corridorItems={corridorItems}
        corridorHistory={props.corridorHistory}
        color={props.color}
        displayMode={props.displayMode}
        scoreScope={props.scoreScope}
        resolveCurrentPlaceStateForItem={props.resolveCurrentPlaceStateForItem}
        renderAction={(item) => (
          <SingleActionPopupContent
            item={item}
            color={props.resolveColorForItem?.(item) ?? props.color}
            coords={mapItemCoordinates(item)}
            onViewGeometry={
              props.onViewGeometryForItem?.bind(null, item) ?? props.onViewGeometry
            }
            displayMode={props.displayMode}
            currentPlaceState={
              props.resolveCurrentPlaceStateForItem?.(item) ?? null
            }
            scoreScope={props.scoreScope}
            compact={props.compact}
            wrap={false}
          />
        )}
      />
    );
  }

  return <SingleActionPopupContent {...props} wrap={props.wrap ?? true} />;
}
