import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { ReportsImpactReadingsSection } from "@/components/reports/reports-impact-readings-section";
import { ReportsPageTabs } from "./reports-page-tabs";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import type { CommunityEventItem } from "@/lib/community/http";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { Locale } from "@/lib/ui/preferences";
import type { AppProfile, ProfileAction } from "@/lib/profiles";
import { resolvePageFamily } from "@/lib/ui/page-families";

type ReportsWeather = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
} | null;

type ReportsPageV1LayoutProps = {
  locale: Locale;
  roleLabel: string;
  profile: AppProfile;
  primaryAction: ProfileAction;
  generationContent: ReactNode;
  defaultTab?: "generation" | "pilotage";
  summaryKpis: Array<{
    label: string;
    value: string;
    previousValue: string;
    deltaAbsolute: string;
    deltaPercent: string;
    interpretation: "positive" | "negative" | "neutral";
  }>;
  headerActions: Array<{ href: string; label: string }>;
  contracts: ActionDataContract[];
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
};

export function ReportsPageV1Layout({
  locale,
  roleLabel,
  profile,
  primaryAction,
  generationContent,
  defaultTab = "generation",
  summaryKpis,
  headerActions,
  contracts,
  communityEvents,
  weather,
}: ReportsPageV1LayoutProps) {
  const pageFamily = resolvePageFamily("/reports");

  return (
    <CmmGrid data-rubrique-report-root contentClassName="gap-4 lg:gap-6">
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <PageHero
          family={pageFamily}
          eyebrow={`Profil ${roleLabel}`}
          title="Rapports d'impact"
          subtitle="Arbitrer sur six mois, l'année en cours ou l'historique complet avec comparatifs N vs N-1."
          badges={
            <>
              <PageHeroBadge family={pageFamily}>
                Six mois / Année en cours / Historique complet
              </PageHeroBadge>
              <PageHeroBadge family={pageFamily} muted>
                Exports contrôlés
              </PageHeroBadge>
            </>
          }
          className="max-w-4xl pt-2"
        />
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <div className="flex flex-wrap gap-2">
          {headerActions.map((action: { href: string; label: string }) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <ReportsPageTabs
          defaultTab={defaultTab}
          generation={generationContent}
          pilotage={
            <CmmGrid as="div" contentClassName="gap-4 lg:gap-6">
              <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
                      Pilotage
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                      KPI et lecture du périmètre
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Les signaux opérationnels et les résumés de lecture sont regroupés ici pour
                      ne pas surcharger la génération du rapport.
                    </p>
                  </div>

                  <CmmGrid className="mt-4" contentClassName="gap-3">
                    {summaryKpis.map((kpi) => (
                      <CmmGridItem
                        key={kpi.label}
                        span={{ mobile: 4, tablet: 2, desktop: 4 }}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          {kpi.label}
                        </p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                          {kpi.value}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          vs {kpi.previousValue} · {kpi.deltaAbsolute} · {kpi.deltaPercent}
                        </p>
                      </CmmGridItem>
                    ))}
                  </CmmGrid>

                  <div className="mt-4">
                    <a
                      href={primaryAction.href}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-100"
                    >
                      {primaryAction.label[locale]}
                    </a>
                  </div>
                </section>
              </CmmGridItem>

              <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
                <ReportsImpactReadingsSection
                  contracts={contracts}
                  communityEvents={communityEvents}
                  weather={weather}
                />
              </CmmGridItem>

              <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
                <RolePrimaryActions profile={profile} />
              </CmmGridItem>
            </CmmGrid>
          }
        />
      </CmmGridItem>
    </CmmGrid>
  );
}
