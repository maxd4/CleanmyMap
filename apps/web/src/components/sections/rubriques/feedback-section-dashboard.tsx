"use client";

import { FeedbackSectionDashboardForm } from "./feedback-section-dashboard-form";
import { FeedbackSectionDashboardGuidance } from "./feedback-section-dashboard-guidance";
import type {
  FeedbackSectionProps,
  FeedbackSectionContext,
  Locale,
} from "./feedback-section.shared";

export type FeedbackSectionDashboardProps = Pick<
  FeedbackSectionContext,
  "pagePath" | "supportPrefill" | "initialType"
> & {
  source: NonNullable<FeedbackSectionProps["source"]>;
  locale: Locale;
};

export function FeedbackSectionDashboard(props: FeedbackSectionDashboardProps) {
  return <FeedbackDashboardMode {...props} />;
}

function FeedbackDashboardMode(props: FeedbackSectionDashboardProps) {
  return (
    <div className="space-y-10 pb-20 pt-2 text-slate-950">
      <FeedbackSectionDashboardForm
        pagePath={props.pagePath}
        locale={props.locale}
        source={props.source}
        supportPrefill={props.supportPrefill}
        initialType={props.initialType}
      />
      <FeedbackSectionDashboardGuidance locale={props.locale} fr={props.locale === "fr"} />
    </div>
  );
}
