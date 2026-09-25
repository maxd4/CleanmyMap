"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type LearnLocalizedHeadingProps = {
  fr: string;
  en: string;
};

export function LearnLocalizedHeading({
  fr,
  en,
}: LearnLocalizedHeadingProps) {
  const { locale } = useSitePreferences();

  return (
    <h1 className="cmm-page-header-title text-slate-950">
      {locale === "fr" ? fr : en}
    </h1>
  );
}
