"use client";

import { useId } from "react";
import { ArrowRight } from "lucide-react";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { LearnGestesPropresBarometer } from "@/components/learn/learn-gestes-propres-barometer";
import { LearnGestesPropresInsightsSection } from "@/components/learn/learn-gestes-propres-insights-section";
import { LearnIfopDepotsSection } from "@/components/learn/learn-ifop-depots-section";
import { LearnNumeriqueThemePanel } from "@/components/learn/learn-numerique-theme-panel";
import {
  LEARN_PRACTICE_THEME_ORDER,
  type LearnPracticeThemeId,
} from "@/lib/learning/practice/themes";

import { GuideCard } from "./learn-practice-theme-tabs.content";
import { THEME_LABELS, THEME_PANELS } from "./learn-practice-theme-tabs.data";
import { ThemeVisualBlock } from "./learn-practice-theme-tabs.visuals";

export { LEARN_PRACTICE_THEME_ORDER } from "@/lib/learning/practice/themes";
export type { LearnPracticeThemeId } from "@/lib/learning/practice/themes";

export function LearnPracticeThemeTabs({
  locale,
  activeTheme,
  onThemeChange,
}: {
  locale: LearnLocale;
  activeTheme: LearnPracticeThemeId;
  onThemeChange: (theme: LearnPracticeThemeId) => void;
}) {
  const baseId = useId();

  return (
    <section className="space-y-4 rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5">
      <div className="space-y-3">
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-amber-700">
          {locale === "fr" ? "Quatre thèmes" : "Four themes"}
        </p>
        <div
          role="tablist"
          aria-label={locale === "fr" ? "Thèmes des bonnes pratiques" : "Good practices themes"}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {LEARN_PRACTICE_THEME_ORDER.map((theme, index) => {
            const isActive = activeTheme === theme;
            const meta = THEME_LABELS[theme];
            const tabId = `${baseId}-tab-${theme}`;
            const panelId = `${baseId}-panel-${theme}`;

            return (
              <button
                key={theme}
                type="button"
                role="tab"
                id={tabId}
                aria-controls={panelId}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onThemeChange(theme)}
                onKeyDown={(event) => {
                  let nextTheme: LearnPracticeThemeId | null = null;

                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    nextTheme = LEARN_PRACTICE_THEME_ORDER[(index + 1) % LEARN_PRACTICE_THEME_ORDER.length];
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    nextTheme =
                      LEARN_PRACTICE_THEME_ORDER[
                        (index - 1 + LEARN_PRACTICE_THEME_ORDER.length) % LEARN_PRACTICE_THEME_ORDER.length
                      ];
                  } else if (event.key === "Home") {
                    nextTheme = LEARN_PRACTICE_THEME_ORDER[0];
                  } else if (event.key === "End") {
                    nextTheme = LEARN_PRACTICE_THEME_ORDER[LEARN_PRACTICE_THEME_ORDER.length - 1];
                  }

                  if (!nextTheme) {
                    return;
                  }

                  event.preventDefault();
                  onThemeChange(nextTheme);
                  const nextButton = document.getElementById(`${baseId}-tab-${nextTheme}`);
                  if (nextButton instanceof HTMLButtonElement) {
                    nextButton.focus();
                  }
                }}
                className={cn(
                  "flex w-full flex-col rounded-[1.45rem] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  isActive
                    ? "border-amber-300 bg-white shadow-[0_10px_24px_-18px_rgba(245,158,11,0.35)]"
                    : "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/60",
                )}
              >
                <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 text-base font-black tracking-tight cmm-text-primary">
                  {meta.label[locale]}
                </span>
                <span className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
                  {meta.hint[locale]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {LEARN_PRACTICE_THEME_ORDER.map((theme) => {
        const meta = THEME_LABELS[theme];
        const isActive = activeTheme === theme;
        const tabId = `${baseId}-tab-${theme}`;
        const panelId = `${baseId}-panel-${theme}`;

        if (!isActive) {
          return null;
        }

        if (theme === "numerique") {
          return (
            <LearnNumeriqueThemePanel
              key={theme}
              locale={locale}
              tabId={tabId}
              panelId={panelId}
            />
          );
        }

        const panel = THEME_PANELS[theme];

        return (
          <section
            key={theme}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            className="space-y-4"
          >
            <CmmCard tone="amber" variant="elevated" className="space-y-4 p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl space-y-2">
                  <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                    {meta.label[locale]}
                  </p>
                  <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
                    {locale === "fr" ? "L’essentiel avant les détails" : "The essentials before details"}
                  </h3>
                  <p className="cmm-text-small leading-relaxed cmm-text-secondary">
                    {panel.summary[locale]}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-900">
                  {locale === "fr" ? "1 thème actif" : "1 active theme"}
                </span>
              </div>

              <ThemeVisualBlock locale={locale} theme={theme} />

              <ol className="grid gap-3 md:grid-cols-3">
                {panel.rules.map((rule, ruleIndex) => (
                  <li
                    key={rule.fr}
                    className="rounded-[1.2rem] border border-amber-200 bg-white p-4 shadow-sm"
                  >
                    <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                      {String(ruleIndex + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 cmm-text-small font-semibold leading-relaxed cmm-text-primary">
                      {rule[locale]}
                    </p>
                  </li>
                ))}
              </ol>
            </CmmCard>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                    {locale === "fr" ? "Guides essentiels" : "Essential guides"}
                  </p>
                  <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
                    {locale === "fr" ? "Action d’abord, texte ensuite" : "Action first, text later"}
                  </h4>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {panel.guides.map((guide) => (
                  <GuideCard key={guide.href} locale={locale} guide={guide} />
                ))}
              </div>

              {panel.shortcuts.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-amber-200 bg-white p-4">
                  <p className="mr-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                    {locale === "fr" ? "Accès rapide" : "Quick access"}
                  </p>
                  {panel.shortcuts.map((shortcut) => (
                    <CmmButton
                      key={shortcut.href}
                      href={shortcut.href}
                      tone="tertiary"
                      variant="pill"
                      size="sm"
                      className="px-3 py-2 cmm-text-caption font-black uppercase tracking-[0.16em]"
                    >
                      {shortcut.title[locale]}
                    </CmmButton>
                  ))}
                </div>
              ) : null}
            </div>

            {theme === "reduire" ? (
              <LearnGestesPropresInsightsSection locale={locale} theme={theme} scope="theme" />
            ) : null}

            {theme === "reduire" ? <LearnGestesPropresBarometer locale={locale} /> : null}

            {theme === "reduire" ? <LearnIfopDepotsSection locale={locale} /> : null}

            {theme === "tri" ? (
              <LearnGestesPropresInsightsSection locale={locale} theme={theme} scope="theme" />
            ) : null}

            <details className="group rounded-[1.35rem] border border-amber-200 bg-white px-4 py-3 shadow-sm">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none">
                <div className="space-y-1 pr-4">
                  <p className="text-base font-black tracking-tight cmm-text-primary">
                    {panel.accordion.title[locale]}
                  </p>
                  <p className="cmm-text-small leading-relaxed cmm-text-secondary">
                    {panel.accordion.lead[locale]}
                  </p>
                </div>
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 transition group-open:rotate-180">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>

              <ul className="mt-4 space-y-2 border-t border-amber-100 pt-4">
                {panel.accordion.bullets.map((bullet) => (
                  <li
                    key={bullet.fr}
                    className="rounded-2xl border border-amber-100 bg-amber-50/40 px-3 py-2 cmm-text-small leading-relaxed cmm-text-primary"
                  >
                    {bullet[locale]}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}
    </section>
  );
}
