import { auth } from "@clerk/nextjs/server";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { KpiComparisonCard } from "@/components/pilotage/kpi-comparison-card";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { OperationalPrioritiesPanel } from "@/components/pilotage/operational-priorities-panel";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { ReportsKpiSummary } from "@/components/reports/reports-kpi-summary";
import { ReportsWebDocument } from "@/components/reports/reports-web-document";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  getProfileLabel,
  toProfile,
} from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function loadReportsOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 90,
    limit: 2200,
  });
}

function signed(value: number, suffix = ""): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

function reliabilityTone(level: "elevee" | "moyenne" | "faible"): string {
  if (level === "elevee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (level === "moyenne") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export default async function ReportsPage() {
  const { userId } = await auth();
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel = getProfileLabel(profile, "fr");
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const overview = await loadReportsOverview().catch(() => null);

  if (!userId) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-900">
          Acces restreint
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Connecte-toi pour acceder au module de reporting.
        </p>
      </section>
    );
  }

  const summaryKpis = overview
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

  if (pageTemplateV2Enabled) {
    return (
      <PageReadingTemplate
        context={`Profil ${roleLabel}`}
        title="Reports multi-horizon et exports"
        objective="Concentrer les comparatifs 30j/90j/12m, la méthode KPI et les livrables exportables, sans recopier le cockpit."
        summary={
          <ThirtySecondsSummary
            kpis={summaryKpis}
            alert={overview ? overview.summary.alert : undefined}
            recommendedAction={{
              href:
                overview?.summary.recommendedAction.href ?? primaryAction.href,
              label:
                overview?.summary.recommendedAction.label ??
                primaryAction.label.fr,
            }}
            recommendedReason={overview?.summary.recommendedAction.reason}
          />
        }
        primaryAction={{
          href: primaryAction.href,
          label: primaryAction.label.fr,
        }}
        secondaryAction={
          secondaryAction
            ? { href: secondaryAction.href, label: secondaryAction.label.fr }
            : undefined
        }
        analysis={
          <>
            {overview ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">
                  Comparatifs N vs N-1 par fenetre
                </h2>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {(["30", "90", "365"] as const).map((windowKey) => {
                    const windowResult =
                      overview.comparisonsByWindow[windowKey];
                    return (
                      <article
                        key={windowKey}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {windowKey === "365"
                              ? "12 mois"
                              : `${windowKey} jours`}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${reliabilityTone(windowResult.current.reliability.level)}`}
                          >
                            Fiabilite {windowResult.current.reliability.level}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {windowResult.current.reliability.reason} | completude{" "}
                          {windowResult.current.reliability.completeness.toFixed(
                            1,
                          )}
                          , geoloc{" "}
                          {windowResult.current.reliability.geoloc.toFixed(1)},
                          fraicheur{" "}
                          {windowResult.current.reliability.freshness.toFixed(
                            1,
                          )}
                          .
                        </p>
                        <div className="mt-2 grid gap-2">
                          <KpiComparisonCard
                            label="Actions"
                            value={`${windowResult.current.approvedActions}`}
                            previousValue={`${windowResult.previous.approvedActions}`}
                            deltaAbsolute={signed(
                              windowResult.metrics.approvedActions
                                .deltaAbsolute,
                            )}
                            deltaPercent={signed(
                              windowResult.metrics.approvedActions.deltaPercent,
                              "%",
                            )}
                            interpretation={
                              windowResult.metrics.approvedActions
                                .interpretation
                            }
                          />
                          <KpiComparisonCard
                            label="Volume"
                            value={`${windowResult.current.impactVolumeKg.toFixed(1)} kg`}
                            previousValue={`${windowResult.previous.impactVolumeKg.toFixed(1)} kg`}
                            deltaAbsolute={signed(
                              windowResult.metrics.impactVolumeKg.deltaAbsolute,
                              " kg",
                            )}
                            deltaPercent={signed(
                              windowResult.metrics.impactVolumeKg.deltaPercent,
                              "%",
                            )}
                            interpretation={
                              windowResult.metrics.impactVolumeKg.interpretation
                            }
                          />
                          <KpiComparisonCard
                            label="Couverture"
                            value={`${windowResult.current.coverageRate.toFixed(1)}%`}
                            previousValue={`${windowResult.previous.coverageRate.toFixed(1)}%`}
                            deltaAbsolute={signed(
                              windowResult.metrics.coverageRate.deltaAbsolute,
                              " pt",
                            )}
                            deltaPercent={signed(
                              windowResult.metrics.coverageRate.deltaPercent,
                              "%",
                            )}
                            interpretation={
                              windowResult.metrics.coverageRate.interpretation
                            }
                          />
                          <KpiComparisonCard
                            label="Mobilisation"
                            value={`${windowResult.current.mobilizationCount}`}
                            previousValue={`${windowResult.previous.mobilizationCount}`}
                            deltaAbsolute={signed(
                              windowResult.metrics.mobilizationCount
                                .deltaAbsolute,
                            )}
                            deltaPercent={signed(
                              windowResult.metrics.mobilizationCount
                                .deltaPercent,
                              "%",
                            )}
                            interpretation={
                              windowResult.metrics.mobilizationCount
                                .interpretation
                            }
                          />
                          <KpiComparisonCard
                            label="Qualite data"
                            value={`${windowResult.current.qualityScore.toFixed(1)}/100`}
                            previousValue={`${windowResult.previous.qualityScore.toFixed(1)}/100`}
                            deltaAbsolute={signed(
                              windowResult.metrics.qualityScore.deltaAbsolute,
                            )}
                            deltaPercent={signed(
                              windowResult.metrics.qualityScore.deltaPercent,
                              "%",
                            )}
                            interpretation={
                              windowResult.metrics.qualityScore.interpretation
                            }
                          />
                          <KpiComparisonCard
                            label="Delai moderation"
                            value={`${windowResult.current.moderationDelayDays.toFixed(1)} j`}
                            previousValue={`${windowResult.previous.moderationDelayDays.toFixed(1)} j`}
                            deltaAbsolute={signed(
                              windowResult.metrics.moderationDelayDays
                                .deltaAbsolute,
                              " j",
                            )}
                            deltaPercent={signed(
                              windowResult.metrics.moderationDelayDays
                                .deltaPercent,
                              "%",
                            )}
                            interpretation={
                              windowResult.metrics.moderationDelayDays
                                .interpretation
                            }
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-sm text-amber-800">
                  Données de comparaison temporairement indisponibles. Vérifier
                  la source pilotage.
                </p>
              </section>
            )}

            {overview ? (
              <OperationalPrioritiesPanel priorities={overview.priorities} />
            ) : null}
            {overview ? (
              <KpiMethodBlock methods={overview.methods} title="Methode" />
            ) : null}
            <ReportsWebDocument />
            <ReportsKpiSummary />

            {role === "admin" ? (
              <ActionsReportPanel />
            ) : (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Admin requis
                </p>
                <h2 className="mt-2 text-xl font-semibold text-amber-900">
                  Exports et moderation reserves aux admins
                </h2>
                <p className="mt-2 text-sm text-amber-800">
                  Tu vois la synthese KPI, mais les exports CSV/JSON et la
                  moderation restent limites au role{" "}
                  <span className="font-semibold">admin</span>.
                </p>
              </section>
            )}
          </>
        }
        trace={
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Horodatage:{" "}
              {overview
                ? new Date(overview.generatedAt).toLocaleString("fr-FR")
                : "indisponible"}{" "}
              | Fiabilite:{" "}
              {overview
                ? "badge par fenetre 30/90/365 jours"
                : "faible (donnees absentes)"}
            </p>
            <p>
              Sources: module pilotage overview, actions normalisees,
              agrégations reporting.
            </p>
            <p>
              Methode: comparatifs N vs N-1, priorisation automatique et limites
              documentées par KPI.
            </p>
            <p>Perimetre: espace Reports (exports + synthese multi-horizon).</p>
            <div className="pt-1">
              <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <ThirtySecondsSummary
        kpis={summaryKpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label.fr,
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <DecisionPageHeader
        context="Profil decideur"
        title="Reporting, methode KPI et priorites operationnelles"
        objective="Arbitrer sur 30j/90j/12m avec comparatifs N vs N-1 et priorites auto justifiees."
        actions={[
          { href: "/profil", label: "Retour cockpit" },
          { href: "/sections/elus", label: "Vue collectivites" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tracer
        </p>
        <div className="mt-2">
          <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
        </div>
      </section>

      {overview ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Comparatifs N vs N-1 par fenetre
          </h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {(["30", "90", "365"] as const).map((windowKey) => {
              const windowResult = overview.comparisonsByWindow[windowKey];
              return (
                <article
                  key={windowKey}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {windowKey === "365" ? "12 mois" : `${windowKey} jours`}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${reliabilityTone(windowResult.current.reliability.level)}`}
                    >
                      Fiabilite {windowResult.current.reliability.level}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {windowResult.current.reliability.reason} | completude{" "}
                    {windowResult.current.reliability.completeness.toFixed(1)},
                    geoloc {windowResult.current.reliability.geoloc.toFixed(1)},
                    fraicheur{" "}
                    {windowResult.current.reliability.freshness.toFixed(1)}.
                  </p>
                  <div className="mt-2 grid gap-2">
                    <KpiComparisonCard
                      label="Actions"
                      value={`${windowResult.current.approvedActions}`}
                      previousValue={`${windowResult.previous.approvedActions}`}
                      deltaAbsolute={signed(
                        windowResult.metrics.approvedActions.deltaAbsolute,
                      )}
                      deltaPercent={signed(
                        windowResult.metrics.approvedActions.deltaPercent,
                        "%",
                      )}
                      interpretation={
                        windowResult.metrics.approvedActions.interpretation
                      }
                    />
                    <KpiComparisonCard
                      label="Volume"
                      value={`${windowResult.current.impactVolumeKg.toFixed(1)} kg`}
                      previousValue={`${windowResult.previous.impactVolumeKg.toFixed(1)} kg`}
                      deltaAbsolute={signed(
                        windowResult.metrics.impactVolumeKg.deltaAbsolute,
                        " kg",
                      )}
                      deltaPercent={signed(
                        windowResult.metrics.impactVolumeKg.deltaPercent,
                        "%",
                      )}
                      interpretation={
                        windowResult.metrics.impactVolumeKg.interpretation
                      }
                    />
                    <KpiComparisonCard
                      label="Couverture"
                      value={`${windowResult.current.coverageRate.toFixed(1)}%`}
                      previousValue={`${windowResult.previous.coverageRate.toFixed(1)}%`}
                      deltaAbsolute={signed(
                        windowResult.metrics.coverageRate.deltaAbsolute,
                        " pt",
                      )}
                      deltaPercent={signed(
                        windowResult.metrics.coverageRate.deltaPercent,
                        "%",
                      )}
                      interpretation={
                        windowResult.metrics.coverageRate.interpretation
                      }
                    />
                    <KpiComparisonCard
                      label="Mobilisation"
                      value={`${windowResult.current.mobilizationCount}`}
                      previousValue={`${windowResult.previous.mobilizationCount}`}
                      deltaAbsolute={signed(
                        windowResult.metrics.mobilizationCount.deltaAbsolute,
                      )}
                      deltaPercent={signed(
                        windowResult.metrics.mobilizationCount.deltaPercent,
                        "%",
                      )}
                      interpretation={
                        windowResult.metrics.mobilizationCount.interpretation
                      }
                    />
                    <KpiComparisonCard
                      label="Qualite data"
                      value={`${windowResult.current.qualityScore.toFixed(1)}/100`}
                      previousValue={`${windowResult.previous.qualityScore.toFixed(1)}/100`}
                      deltaAbsolute={signed(
                        windowResult.metrics.qualityScore.deltaAbsolute,
                      )}
                      deltaPercent={signed(
                        windowResult.metrics.qualityScore.deltaPercent,
                        "%",
                      )}
                      interpretation={
                        windowResult.metrics.qualityScore.interpretation
                      }
                    />
                    <KpiComparisonCard
                      label="Delai moderation"
                      value={`${windowResult.current.moderationDelayDays.toFixed(1)} j`}
                      previousValue={`${windowResult.previous.moderationDelayDays.toFixed(1)} j`}
                      deltaAbsolute={signed(
                        windowResult.metrics.moderationDelayDays.deltaAbsolute,
                        " j",
                      )}
                      deltaPercent={signed(
                        windowResult.metrics.moderationDelayDays.deltaPercent,
                        "%",
                      )}
                      interpretation={
                        windowResult.metrics.moderationDelayDays.interpretation
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {overview ? (
        <OperationalPrioritiesPanel priorities={overview.priorities} />
      ) : null}

      {overview ? (
        <KpiMethodBlock methods={overview.methods} title="Methode" />
      ) : null}

      <ReportsWebDocument />

      <ReportsKpiSummary />

      {role === "admin" ? (
        <ActionsReportPanel />
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Admin requis
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-900">
            Exports et moderation reserves aux admins
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Tu vois la synthese KPI, mais les exports CSV/JSON et la moderation
            restent limites au role <span className="font-semibold">admin</span>
            .
          </p>
        </section>
      )}

      <RolePrimaryActions profile={profile} />
    </div>
  );
}
