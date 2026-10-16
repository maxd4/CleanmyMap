"use client";

import { useEffect, useState } from "react";
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
  initialSearchParams,
}: FeedbackSectionProps = {}) {
  const { locale } = useSitePreferences();
  const initialContext = resolveFeedbackSectionContext(pagePathOverride, {
    searchParams: initialSearchParams,
  });
  const [context, setContext] = useState(initialContext);

  useEffect(() => {
    const synchronizeWithBrowserUrl = () => {
      setContext(
        resolveFeedbackSectionContext(pagePathOverride, {
          pathname: window.location.pathname,
          searchParams: new URLSearchParams(window.location.search),
          hash: window.location.hash,
        }),
      );
    };

    synchronizeWithBrowserUrl();
    window.addEventListener("popstate", synchronizeWithBrowserUrl);
    return () => window.removeEventListener("popstate", synchronizeWithBrowserUrl);
  }, [pagePathOverride]);

  const {
    pagePath,
    supportPrefill,
    initialType,
    source: sourceFromUrl,
  } = context;

  const resolvedSource =
    source === "feedback_section" ? sourceFromUrl : source;

  if (source === "feedback_discussion") {
    return (
      <FeedbackSectionDiscussion
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
        source={resolvedSource}
        supportPrefill={supportPrefill}
        locale={locale}
        initialType={initialType}
      />
    </SectionShell>
  );
}
