import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form";
import { BusinessAlertsPanel } from "@/components/dashboard/business-alerts-panel";
import { ClosedLoopPanel } from "@/components/dashboard/closed-loop-panel";
import { DashboardComparisonGrid } from "@/components/dashboard/dashboard-comparison-grid";
import { FunnelConversionPanel } from "@/components/dashboard/funnel-conversion-panel";
import { ReportExportSmokeCard } from "@/components/dashboard/report-export-smoke-card";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";

import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { PunchySlogan } from "@/components/ui/punchy-slogan";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale, getServerDisplayMode } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslation } from "@/lib/i18n/server-translation";
import { IdentityProfileBanner } from "@/components/ui/identity-profile-banner";

async function loadDashboardOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 30,
    limit: 1800,
  });
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const identity = await getCurrentUserIdentity();
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const locale = await getServerLocale();
  const displayMode = await getServerDisplayMode();
  const roleLabel = getProfileLabel(profile, locale);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const overview = await loadDashboardOverview().catch(() => null);
  const { t } = getTranslation("dashboard", locale);
  const fallbackActorName = userId ?? "unknown-user";
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];

  const kpis = overview
    ? ([
      {
        label: overview.summary.kpis[0].label,
        value: overview.summary.kpis[0].value,
        previousValue: overview.summary.kpis[0].previousValue,
        deltaAbsolute: overview.summary.kpis[0].deltaAbsolute,
        deltaPercent: overview.summary.kpis[0].deltaPercent,
        interpretation: overview.summary.kpis[0].interpretation,
      },
      {
        label: overview.summary.kpis[1].label,
        value: overview.summary.kpis[1].value,
        previousValue: overview.summary.kpis[1].previousValue,
        deltaAbsolute: overview.summary.kpis[1].deltaAbsolute,
        deltaPercent: overview.summary.kpis[1].deltaPercent,
        interpretation: overview.summary.kpis[1].interpretation,
      },
      {
        label: overview.summary.kpis[2].label,
        value: overview.summary.kpis[2].value,
        previousValue: overview.summary.kpis[2].previousValue,
        deltaAbsolute: overview.summary.kpis[2].deltaAbsolute,
        deltaPercent: overview.summary.kpis[2].deltaPercent,
        interpretation: overview.summary.kpis[2].interpretation,
      },
    ] as const)
    : ([
      {
        label: "Impact terrain",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
      {
        label: "Mobilisation",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
      {
        label: "Qualite data",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
    ] as const);

  const impactKpis = kpis.slice(0, 3).map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
  }));
  const adaptiveHref = overview?.summary.recommendedAction.href ?? primaryAction.href;
  const adaptiveLabel =
    overview?.summary.recommendedAction.label ?? primaryAction.label[locale];
  const adaptiveReason = overview?.summary.recommendedAction.reason;

  if (pageTemplateV2Enabled) {
    return (
      <div className="flex flex-col gap-6" data-display-mode={displayMode}>
        <PunchySlogan />
        <IdentityProfileBanner profile={profile} />
        <PageReadingTemplate
          context={`Profil ${roleLabel}`}
          title={t("title_v2")}
          objective={t("objective_v2")}
          summary={
            <ThirtySecondsSummary
              kpis={kpis}
              alert={overview ? overview.summary.alert : undefined}
              recommendedAction={{
                href:
                  overview?.summary.recommendedAction.href ?? primaryAction.href,
                label:
                  overview?.summary.recommendedAction.label ??
                  primaryAction.label[locale],
              }}
              recommendedReason={overview?.summary.recommendedAction.reason}
            />
          }
          primaryAction={{
            href: primaryAction.href,
            label: primaryAction.label[locale],
          }}
          secondaryAction={
            secondaryAction
              ? { href: secondaryAction.href, label: secondaryAction.label[locale] }
              : undefined
          }
          analysis={
            <>
              <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl core-feature">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("section1_sup")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {t("section1_title")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("section1_desc")}
                  </p>
                </div>

                <DashboardComparisonGrid overview={overview} />

                <BusinessAlertsPanel />
              </section>

              <FunnelConversionPanel />
              <ClosedLoopPanel
                impactKpis={impactKpis}
                recommendedHref={adaptiveHref}
                recommendedLabel={adaptiveLabel}
                recommendedReason={adaptiveReason}
              />

              <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("section2_sup")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {t("section2_title")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("section2_desc")}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-1">
                  <ReportExportSmokeCard />
                </div>
              </section>

              {overview ? (
                <KpiMethodBlock
                  methods={overview.methods.slice(0, 3)}
                  title={t("section_method")}
                />
              ) : null}

              <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("section3_sup")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {t("section3_title")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("section3_desc")}
                  </p>
                </div>
                <ActionDeclarationForm
                  actorNameOptions={actorNameOptions}
                  defaultActorName={actorNameOptions[0]}
                  clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
                  clerkUserId={identity?.userId ?? fallbackActorName}
                  initialMode="quick"
                />
              </section>
            </>
          }
          trace={
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                {t("trace_time")}{" "}
                {overview
                  ? new Date(overview.generatedAt).toLocaleString("fr-FR")
                  : "indisponible"}{" "}
                | {t("trace_reliability")}{" "}
                {overview
                  ? t("trace_good")
                  : t("trace_bad")}
              </p>
              <p>
                {t("trace_source")}
              </p>
              <p>
                {t("trace_method")}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <RubriquePdfExportButton rubriqueTitle="Tableau de bord pilotage" />
                <RubriqueExcelExportButton
                  rubriqueTitle="Tableau de bord pilotage"
                  data={overview?.contracts.map(c => ({
                    Date: c.dates.observedAt,
                    Lieu: c.location.label,
                    Masse_Kg: c.metadata.wasteKg || 0,
                    Megots: c.metadata.cigaretteButts || 0,
                    Benevoles: c.metadata.volunteersCount,
                    Duree_Min: c.metadata.durationMinutes,
                    Type: c.type,
                    Source: c.source
                  }))}
                />
                <Link
                  href="/reports"
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t("btn_reports")}
                </Link>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div data-rubrique-report-root className="flex w-full flex-col gap-6">
      <PunchySlogan />
      <ThirtySecondsSummary
        kpis={kpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label[locale],
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <header className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none animate-pulse"></div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 relative z-10">
          Espace applicatif
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 relative z-10">
          {t("title_v1")} {roleLabel.toLowerCase()}
        </h1>
        <p className="mt-2 text-sm text-slate-600 relative z-10">
          {t("desc_v1")}
        </p>

        {/* BOUTONS DYNAMIQUES GÉANTS VS ROLE */}
        <div className="mt-8 relative z-10">
          {role === 'benevole' ? (
            <div className="flex flex-wrap gap-4">
              <Link
                href="/actions/new"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-5 text-lg font-black text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
              >
                <span className="text-2xl">🔥</span> {t("btn_action")}
              </Link>
              <Link
                href="/signalement"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-amber-500 px-8 py-5 text-lg font-black text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
              >
                <span className="text-2xl">⚡</span> {t("btn_signal")}
              </Link>
              <Link
                href="/profil/impact"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-white border-2 border-emerald-500 px-8 py-5 text-lg font-black text-emerald-600 shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
              >
                <span className="text-2xl">📊</span> {t("btn_impact")}
              </Link>
            </div>
          ) : role === 'admin' ? (
            <div className="flex flex-wrap gap-4">
              <Link
                href="/admin/validation"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-5 text-lg font-black text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
              >
                <span className="text-2xl">🔍</span> {t("btn_eval")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex gap-2">
          <RubriquePdfExportButton rubriqueTitle="Cockpit decisionnel" />
          <RubriqueExcelExportButton
            rubriqueTitle="Cockpit decisionnel"
            data={overview?.contracts.map(c => ({
              Date: c.dates.observedAt,
              Lieu: c.location.label,
              Masse_Kg: c.metadata.wasteKg || 0,
              Megots: c.metadata.cigaretteButts || 0,
              Benevoles: c.metadata.volunteersCount,
              Duree_Min: c.metadata.durationMinutes,
              Type: c.type,
              Source: c.source
            }))}
          />
          <Link
            href="/reports"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            📊 Ouvrir le reporting
          </Link>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bloc A
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {t("section1_title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("section1_desc")}
          </p>
        </div>

        <DashboardComparisonGrid overview={overview} />

        <BusinessAlertsPanel />
      </section>

      <FunnelConversionPanel />

      <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bloc B
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {t("section2_title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("section2_desc")}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-1">
          <ReportExportSmokeCard />
        </div>
      </section>

      {overview ? (
        <KpiMethodBlock
          methods={overview.methods.slice(0, 3)}
          title={t("section_method")}
        />
      ) : null}

      <RolePrimaryActions profile={profile} />
      <ClosedLoopPanel
        impactKpis={impactKpis}
        recommendedHref={adaptiveHref}
        recommendedLabel={adaptiveLabel}
        recommendedReason={adaptiveReason}
      />

      <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bloc D
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {t("section3_title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("section3_desc")}
          </p>
        </div>
        <ActionDeclarationForm
          actorNameOptions={actorNameOptions}
          defaultActorName={actorNameOptions[0]}
          clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
          clerkUserId={identity?.userId ?? fallbackActorName}
          initialMode="quick"
        />
      </section>
    </div>
  );
}
