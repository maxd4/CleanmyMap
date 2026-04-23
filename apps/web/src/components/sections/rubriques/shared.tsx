"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";

export type L10n = { fr: string; en: string };

export function t(locale: "fr" | "en", value: L10n): string {
  return value[locale];
}

function RubriqueBlock(props: {
  title: string;
  children: ReactNode;
  tone?: "slate" | "emerald" | "sky" | "amber" | "violet";
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-white/90 shadow-sm shadow-slate-200/50",
    emerald: "border-emerald-200 bg-emerald-50/70 shadow-sm shadow-emerald-100/60",
    sky: "border-sky-200 bg-sky-50/70 shadow-sm shadow-sky-100/60",
    amber: "border-amber-200 bg-amber-50/70 shadow-sm shadow-amber-100/60",
    violet: "border-violet-200 bg-violet-50/70 shadow-sm shadow-violet-100/60",
  }[props.tone ?? "slate"];

  return (
    <section
      className={`overflow-hidden rounded-3xl border ${toneClasses} ring-1 ring-black/5`}
    >
      <div className="border-b border-black/5 bg-white/60 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {props.title}
        </p>
      </div>
      <div className="px-4 py-4">{props.children}</div>
    </section>
  );
}

export function SectionShell(props: {
  title: L10n;
  subtitle: L10n;
  children: ReactNode;
  summary?: ReactNode;
  traceNote?: ReactNode;
  links?: Array<{ href: string; label: L10n }>;
}) {
  const { locale } = useSitePreferences();
  return (
    <section
      data-rubrique-report-root
      className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {locale === "fr" ? "Pourquoi je suis ici" : "Why am I here"}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {t(locale, props.title)}
            </h1>
            <RubriquePdfExportButton rubriqueTitle={t(locale, props.title)} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {t(locale, props.subtitle)}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <RubriqueBlock
          title={locale === "fr" ? "Résumer" : "Summarize"}
          tone="slate"
        >
          <div className="text-sm text-slate-700">
            {props.summary ??
              (locale === "fr"
                ? "Lecture opérationnelle disponible dans la section analyser."
                : "Operational details available in Analyze section.")}
          </div>
        </RubriqueBlock>

        <RubriqueBlock title={locale === "fr" ? "Agir" : "Act"} tone="emerald">
          {props.links ? (
            <div className="flex flex-wrap gap-2">
              {props.links.map((link, index) => (
                <Link
                  key={`${link.href}-${link.label[locale]}`}
                  href={link.href}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                    index === 0
                      ? "border-emerald-300 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                      : "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  {t(locale, link.label)}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {locale === "fr"
                ? "Aucune action rapide disponible."
                : "No quick action available."}
            </p>
          )}
        </RubriqueBlock>

        <RubriqueBlock
          title={locale === "fr" ? "Analyser" : "Analyze"}
          tone="sky"
        >
          <div className="rounded-2xl border border-sky-200 bg-white/85 p-3">
            {props.children}
          </div>
        </RubriqueBlock>

        <RubriqueBlock title={locale === "fr" ? "Tracer" : "Trace"} tone="amber">
          <div className="space-y-1 text-xs text-slate-600">
            <p>
              {locale === "fr" ? "Horodatage: " : "Timestamp: "}
              {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}
            </p>
            <p>
              {locale === "fr"
                ? "Sources: API actions et métriques dérivées."
                : "Sources: actions API and derived metrics."}
            </p>
            {props.traceNote ? (
              <div className="rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-xs text-slate-700">
                {props.traceNote}
              </div>
            ) : null}
          </div>
        </RubriqueBlock>
      </div>
    </section>
  );
}

export function NotFoundSection() {
  const { locale } = useSitePreferences();
  return (
    <section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-rose-800">
        {locale === "fr" ? "Rubrique introuvable" : "Section not found"}
      </h1>
      <p className="mt-2 text-sm text-rose-700">
        {locale === "fr"
          ? "La rubrique demandée n'est pas définie dans la navigation Next.js."
          : "The requested section is not defined in Next.js navigation."}
      </p>
    </section>
  );
}

export function PendingSection(props: {
  label: L10n;
  description: L10n;
  note?: L10n;
}) {
  const { locale } = useSitePreferences();
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-amber-900">
        {locale === "fr"
          ? `Rubrique en attente: ${props.label.fr}`
          : `Section in progress: ${props.label.en}`}
      </h1>
      <p className="mt-2 text-sm font-medium text-amber-900">
        {locale === "fr" ? "But de la rubrique" : "Section purpose"}
      </p>
      <p className="mt-1 text-sm text-amber-800">{t(locale, props.description)}</p>
      <p className="mt-2 text-sm text-amber-800">
        {props.note
          ? t(locale, props.note)
          : locale === "fr"
            ? "La route est active, mais le contenu final n'est pas encore livré."
            : "The route is active, but the final content is not delivered yet."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          {locale === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
        </Link>
        <Link
          href="/reports"
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          {locale === "fr" ? "Ouvrir le reporting" : "Open reporting"}
        </Link>
      </div>
    </section>
  );
}
