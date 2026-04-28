"use client";

import type { ReactNode } from"react";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { RubriquePdfExportButton } from"@/components/ui/rubrique-pdf-export-button";
import { CmmCard, type CardTone } from"@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from"@/components/ui/cmm-button";

export type L10n = { fr: string; en: string };

export function t(locale:"fr" |"en", value: L10n): string {
 return value[locale];
}

function RubriqueBlock(props: {
 title: string;
 children: ReactNode;
 tone?: CardTone;
}) {
 return (
 <CmmCard
 tone={props.tone ??"slate"}
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
      <CmmCard tone="slate" variant="glass" size="lg" className="rounded-3xl border-slate-800/40 bg-slate-900/40 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold cmm-text-primary tracking-tight">
            {t(locale, props.title)}
          </h1>
          <RubriquePdfExportButton rubriqueTitle={t(locale, props.title)} />
        </div>
        <p className="mt-2 cmm-text-small cmm-text-secondary leading-relaxed">
          {t(locale, props.subtitle)}
        </p>
      </CmmCard>

      <div className="grid gap-4">
        <RubriqueBlock
          title={locale === "fr" ? "Résumer" : "Summarize"}
          tone="slate"
        >
          <div className="cmm-text-small cmm-text-secondary">
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
            <p className="cmm-text-small cmm-text-secondary italic">
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
          <div className="rounded-2xl border border-sky-900/20 bg-slate-950/40 backdrop-blur-sm p-3">
            {props.children}
          </div>
        </RubriqueBlock>

        <RubriqueBlock title={locale === "fr" ? "Tracer" : "Trace"} tone="amber">
          <div className="space-y-1 cmm-text-caption cmm-text-secondary">
            <p>
              <span className="font-semibold">{locale === "fr" ? "Horodatage:" : "Timestamp:"}</span>{" "}
              {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}
            </p>
            <p>
              <span className="font-semibold">{locale === "fr" ? "Sources:" : "Sources:"}</span>{" "}
              {locale === "fr"
                ? "API actions et métriques dérivées."
                : "Actions API and derived metrics."}
            </p>
            {props.traceNote ? (
              <div className="mt-2 rounded-xl border border-amber-900/20 bg-amber-950/20 px-3 py-2 cmm-text-caption cmm-text-secondary">
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
    <CmmCard tone="rose" size="lg" className="border-rose-900/20 bg-rose-950/20 backdrop-blur-md">
      <h1 className="text-xl font-bold text-rose-400">
        {locale === "fr" ? "Rubrique introuvable" : "Section not found"}
      </h1>
      <p className="mt-2 cmm-text-small text-rose-300/80">
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
    <CmmCard tone="amber" size="lg" className="border-amber-900/20 bg-amber-950/20 backdrop-blur-md">
      <h1 className="text-xl font-bold text-amber-400">
        {locale === "fr"
          ? `Rubrique en attente: ${props.label.fr}`
          : `Section in progress: ${props.label.en}`}
      </h1>
      <p className="mt-2 cmm-text-small font-semibold text-amber-300 uppercase tracking-wider">
        {locale === "fr" ? "But de la rubrique" : "Section purpose"}
      </p>
      <p className="mt-1 cmm-text-small text-amber-200/70">{t(locale, props.description)}</p>
      <p className="mt-3 cmm-text-small text-amber-200/60 italic">
        {props.note
          ? t(locale, props.note)
          : locale === "fr"
          ? "La route est active, mais le contenu final n'est pas encore livré."
          : "The route is active, but the final content is not delivered yet."}
      </p>
      <CmmButtonGroup className="mt-6">
        <CmmButton href="/dashboard" tone="secondary" variant="pill">
          {locale === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
        </CmmButton>
        <CmmButton href="/reports" tone="secondary" variant="pill">
          {locale === "fr" ? "Ouvrir le reporting" : "Open reporting"}
        </CmmButton>
      </CmmButtonGroup>
    </CmmCard>
  );
}

