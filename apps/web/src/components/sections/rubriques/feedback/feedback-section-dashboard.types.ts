import type { FeedbackSectionProps, FeedbackSectionContext, Locale } from "./feedback-section.shared";
import type { FeedbackType } from "./questionnaire-config";

export type FeedbackSectionDashboardProps = Pick<
  FeedbackSectionContext,
  "pagePath" | "supportPrefill"
> & {
  source: NonNullable<FeedbackSectionProps["source"]>;
  locale: Locale;
  selectedType: FeedbackType;
  onSelectType: (type: FeedbackType) => void;
};
