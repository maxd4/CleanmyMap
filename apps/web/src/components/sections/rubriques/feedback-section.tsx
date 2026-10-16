"use client";

import { useEffect, useState } from "react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  resolveFeedbackSectionContext,
  type FeedbackSectionProps,
} from "./feedback-section.shared";
import type { FeedbackType } from "./feedback/questionnaire-config";
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
  const [selectedType, setSelectedType] = useState<FeedbackType>(
    initialContext.initialType,
  );

  useEffect(() => {
    const synchronizeWithBrowserUrl = () => {
      const nextContext = resolveFeedbackSectionContext(pagePathOverride, {
        pathname: window.location.pathname,
        searchParams: new URLSearchParams(window.location.search),
        hash: window.location.hash,
      });
      setContext(nextContext);
      setSelectedType(nextContext.initialType);
    };

    synchronizeWithBrowserUrl();
    window.addEventListener("popstate", synchronizeWithBrowserUrl);
    return () => window.removeEventListener("popstate", synchronizeWithBrowserUrl);
  }, [pagePathOverride]);

  function selectFeedbackType(type: FeedbackType) {
    setSelectedType(type);
    setContext((current) => ({ ...current, initialType: type }));

    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("type", type);
    url.hash = type;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const {
    pagePath,
    supportPrefill,
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
        selectedType={selectedType}
        onSelectType={selectFeedbackType}
      />
    </SectionShell>
  );
}
