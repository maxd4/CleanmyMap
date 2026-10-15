"use client";

import { FeedbackSectionDashboardForm } from "./feedback-section-dashboard-form";
import { FeedbackSectionDashboardGuidance } from "./feedback-section-dashboard-guidance";
import {
  useFeedbackDashboardController,
  type FeedbackSectionDashboardProps,
} from "./use-feedback-dashboard-controller";

export function FeedbackSectionDashboard(props: FeedbackSectionDashboardProps) {
  return <FeedbackDashboardMode {...props} />;
}

function FeedbackDashboardMode(props: FeedbackSectionDashboardProps) {
  const controller = useFeedbackDashboardController(props);

  return (
    <div className="space-y-10 pb-20 pt-2 text-slate-950">
      <FeedbackSectionDashboardForm
        {...controller}
        pagePath={props.pagePath}
        locale={props.locale}
      />
      <FeedbackSectionDashboardGuidance locale={props.locale} fr={controller.fr} />
    </div>
  );
}
