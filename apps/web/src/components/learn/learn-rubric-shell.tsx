"use client";

import { ArrowLeft, ArrowRight, Compass, Layers3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { usePageFamily } from "@/lib/ui/page-families";

type LearnRubricShellProps = {
  title: { fr: string; en: string };
  subtitle: { fr: string; en: string };
  description: { fr: string; en: string };
  highlights?: { fr: string; en: string }[];
  backLabel: { fr: string; en: string };
  backHref: string;
  accent: "blue" | "purple" | "emerald" | "orange" | "yellow";
  cta?: {
    href: string;
    label: { fr: string; en: string };
  };
  showVisualPanel?: boolean;
  staticIntro?: ReactNode;
  children: ReactNode;
};

function LearnRubricIntro({
  staticIntro,
  family,
  title,
  subtitle,
  description,
  locale,
  isLightOrange,
}: Pick<LearnRubricShellProps, "staticIntro" | "title" | "subtitle" | "description"> & {
  family: ReturnType<typeof usePageFamily>;
  locale: "fr" | "en";
  isLightOrange: boolean;
}) {
  if (staticIntro) {
    return (
      <div className="space-y-2">
        {staticIntro}
        <p
          className={
            isLightOrange
              ? "cmm-text-body max-w-3xl"
              : "max-w-3xl text-base leading-relaxed text-white md:text-lg"
          }
        >
          {subtitle[locale]}
        </p>
        <p
          className={
            isLightOrange
              ? "cmm-text-body max-w-3xl"
              : "max-w-3xl text-base leading-relaxed text-white md:text-lg"
          }
        >
          {description[locale]}
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader family={family} title={title[locale]} subtitle={subtitle[locale]} />
      <p
        className={
          isLightOrange
            ? "cmm-text-body max-w-3xl"
            : "max-w-3xl text-base leading-relaxed text-white md:text-lg"
        }
      >
        {description[locale]}
      </p>
    </>
  );
}

const ACCENT_CLASSES: Record<LearnRubricShellProps["accent"], string> = {
  blue: "from-sky-500 via-cyan-500 to-blue-500",
  purple: "from-violet-500 via-fuchsia-500 to-purple-500",
  emerald: "from-emerald-500 via-lime-500 to-teal-500",
  orange: "from-amber-100 via-orange-50 to-yellow-50",
  yellow: "from-yellow-100 via-amber-50 to-orange-50",
};

export function LearnRubricShell({
  title,
  subtitle,
  description,
  highlights,
  backLabel,
  backHref,
  accent,
  cta,
  showVisualPanel = true,
  staticIntro,
  children,
}: LearnRubricShellProps) {
  const { locale } = useSitePreferences();
  const pageFamily = usePageFamily();
  const isFrench = locale === "fr";
  const isLightOrange = accent === "orange" || accent === "yellow";

  return (
    <CmmPageLayout>
      <section
        className={
        isLightOrange
            ? "rounded-[2rem] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,249,217,0.98),rgba(255,255,250,0.98))] p-6 text-slate-900 shadow-[0_24px_56px_-32px_rgba(249,115,22,0.16)] md:p-8"
            : `rounded-[2rem] bg-gradient-to-br ${ACCENT_CLASSES[accent]} p-6 text-white md:p-8`
        }
      >
        <div
          className={
            showVisualPanel
              ? "grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
              : "space-y-6"
          }
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <CmmButton
                href={backHref}
                tone="secondary"
                size="sm"
                variant="pill"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel[locale]}
              </CmmButton>
              {cta ? (
                <CmmButton
                  href={cta.href}
                  tone="critical"
                  size="sm"
                  variant="pill"
                  className="shrink-0"
                >
                  {cta.label[locale]}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </CmmButton>
              ) : null}
            </div>

            <LearnRubricIntro
              staticIntro={staticIntro}
              family={pageFamily}
              title={title}
              subtitle={subtitle}
              description={description}
              locale={locale}
              isLightOrange={isLightOrange}
            />
          </div>

          {showVisualPanel ? (
            <aside
              className={
                isLightOrange
                  ? "overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-white/92 p-4 shadow-[0_20px_40px_-28px_rgba(249,115,22,0.12)]"
                  : "overflow-hidden rounded-[1.75rem] border border-white/14 bg-white/10 p-4 shadow-[0_20px_40px_-28px_rgba(255,255,255,0.18)] backdrop-blur-sm"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className={
                      isLightOrange
                        ? "cmm-text-small font-black uppercase tracking-[0.18em] text-amber-700"
                        : "cmm-text-small font-black uppercase tracking-[0.18em] text-white"
                    }
                  >
                    {isFrench ? "Lecture visuelle" : "Visual read"}
                  </p>
                  <h3
                    className={
                      isLightOrange
                        ? "mt-1 text-xl font-black tracking-tight text-slate-900"
                        : "mt-1 text-xl font-black tracking-tight text-white"
                    }
                  >
                    {isFrench ? "3 repères rapides" : "3 quick cues"}
                  </h3>
                </div>
                <div
                  className={
                    isLightOrange
                      ? "grid h-12 w-12 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"
                      : "grid h-12 w-12 place-items-center rounded-2xl border border-white/16 bg-white/12"
                  }
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div
                  className={
                  isLightOrange
                      ? "rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-4"
                      : "rounded-[1.4rem] border border-white/12 bg-black/10 p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        isLightOrange
                          ? "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm"
                          : "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"
                      }
                    >
                      <Compass className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span
                      className={
                        isLightOrange
                          ? "cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700"
                          : "cmm-text-caption font-black uppercase tracking-[0.16em] text-white/80"
                      }
                    >
                      01
                    </span>
                  </div>
                  <div
                    className={
                      isLightOrange
                        ? "mt-4 h-20 rounded-[1.1rem] border border-amber-100 bg-orange-50/90 p-3"
                        : "mt-4 h-20 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))] p-3"
                  }
                >
                    <div className={isLightOrange ? "h-2 w-16 rounded-full bg-amber-200" : "h-2 w-16 rounded-full bg-white/30"} />
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <span className={isLightOrange ? "h-9 rounded-xl bg-amber-100" : "h-9 rounded-xl bg-white/18"} />
                      <span className={isLightOrange ? "h-12 rounded-xl bg-orange-200/70" : "h-12 rounded-xl bg-white/24"} />
                      <span className={isLightOrange ? "h-8 rounded-xl bg-amber-100" : "h-8 rounded-xl bg-white/16"} />
                    </div>
                  </div>
                  <p
                    className={
                      isLightOrange
                        ? "mt-3 text-sm font-semibold text-slate-700"
                        : "mt-3 text-sm font-semibold text-white"
                    }
                  >
                    {subtitle[locale]}
                  </p>
                </div>

                <div
                  className={
                      isLightOrange
                        ? "rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-4"
                        : "rounded-[1.4rem] border border-white/12 bg-black/10 p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        isLightOrange
                          ? "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm"
                          : "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"
                      }
                    >
                      <Layers3 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span
                      className={
                        isLightOrange
                          ? "cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700"
                          : "cmm-text-caption font-black uppercase tracking-[0.16em] text-white/80"
                      }
                    >
                      02
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {highlights?.slice(0, 2).map((item) => (
                      <span
                        key={item[locale]}
                        className={
                          isLightOrange
                            ? "inline-flex items-center rounded-2xl border border-amber-200 bg-orange-50 px-3 py-2 cmm-text-small font-black uppercase tracking-[0.16em] text-amber-900"
                            : "inline-flex items-center rounded-2xl border border-white/14 bg-white/10 px-3 py-2 cmm-text-small font-black uppercase tracking-[0.16em] text-white"
                        }
                      >
                        {item[locale]}
                      </span>
                    ))}
                  </div>
                  <p
                    className={
                      isLightOrange
                        ? "mt-3 text-sm font-semibold text-slate-700"
                        : "mt-3 text-sm font-semibold text-white"
                    }
                  >
                    {description[locale]}
                  </p>
                </div>

                <div
                  className={
                      isLightOrange
                        ? "rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-4"
                        : "rounded-[1.4rem] border border-white/12 bg-black/10 p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        isLightOrange
                          ? "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm"
                          : "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"
                      }
                    >
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span
                      className={
                        isLightOrange
                          ? "cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700"
                          : "cmm-text-caption font-black uppercase tracking-[0.16em] text-white/80"
                      }
                    >
                      03
                    </span>
                  </div>
                  <div
                    className={
                      isLightOrange
                        ? "mt-4 rounded-[1.1rem] border border-amber-100 bg-orange-50/80 p-3"
                        : "mt-4 rounded-[1.1rem] border border-white/10 bg-white/8 p-3"
                  }
                >
                    <div className={isLightOrange ? "h-2 rounded-full bg-amber-200" : "h-2 rounded-full bg-white/25"} />
                    <div className="mt-3 flex gap-2">
                      <span className={isLightOrange ? "h-10 flex-1 rounded-2xl bg-amber-100" : "h-10 flex-1 rounded-2xl bg-white/14"} />
                      <span className={isLightOrange ? "h-10 flex-1 rounded-2xl bg-orange-200/80" : "h-10 flex-1 rounded-2xl bg-white/22"} />
                    </div>
                  </div>
                  <p
                    className={
                      isLightOrange
                        ? "mt-3 text-sm font-semibold text-slate-700"
                        : "mt-3 text-sm font-semibold text-white"
                    }
                  >
                    {cta ? cta.label[locale] : isFrench ? "Continuer" : "Continue"}
                  </p>
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <CmmSectionGroup>{children}</CmmSectionGroup>
    </CmmPageLayout>
  );
}
