import { CognitiveCueStrip } from "@/components/learn/cognitive-cue-strip";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { ReportsWindowComparisonsSection } from "@/components/reports/reports-window-comparisons-section";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { ReportsWebDocument } from "@/components/reports/reports-web-document";
import { ReportsKpiSummary } from "@/components/reports/reports-kpi-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { isAdminLikeProfile } from "@/lib/profiles";

export function ReportsPageV1Layout({
  locale,
  roleLabel,
  profile,
  primaryAction,
  reportsCue,
  summaryKpis,
  headerActions,
  overview,
  contracts,
  toReportsExportRow,
  publicAccessBanner,
}: any) {
  return (
    <div data-rubrique-report-root className="space-y-4">
      {publicAccessBanner}

      <CognitiveCueStrip
        locale={locale}
        rubricId="reports"
        question={reportsCue.question}
        clue={reportsCue.clue}
        chips={[
          locale === "fr" ? "À revoir" : "To review",
          locale === "fr" ? "Prochaine révision" : "Next review",
          locale === "fr" ? "Maîtrisées" : "Mastered",
          locale === "fr" ? "Reprendre demain" : "Resume tomorrow",
        ]}
        action={{ href: "/methodologie", label: reportsCue.actionLabel }}
      />

      <ThirtySecondsSummary
        kpis={summaryKpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label[locale],
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <DecisionPageHeader
        context={`Profil ${roleLabel}`}
        title="Rapports d'impact"
        objective="Arbitrer sur 30j/90j/12m avec comparatifs N vs N-1 et priorités auto justifiées."
        actions={headerActions}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
          Tracer
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <RubriqueExcelExportButton
            rubriqueTitle="Reporting et pilotage"
            data={contracts.map(toReportsExportRow)}
          />
        </div>
      </section>

      {overview ? (
        <ReportsWindowComparisonsSection
          comparisonsByWindow={overview.comparisonsByWindow}
        />
      ) : null}

      {overview ? <KpiMethodBlock methods={overview.methods} title="Méthode" /> : null}

      <ReportsWebDocument />

      <ReportsKpiSummary />

      {isAdminLikeProfile(profile) ? (
        <ActionsReportPanel />
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-amber-700">
            Admin requis
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-900">
            Exports et modération réservés aux admins
          </h2>
          <p className="mt-2 cmm-text-small text-amber-800">
            Tu vois la synthèse KPI, mais les exports CSV/JSON et la modération
            restent limités au rôle <span className="font-semibold">admin</span> ou <span className="font-semibold">max</span>.
          </p>
        </section>
      )}

      <RolePrimaryActions profile={profile} />
    </div>
  );
}
