"use client";

import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  resolveFeedbackSectionContext,
  type FeedbackSectionProps,
} from "./feedback-section.shared";
import { FeedbackSectionDashboard } from "./feedback-section-dashboard";
import { FeedbackSectionDiscussion } from "./feedback-section-discussion";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function FeedbackSection({
  pagePath: pagePathOverride,
  source = "feedback_section",
}: FeedbackSectionProps = {}) {
  const { locale } = useSitePreferences();
  const { pagePath, supportPrefill } = resolveFeedbackSectionContext(pagePathOverride);

  if (source === "feedback_discussion") {
    return (
      <FeedbackSectionDiscussion
        pagePath={pagePath}
        source={source}
        supportPrefill={supportPrefill}
        locale={locale}
      />
    );
  }

  return (
    <SectionShell id="feedback" hideHeader gradient="from-rose-100/80 via-white to-transparent">
      <FeedbackSectionDashboard
        pagePath={pagePath}
        source={source}
        supportPrefill={supportPrefill}
        locale={locale}
      />
    </SectionShell>
  );
}

export default FeedbackSection;
