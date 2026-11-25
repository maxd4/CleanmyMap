"use client";

import type { ReactNode, ElementType } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { LucideIcon, Sparkles } from "lucide-react";
import { DASHBOARD_ROUTE, EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { resolvePageSurfacePalette } from "@/lib/ui/page-families/surface-palette";

export type L10n = { fr: string; en: string } | string;

export const RUBRIQUE_CONTAINER_VARIANTS = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const RUBRIQUE_ITEM_VARIANTS = {
  hidden: { opacity: 1, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function t(locale: "fr" | "en", value: L10n): string {
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
  headingLevel?: "h1" | "h2";
}

export function SectionShell({
  id,
  title,
  subtitle,
  gradient,
  children,
  summary,
  traceNote,
  links,
  hideHeader = false,
  headingLevel = "h1",
}: SectionShellProps) {
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const pageFamily = resolvePageFamily(pathname);
  const hero = pageFamily.hero;
  const usesWhiteCanvas = resolvePageSurfacePalette(pathname) !== null;
  const fr = locale === "fr";

  return (
    <section
      id={id}
      data-rubrique-report-root
      className="relative min-h-screen"
    >
      {/* Dynamic Background Gradient */}
      {!usesWhiteCanvas ? (
        <div
          className={`absolute inset-x-0 top-0 h-[24rem] bg-gradient-to-b ${
            gradient || hero.sectionGradient
          } pointer-events-none -z-10`}
        />
      ) : null}

      <CmmPageLayout>
        {!hideHeader && title ? (
          <PageHeader
            family={pageFamily}
            title={t(locale, title)}
            subtitle={subtitle ? t(locale, subtitle) : undefined}
            headingLevel={headingLevel}
          />
        ) : null}

        <CmmSectionGroup>
          {summary && (
            <div className="cmm-surface cmm-panel p-6">
              <h3 className="mb-4 text-sm font-semibold cmm-text-primary">{fr ? "Synthèse" : "Summary"}</h3>
              <div className="font-medium leading-relaxed cmm-text-primary">{summary}</div>
            </div>
          )}

          {(summary || links || traceNote) ? (
            <div className="cmm-surface cmm-panel p-4">
              {children}
            </div>
          ) : (
            <div className="relative">
              {children}
            </div>
          )}

          {links && (
            <div className="flex flex-wrap gap-4">
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
            <div className="cmm-surface cmm-panel p-6 text-sm cmm-text-secondary">
              {traceNote}
            </div>
          )}
        </CmmSectionGroup>
      </CmmPageLayout>
    </section>
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
