"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";

export type L10n = { fr: string; en: string };

export function t(locale: "fr" | "en", value: L10n): string {
  return value[locale];
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
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {locale === "fr" ? "Résumer" : "Summarize"}
        </p>
        <div className="mt-2 text-sm text-slate-700">
          {props.summary ??
            (locale === "fr"
              ? "Lecture operationnelle disponible dans la section analyser."
              : "Operational details available in Analyze section.")}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {locale === "fr" ? "Agir" : "Act"}
        </p>
        {props.links ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {props.links.map((link, index) => (
              <Link
                key={`${link.href}-${link.label.fr}`}
                href={link.href}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  index === 0
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {t(locale, link.label)}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {locale === "fr"
              ? "Aucune action rapide disponible."
              : "No quick action available."}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {locale === "fr" ? "Analyser" : "Analyze"}
        </p>
        <div className="mt-2">{props.children}</div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {locale === "fr" ? "Tracer" : "Trace"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {locale === "fr" ? "Horodatage: " : "Timestamp: "}
          {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date())}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {locale === "fr"
            ? "Fiabilite: consolidee selon qualite data. Sources: API actions et metriques derivees."
            : "Reliability: consolidated from data quality. Sources: actions API and derived metrics."}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {locale === "fr"
            ? "Methode: formules KPI normalisees. Perimetre: rubrique courante."
            : "Method: normalized KPI formulas. Scope: current section."}
        </p>
        {props.traceNote ? (
          <div className="mt-1 text-xs text-slate-600">{props.traceNote}</div>
        ) : null}
      </div>
    </section>
  );
}

export function NotFoundSection() {
  const { locale } = useSitePreferences();
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h1 className="text-xl font-semibold text-rose-800">
        {locale === "fr" ? "Rubrique introuvable" : "Section not found"}
      </h1>
      <p className="mt-2 text-sm text-rose-700">
        {locale === "fr"
          ? "La rubrique demandee n'est pas definie dans la navigation Next.js."
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
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
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
            ? "La route est active, mais le contenu final n'est pas encore livre."
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
