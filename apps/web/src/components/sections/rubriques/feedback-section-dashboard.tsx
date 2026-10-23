"use client";

import { FeedbackSectionDashboardForm } from "./feedback-section-dashboard-form";
import { FeedbackSectionDashboardGuidance } from "./feedback-section-dashboard-guidance";
import { FeedbackHistory } from "./feedback/feedback-history";
import type { FeedbackSectionDashboardProps } from "./feedback-section-dashboard.types";

export type { FeedbackSectionDashboardProps } from "./feedback-section-dashboard.types";

export function FeedbackSectionDashboard(props: FeedbackSectionDashboardProps) {
  return (
    <div className="space-y-10 pb-20 pt-2 text-slate-950">
      <FeedbackSectionDashboardForm
        pagePath={props.pagePath}
        locale={props.locale}
        source={props.source}
        supportPrefill={props.supportPrefill}
        selectedType={props.selectedType}
        onSelectType={props.onSelectType}
      />
      <FeedbackHistory locale={props.locale} />
      <FeedbackSectionDashboardGuidance locale={props.locale} fr={props.locale === "fr"} />
    </div>
  );
}
