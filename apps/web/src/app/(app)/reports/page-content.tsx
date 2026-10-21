import { DeferredReportsWebDocument } from "@/components/reports/deferred-reports-web-document";
import { ReportsAnalysisDashboard } from "@/components/reports/reports-analysis-dashboard";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { CTAGroup, SectionHeader } from "@/components/ui/page-structure";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  buildReportsSummaryKpis,
  type ReportsPublicSummary,
} from "@/lib/reports/page-data";
import type { Locale } from "@/lib/ui/preferences";
import type { ProfileAction } from "@/lib/profiles";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { ReportModel } from "@/lib/reports/report-model/types";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportGenerationResumeConfig } from "@/lib/reports/report-generation-resume";
import type {
  ReportsResumeStatus,
  SingleActionReportPageContext,
  SingleActionReportPageError,
} from "./page-generation-context";
import type { ReportsAnalysisData, ReportsGenerationData } from "./page-loaders";

type ReportsAnalysisContentParams = {
  locale: Locale;
  roleLabel: string;
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: ReturnType<typeof buildReportsSummaryKpis>;
  overview: Pick<PilotageOverview, "methods" | "periodDays"> | null;
  report: ReportModel;
  monthlyData: ReportsAnalysisData["monthlyData"];
  dailyExportAvailability: ReportExportAvailability;
};

export function buildReportsAnalysisContent({
  locale,
  roleLabel,
  primaryAction,
  secondaryAction,
  summaryKpis,
  overview,
  report,
  monthlyData,
  dailyExportAvailability,
}: ReportsAnalysisContentParams) {
  return (
    <div className="space-y-6">
      <ReportsAnalysisDashboard
        locale={locale}
        roleLabel={roleLabel}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        summaryKpis={summaryKpis}
        methods={overview?.methods ?? []}
        report={report}
        periodDays={overview?.periodDays ?? 90}
        monthlyData={monthlyData}
      />

      <section id="exports">
        <CmmCard as="div" tone="red" variant="glass" className="space-y-4">
          <SectionHeader
            eyebrow="Exports"
            title="Livrables"
            subtitle="Les exports sont regroupés plus bas pour alléger l&apos;ouverture."
            titleSize="sm"
            eyebrowClassName="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted"
            subtitleClassName="cmm-text-small cmm-text-secondary mt-1"
          />
          <CTAGroup>
            <RubriqueExcelExportButton
              rubriqueTitle="Rapport d'impact"
              serverEndpoint="/api/reports/exports.csv"
              initialDailyExportAvailability={dailyExportAvailability}
            />
          </CTAGroup>
        </CmmCard>
      </section>
    </div>
  );
}

export function buildReportsPublicSummaryContent(
  publicSummary: ReportsPublicSummary | null,
  showDetailedCta = false,
) {
  const detailedCta = showDetailedCta ? (
    <CmmButton
      href="?tab=analysis&detail=1"
      prefetch={false}
      tone="primary"
      variant="pill"
      className="mt-2"
    >
      Afficher les analyses détaillées
    </CmmButton>
  ) : null;

  return publicSummary ? (
    <CmmCard
      as="section"
      tone="red"
      variant="glass"
      className="space-y-4"
      data-testid="reports-public-summary"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
          Synthèse publique
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          L&apos;impact visible des actions CleanMyMap
        </h2>
        <p className="cmm-text-body mt-2">
          Consultez les indicateurs publics. Un compte est demandé uniquement pour générer un
          export détaillé ou retrouver votre historique.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Actions visibles", publicSummary.visibleActions],
          ["Lieux couverts", publicSummary.distinctLocations],
          ["Déchets récoltés", `${publicSummary.wasteKg} kg`],
          ["Bénévoles mobilisés", publicSummary.volunteers],
        ].map(([label, value]) => (
          <CmmCard key={String(label)} tone="red" variant="muted" size="sm">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          </CmmCard>
        ))}
      </div>
      {detailedCta}
    </CmmCard>
  ) : (
    <section role="alert">
      <CmmCard as="div" tone="amber" variant="muted" className="space-y-4 text-amber-900">
        La synthèse publique est temporairement indisponible.
        {detailedCta}
      </CmmCard>
    </section>
  );
}

