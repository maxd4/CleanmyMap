"use client";

import { FeedbackSectionDashboardForm } from "./feedback-section-dashboard-form";
import { FeedbackSectionDashboardGuidance } from "./feedback-section-dashboard-guidance";
import { FeedbackHistory } from "./feedback/feedback-history";
import type { FeedbackSectionDashboardProps } from "./feedback-section-dashboard.types";

export type { FeedbackSectionDashboardProps } from "./feedback-section-dashboard.types";

export function FeedbackSectionDashboard(props: FeedbackSectionDashboardProps) {
  return (
    <div className="space-y-10 pb-20 pt-2 text-slate-950">
      <FeedbackSectionDashboardForm {...props} />
      <FeedbackHistory locale={props.locale} />
      <FeedbackSectionDashboardGuidance locale={props.locale} />
    </div>
  );
}
