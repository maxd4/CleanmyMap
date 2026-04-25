"use client";

import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { CmmCard, type CardTone } from "@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";

export type L10n = { fr: string; en: string };

export function t(locale: "fr" | "en", value: L10n): string {
  return value[locale];
}

function RubriqueBlock(props: {
  title: string;
  children: ReactNode;
  tone?: CardTone;
}) {
  return (
    <CmmCard
      tone={props.tone ?? "slate"}
      variant="default"
      size="md"
      header={props.title}
    >
      {props.children}
    </CmmCard>
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
      className="space-y-5"
    >
      <CmmCard tone="slate" variant="default" size="lg" className="rounded-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t(locale, props.title)}
          </h1>
          <RubriquePdfExportButton rubriqueTitle={t(locale, props.title)} />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {t(locale, props.subtitle)}
        </p>
      </CmmCard>

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
            <CmmButtonGroup>
              {props.links.map((link, index) => (
                <CmmButton
                  key={`${link.href}-${link.label[locale]}`}
                  href={link.href}
                  tone={index === 0 ? "primary" : "secondary"}
                  variant="pill"
                >
                  {t(locale, link.label)}
                </CmmButton>
              ))}
            </CmmButtonGroup>
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
    <CmmCard tone="rose" size="lg">
      <h1 className="text-xl font-semibold text-rose-800">
        {locale === "fr" ? "Rubrique introuvable" : "Section not found"}
      </h1>
      <p className="mt-2 text-sm text-rose-700">
        {locale === "fr"
          ? "La rubrique demandée n'est pas définie dans la navigation Next.js."
          : "The requested section is not defined in Next.js navigation."}
      </p>
    </CmmCard>
  );
}

export function PendingSection(props: {
  label: L10n;
  description: L10n;
  note?: L10n;
}) {
  const { locale } = useSitePreferences();
  return (
    <CmmCard tone="amber" size="lg">
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
      <CmmButtonGroup className="mt-4">
        <CmmButton href="/dashboard" tone="secondary">
          {locale === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
        </CmmButton>
        <CmmButton href="/reports" tone="secondary">
          {locale === "fr" ? "Ouvrir le reporting" : "Open reporting"}
        </CmmButton>
      </CmmButtonGroup>
    </CmmCard>
  );
}
