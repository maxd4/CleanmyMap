"use client";

import type { ReactNode, ElementType } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
import { LucideIcon, Sparkles, Target } from "lucide-react";
import { DASHBOARD_ROUTE, EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";
import { resolvePageFamily } from "@/lib/ui/page-families";

export type L10n = { fr: string; en: string } | string;

export function t(locale: "fr" | "en", value: L10n): string {
  if (typeof value === "string") return value;
  return value[locale];
}

interface SectionShellProps {
  id: string;
  title?: L10n;
  subtitle?: L10n;
  icon?: LucideIcon | ElementType;
  gradient?: string;
  children: ReactNode;
  summary?: ReactNode;
  traceNote?: ReactNode;
  links?: Array<{ href: string; label: { fr: string; en: string } }>;
  hideHeader?: boolean;
}

export function SectionShell({
  id,
  title,
  subtitle,
  icon: Icon,
  gradient,
  children,
  summary,
  traceNote,
  links,
  hideHeader = false,
}: SectionShellProps) {
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const pageFamily = resolvePageFamily(pathname);
  const hero = pageFamily.hero;
  const fr = locale === "fr";

  return (
    <section
      id={id}
      data-rubrique-report-root
      className="relative min-h-screen"
    >
      {/* Dynamic Background Gradient */}
      <div
        className={`absolute inset-x-0 top-0 h-[24rem] bg-gradient-to-b ${
          gradient || hero.sectionGradient
        } pointer-events-none -z-10`}
      />
      
      {!hideHeader && title && (
        <div className="mb-16 space-y-8">
          <PageHeader
            family={pageFamily}
            title={
              <span className="inline-flex items-center gap-4">
                {Icon ? (
                  <span className={hero.iconWrap}>
                    <Icon size={24} className={hero.icon} aria-hidden="true" />
                  </span>
                ) : null}
                <span>{t(locale, title)}</span>
              </span>
            }
            subtitle={subtitle ? t(locale, subtitle) : undefined}
          />
          
          <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        </div>
      )}

      {/* Legacy Support for Summarize/Act/Trace if needed, but usually sections handle their own layout now */}
      {(summary || links || traceNote) ? (
        <div className="grid gap-8">
          {summary && (
            <div className="p-8 rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-xl">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">{fr ? "Synthèse" : "Summary"}</h3>
              <div className="text-slate-300 font-medium leading-relaxed">{summary}</div>
            </div>
          )}
          
          <div className="rounded-[3rem] border border-white/10 bg-slate-950/20 p-4">
            {children}
          </div>

          {links && (
            <div className="flex flex-wrap gap-4 pt-4">
              {links.map((link) => (
                <CmmButton
                  key={link.href}
                  href={link.href}
                  tone="secondary"
                  variant="pill"
                  className="px-8"
                >
                  {t(locale, link.label)}
                </CmmButton>
              ))}
            </div>
          )}

          {traceNote && (
            <div className="mt-8 p-6 rounded-2xl border border-amber-500/10 bg-amber-500/5 text-amber-500/60 text-xs font-medium italic">
              {traceNote}
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          {children}
        </div>
      )}
    </section>
  );
}

export function NotFoundSection() {
  const { locale } = useSitePreferences();
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <div className="w-24 h-24 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-8 shadow-2xl shadow-rose-500/10">
        <Target size={48} />
      </div>
      <PageHeader
        align="center"
        tone="red"
        title={locale === "fr" ? "Rubrique introuvable" : "Section not found"}
        subtitle={
          locale === "fr"
            ? "Désolé, cette rubrique n'existe pas ou a été déplacée par nos équipes."
            : "Sorry, this section does not exist or has been moved by our teams."
        }
      />
      <CmmButton href={EXPLORER_ROUTE} tone="primary" className="mt-12 h-16 px-10 rounded-2xl font-black shadow-xl shadow-rose-500/20">
        {locale === "fr" ? "Explorer le plan" : "Explore map"}
      </CmmButton>
    </div>
  );
}

export function PendingSection({ label, description, note }: { label: L10n; description: L10n; note?: L10n }) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  
  return (
    <div className="relative overflow-hidden rounded-[4rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-16 lg:p-24 shadow-2xl text-center">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mb-32" />

      <div className="relative z-10 space-y-10">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-black uppercase tracking-[0.3em] text-amber-500">
          <Sparkles size={16} />
          {fr ? "Bientôt disponible" : "Coming Soon"}
        </div>
        
        <PageHeader
          align="center"
          contrast="inverse"
          title={t(locale, label)}
          subtitle={t(locale, description)}
        />

        <div className="pt-8">
          <p className="text-sm text-slate-500 font-black uppercase tracking-widest italic opacity-60">
            {note ? t(locale, note) : (fr ? "Nos équipes finalisent le contenu technique..." : "Our teams are finalizing technical content...")}
          </p>
        </div>

        <CmmButtonGroup className="justify-center pt-12">
          <CmmButton href={DASHBOARD_ROUTE} tone="secondary" variant="pill" className="h-14 px-8 font-black uppercase tracking-widest text-xs">
            {fr ? "Mon espace" : "Dashboard"}
          </CmmButton>
          <CmmButton href={EXPLORER_ROUTE} tone="primary" className="h-14 px-8 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/20">
            {fr ? "Explorer tout" : "Explore all"}
          </CmmButton>
        </CmmButtonGroup>
      </div>
    </div>
  );
}
