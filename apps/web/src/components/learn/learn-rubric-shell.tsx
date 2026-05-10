"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, Layers3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type LearnRubricShellProps = {
  title: { fr: string; en: string };
  subtitle: { fr: string; en: string };
  description: { fr: string; en: string };
  highlights?: { fr: string; en: string }[];
  backLabel: { fr: string; en: string };
  backHref: string;
  accent: "blue" | "purple" | "emerald" | "orange";
  cta?: {
    href: string;
    label: { fr: string; en: string };
  };
  children: ReactNode;
};

const ACCENT_CLASSES: Record<LearnRubricShellProps["accent"], string> = {
  blue: "from-sky-500 via-cyan-500 to-blue-500",
  purple: "from-violet-500 via-fuchsia-500 to-purple-500",
  emerald: "from-emerald-500 via-lime-500 to-teal-500",
  orange: "from-yellow-200 via-amber-100 to-yellow-100",
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
  children,
}: LearnRubricShellProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const isLightOrange = accent === "orange";

  return (
    <div className="w-full space-y-8 p-4 md:p-8">
      <section
        className={
          isLightOrange
            ? "rounded-[2rem] border border-yellow-200/70 bg-[linear-gradient(180deg,rgba(255,253,231,0.98),rgba(255,255,255,0.98))] p-6 text-slate-900 shadow-[0_24px_56px_-32px_rgba(250,204,21,0.16)] md:p-8"
            : `rounded-[2rem] bg-gradient-to-br ${ACCENT_CLASSES[accent]} p-6 text-white md:p-8`
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={backHref}
                className={
                  isLightOrange
                    ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/60"
                    : "inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                }
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel[locale]}
              </Link>
              {cta ? (
                <Link
                  href={cta.href}
                  className={
                    isLightOrange
                      ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-900 transition hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/60"
                      : "inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  }
                >
                  {cta.label[locale]}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>

            <div className="max-w-3xl space-y-3">
              <p
                className={
                  isLightOrange
                    ? "text-[11px] font-black uppercase tracking-[0.22em] text-yellow-700"
                    : "text-[11px] font-black uppercase tracking-[0.22em] text-white/78"
                }
              >
                {isFrench ? "Page dédiée" : "Dedicated page"}
              </p>
              <h1
                className={
                  isLightOrange
                    ? "text-4xl font-black tracking-tight text-slate-900 md:text-6xl"
                    : "text-4xl font-black tracking-tight md:text-6xl"
                }
              >
                {title[locale]}
              </h1>
              <h2
                className={
                  isLightOrange
                    ? "text-xl font-semibold text-slate-800 md:text-2xl"
                    : "text-xl font-semibold text-white/90 md:text-2xl"
                }
              >
                {subtitle[locale]}
              </h2>
              <p
                className={
                  isLightOrange
                    ? "max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg"
                    : "max-w-3xl text-base leading-relaxed text-white/82 md:text-lg"
                }
              >
                {description[locale]}
              </p>
              {highlights?.length ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {highlights.map((item) => (
                    <span
                      key={item[locale]}
                      className={
                        isLightOrange
                          ? "inline-flex min-h-9 items-center rounded-full border border-yellow-200 bg-yellow-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-900"
                          : "inline-flex min-h-9 items-center rounded-full border border-white/16 bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm"
                      }
                    >
                      {item[locale]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <aside
            className={
              isLightOrange
                ? "overflow-hidden rounded-[1.75rem] border border-yellow-200/70 bg-white/92 p-4 shadow-[0_20px_40px_-28px_rgba(250,204,21,0.12)]"
                : "overflow-hidden rounded-[1.75rem] border border-white/14 bg-white/10 p-4 shadow-[0_20px_40px_-28px_rgba(255,255,255,0.18)] backdrop-blur-sm"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className={
                    isLightOrange
                      ? "text-[11px] font-black uppercase tracking-[0.22em] text-yellow-700"
                      : "text-[11px] font-black uppercase tracking-[0.22em] text-white/72"
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
                    ? "grid h-12 w-12 place-items-center rounded-2xl border border-yellow-200 bg-yellow-50 text-yellow-700"
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
                    ? "rounded-[1.4rem] border border-yellow-200 bg-yellow-50/80 p-4"
                    : "rounded-[1.4rem] border border-white/12 bg-black/10 p-4"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      isLightOrange
                        ? "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-yellow-700 shadow-sm"
                        : "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"
                    }
                  >
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span
                    className={
                      isLightOrange
                        ? "text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700"
                        : "text-[10px] font-black uppercase tracking-[0.18em] text-white/68"
                    }
                  >
                    01
                  </span>
                </div>
                <div
                  className={
                    isLightOrange
                      ? "mt-4 h-20 rounded-[1.1rem] border border-yellow-100 bg-white p-3"
                      : "mt-4 h-20 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))] p-3"
                  }
                >
                  <div className={isLightOrange ? "h-2 w-16 rounded-full bg-yellow-200" : "h-2 w-16 rounded-full bg-white/30"} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className={isLightOrange ? "h-9 rounded-xl bg-yellow-100" : "h-9 rounded-xl bg-white/18"} />
                    <span className={isLightOrange ? "h-12 rounded-xl bg-yellow-200/70" : "h-12 rounded-xl bg-white/24"} />
                    <span className={isLightOrange ? "h-8 rounded-xl bg-yellow-100" : "h-8 rounded-xl bg-white/16"} />
                  </div>
                </div>
                <p
                  className={
                    isLightOrange
                      ? "mt-3 text-sm font-semibold text-slate-700"
                      : "mt-3 text-sm font-semibold text-white/88"
                  }
                >
                  {subtitle[locale]}
                </p>
              </div>

              <div
                className={
                  isLightOrange
                    ? "rounded-[1.4rem] border border-yellow-200 bg-yellow-50/80 p-4"
                    : "rounded-[1.4rem] border border-white/12 bg-black/10 p-4"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      isLightOrange
                        ? "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-yellow-700 shadow-sm"
                        : "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"
                    }
                  >
                    <Layers3 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span
                    className={
                      isLightOrange
                        ? "text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700"
                        : "text-[10px] font-black uppercase tracking-[0.18em] text-white/68"
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
                          ? "inline-flex items-center rounded-2xl border border-yellow-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-900"
                          : "inline-flex items-center rounded-2xl border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/88"
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
                      : "mt-3 text-sm font-semibold text-white/88"
                  }
                >
                  {description[locale]}
                </p>
              </div>

              <div
                className={
                  isLightOrange
                    ? "rounded-[1.4rem] border border-yellow-200 bg-yellow-50/80 p-4"
                    : "rounded-[1.4rem] border border-white/12 bg-black/10 p-4"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      isLightOrange
                        ? "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-yellow-700 shadow-sm"
                        : "inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"
                    }
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span
                    className={
                      isLightOrange
                        ? "text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700"
                        : "text-[10px] font-black uppercase tracking-[0.18em] text-white/68"
                    }
                  >
                    03
                  </span>
                </div>
                <div
                  className={
                    isLightOrange
                      ? "mt-4 rounded-[1.1rem] border border-yellow-100 bg-white p-3"
                      : "mt-4 rounded-[1.1rem] border border-white/10 bg-white/8 p-3"
                  }
                >
                  <div className={isLightOrange ? "h-2 rounded-full bg-yellow-200" : "h-2 rounded-full bg-white/25"} />
                  <div className="mt-3 flex gap-2">
                    <span className={isLightOrange ? "h-10 flex-1 rounded-2xl bg-yellow-100" : "h-10 flex-1 rounded-2xl bg-white/14"} />
                    <span className={isLightOrange ? "h-10 flex-1 rounded-2xl bg-yellow-200/80" : "h-10 flex-1 rounded-2xl bg-white/22"} />
                  </div>
                </div>
                <p
                  className={
                    isLightOrange
                      ? "mt-3 text-sm font-semibold text-slate-700"
                      : "mt-3 text-sm font-semibold text-white/88"
                  }
                >
                  {cta ? cta.label[locale] : isFrench ? "Continuer" : "Continue"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {children}
    </div>
  );
}
