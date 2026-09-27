import type { ActionPopupContentHeaderProps } from "./action-popup-content-header";

export type ActionPopupContentSignalHeaderProps = Pick<
  ActionPopupContentHeaderProps,
  | "recordTypeLabel"
  | "locationLabel"
  | "color"
  | "score"
  | "scoreLoading"
  | "scoreReading"
  | "scoreSourceLabel"
  | "wasteScore"
  | "buttsScore"
  | "statusLabel"
  | "placeType"
  | "quality"
  | "geometryLabel"
  | "geometryModeLabel"
  | "geometryPointLabel"
  | "geometryConfidenceLabel"
  | "geometryMetricLabel"
  | "displayMode"
  | "currentPlaceState"
  | "hasQuantifiedPollutionScore"
> & {
  geometryTone: {
    glow: string;
    accent: string;
    shell: string;
  };
};

import {
  SignalHeaderGeometry,
  SignalHeaderLead,
  SignalHeaderMeta,
  SignalHeaderTerrain,
} from "./action-popup-content-signal-sections";

export function ActionPopupContentSignalHeader(
  props: ActionPopupContentSignalHeaderProps,
) {
  return (
    <div className="relative space-y-4 overflow-hidden p-5">
      <SignalHeaderLead {...props} />
      <SignalHeaderTerrain {...props} />
      <SignalHeaderMeta {...props} />
      <SignalHeaderGeometry {...props} />
    </div>
  );
}