export function buildReportsGenerationContent({
  generationData,
  dailyExportAvailability,
  singleAction,
  singleActionError,
  resumeConfig,
  resumeStatus,
}: {
  generationData: ReportsGenerationData | null;
  dailyExportAvailability: ReportExportAvailability;
  singleAction?: Pick<SingleActionReportPageContext, "actionId" | "scopeLabel" | "contract"> | null;
  singleActionError?: SingleActionReportPageError | null;
  resumeConfig?: ReportGenerationResumeConfig | null;
  resumeStatus?: ReportsResumeStatus | null;
}) {
  if (singleActionError) {
    const targetUnavailable = singleActionError === "not_admissible";
    return (
      <section role="alert" data-testid="single-action-report-unavailable">
        <CmmCard as="div" tone="amber" variant="muted" className="space-y-4 text-amber-900">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
            {targetUnavailable ? "Action non admissible" : "Résolution indisponible"}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {targetUnavailable
              ? "Ce rapport mono-action n'est pas disponible"
              : "Le rapport mono-action n'a pas pu être chargé"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            {targetUnavailable
              ? "L'action doit être terminée, approuvée et publiquement visible. Aucun quota n'a été consommé."
              : "La résolution serveur est temporairement indisponible. Réessayez sans changer l'identifiant de l'action. Aucun quota n'a été consommé."}
          </p>
          <CmmButton
            href="/actions/history"
            tone="secondary"
            variant="pill"
            className="mt-4 min-h-11 border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            Revenir à l&apos;historique
          </CmmButton>
        </CmmCard>
      </section>
    );
  }

  return generationData ? (
    <DeferredReportsWebDocument
      contracts={generationData.contracts}
      isTruncated={generationData.isTruncated}
      sourceHealth={generationData.sourceHealth}
      communityEvents={generationData.communityEvents}
      communityEventsAvailability={generationData.communityEventsAvailability}
      actionMediaReadyCountByActionId={generationData.actionMediaReadyCountByActionId}
      actionMediaAvailability={generationData.actionMediaAvailability}
      dailyExportAvailability={dailyExportAvailability}
      resumeConfig={resumeConfig ?? undefined}
      resumeStatus={resumeStatus ?? undefined}
      singleAction={singleAction ?? undefined}
    />
  ) : (
    <CmmCard as="section" tone="red" variant="glass" className="space-y-4">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
        Génération indisponible
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        Le document détaillé n&apos;a pas pu être chargé
      </h2>
      <p className="cmm-text-body mt-2">
        Réessayez dans un instant. Le chargement serveur des contrats a échoué.
      </p>
    </CmmCard>
  );
}

export function buildReportsAnalysisUnavailableContent() {
  return (
    <section role="alert">
      <CmmCard as="div" tone="amber" variant="muted" className="space-y-4 text-amber-900">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
          Analyse temporairement indisponible
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          Les indicateurs n&apos;ont pas pu être chargés
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Réessayez dans un instant. Aucun zéro n&apos;est affiché tant que les données Analyse ne
          sont pas disponibles.
        </p>
      </CmmCard>
    </section>
  );
}

export function buildAnonymousGenerationContent(clerkReachable: boolean) {
  return (
    <ClerkRequiredGate
      isAuthenticated={false}
      authUnavailable={!clerkReachable}
      mode="blur"
      stateHeadingLevel="h2"
      lockedPreview={
        <CmmCard as="section" tone="slate" variant="muted">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-700">
            Compte requis pour générer
          </p>
          <p className="cmm-text-body mt-3">
            La synthèse est publique. Connectez-vous uniquement pour préparer un export détaillé ou
            consulter votre historique.
          </p>
        </CmmCard>
      }
    >
      <div />
    </ClerkRequiredGate>
  );
}
