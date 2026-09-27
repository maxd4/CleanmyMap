import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { ScopedActionPollutionScore } from "../scores/pollution-score-scope";

export type CompactActionHeaderProps = {
  recordTypeLabel: string;
  locationLabel: string;
  actionTitle: string;
  color: string;
  score: number;
  scoreLoading: boolean;
  displayedScoreLabel: string;
  historicalScoreLabel: string;
  projectedScoreLabel: string;
  elapsedDays: number;
  statusLabel: string;
  displayedDate: string;
  scoreScope?: PollutionScoreScope;
  isDisplayedProjection: boolean;
  projectionConfidence: string | null;
  wasteScore: number;
  buttsScore: number;
  globalScore?: ScopedActionPollutionScore | null;
  departmentScore?: ScopedActionPollutionScore | null;
  departmentName?: string | null;
  placeType: string | null;
  quality: string | null;
  geometryLabel: string;
  geometryTone: string;
  hasQuantifiedPollutionScore: boolean;
};

import {
  CompactActionHeaderDetails,
  CompactActionHeaderLead,
  CompactActionHeaderScore,
} from "./action-popup-content-compact-sections";

export function CompactActionHeader(props: CompactActionHeaderProps) {
  return (
    <div className="relative space-y-3 overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-400/18 via-sky-500/8 to-transparent" />
      <CompactActionHeaderLead {...props} />
      <CompactActionHeaderScore {...props} />
      <CompactActionHeaderDetails {...props} />
    </div>
  );
}
