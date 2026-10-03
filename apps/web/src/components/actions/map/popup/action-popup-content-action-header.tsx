import type { ActionPollutionProjectionPresentation } from "@/lib/actions/pollution/revisit-priority";
import type { CurrentPlaceState } from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { ScopedActionPollutionScore } from "../scores/pollution-score-scope";

export type ActionPopupContentActionHeaderProps = {
  recordTypeLabel: string;
  locationLabel: string;
  actionTitle: string;
  color: string;
  score: number;
  scoreLoading: boolean;
  wasteScore: number;
  buttsScore: number;
  statusLabel: string;
  geometryLabel: string;
  geometryModeLabel: string;
  geometryKind: "polyline" | "polygon" | "point" | "multiline" | null;
  geometryPointLabel: string;
  geometryConfidenceLabel: string | null;
  geometryMetricLabel: string | null;
  observedAt: string;
  wasteKg: number;
  butts: number;
  actionProjection: ActionPollutionProjectionPresentation | null;
  scoreScope: PollutionScoreScope;
  scoreUnavailable: boolean;
  globalScore?: ScopedActionPollutionScore | null;
  departmentScore?: ScopedActionPollutionScore | null;
  departmentName?: string | null;
  displayedScore: number;
  displayedScoreLabel: string;
  displayedDate: string;
  isDisplayedProjection: boolean;
  scopedCurrentPlaceState?: CurrentPlaceState | null;
};

import {
  ActionPopupContentActionLead,
  ActionPopupContentActionResults,
  ActionPopupContentActionScoreDetails,
} from "./action-popup-content-action-sections";

export function ActionPopupContentActionHeader(
  props: ActionPopupContentActionHeaderProps,
) {
  return (
    <div className="relative space-y-4 overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-400/20 via-sky-500/10 to-transparent" />
      <ActionPopupContentActionLead {...props} />
      <ActionPopupContentActionScoreDetails {...props} />
      <ActionPopupContentActionResults {...props} />
    </div>
  );
}
