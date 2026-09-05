import { ArrowRight } from "lucide-react";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import type { ThemeGuide } from "./learn-practice-theme-tabs.data";

export function GuideCard({
  locale,
  guide,
}: {
  locale: LearnLocale;
  guide: ThemeGuide;
}) {
  const Icon = guide.icon;

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col justify-between p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Guide" : "Guide"}
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight cmm-text-primary">
              {guide.title[locale]}
            </h4>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="cmm-text-small leading-relaxed cmm-text-secondary">{guide.detail[locale]}</p>
      </div>

      <CmmButton
        href={guide.href}
        tone="secondary"
        variant="pill"
        className="mt-4 w-full justify-between px-4 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
      >
        {guide.cta[locale]}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}
