"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  orange: "from-orange-500 via-amber-400 to-yellow-400",
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

  return (
    <div className="w-full space-y-8 p-4 md:p-8">
      <section className={`rounded-[2rem] bg-gradient-to-br ${ACCENT_CLASSES[accent]} p-8 text-white md:p-10`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLabel[locale]}
            </Link>
            {cta ? (
              <Link
                href={cta.href}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                {cta.label[locale]}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="max-w-3xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/78">
              {isFrench ? "Page dédiée" : "Dedicated page"}
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">{title[locale]}</h1>
            <h2 className="text-xl font-semibold text-white/90 md:text-2xl">{subtitle[locale]}</h2>
            <p className="max-w-3xl text-base leading-relaxed text-white/82 md:text-lg">
              {description[locale]}
            </p>
            {highlights?.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {highlights.map((item) => (
                  <span
                    key={item[locale]}
                    className="inline-flex min-h-9 items-center rounded-full border border-white/16 bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm"
                  >
                    {item[locale]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}
