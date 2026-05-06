import { RolePrimaryActions } from"@/components/navigation/role-primary-actions";
import { KpiMethodBlock } from"@/components/pilotage/kpi-method-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Rapports d\'impact - CleanMyMap',
  description: 'Analysez les données de nettoyage participatif, téléchargez des rapports détaillés et visualisez l\'évolution de l\'impact environnemental.',
};

import { ThirtySecondsSummary } from"@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from"@/components/reports/actions-report-panel";
import { ReportsKpiSummary } from"@/components/reports/reports-kpi-summary";
import { ReportsWindowComparisonsSection } from"@/components/reports/reports-window-comparisons-section";
import { ReportsWebDocument } from"@/components/reports/reports-web-document";
import { DecisionPageHeader } from"@/components/ui/decision-page-header";
import { PageReadingTemplate } from"@/components/ui/page-reading-template";
import { RubriquePdfExportButton } from"@/components/ui/rubrique-pdf-export-button";
import { AnimatedImpactMetrics } from "@/components/reports/AnimatedImpactMetrics";
import { RadialProgressGauge } from "@/components/reports/RadialProgressGauge";
import { EcologicalTimeline } from "@/components/reports/EcologicalTimeline";
import { 
 BarChart3, 
 Layers, 
 Info, 
 DownloadCloud 
} from"lucide-react";
import { NavigationGrid, type NavigationGridItem } from"@/components/ui/navigation-grid";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { isFeatureEnabled } from"@/lib/feature-flags";
import { RubriqueExcelExportButton } from"@/components/ui/rubrique-excel-export-button";
import { getActionOperationalContext, type ActionDataContract } from"@/lib/actions/data-contract";
import { loadPilotageOverview } from"@/lib/pilotage/overview";
import {
 getProfilePrimaryAction,
 getProfileSecondaryAction,
 getProfileLabel,
 isAdminLikeProfile,
 toProfile,
} from"@/lib/profiles";
import { getServerLocale } from"@/lib/server-preferences";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { CognitiveCueStrip } from"@/components/learn/cognitive-cue-strip";

async function loadReportsData() {
 const supabase = getSupabaseServerClient();
 const overview = await loadPilotageOverview({
 supabase,
 periodDays: 90,
 limit: 2200,
 });

 const { fetchUnifiedActionContracts } = await import("@/lib/actions/unified-source");
 const { items: contracts } = await fetchUnifiedActionContracts(supabase, {
 limit: 1000,
 status:"approved",
 floorDate: null,
 requireCoordinates: false,
 types: null,
 });

 return { overview, contracts };
}

function toReportsExportRow(contract: ActionDataContract) {
 const operational = getActionOperationalContext(contract);
 return {
 Date: contract.dates.observedAt,
 Lieu: contract.location.label,
 Masse_Kg: contract.metadata.wasteKg || 0,
 Megots: contract.metadata.cigaretteButts || 0,
 Bénévoles: operational.volunteersCount,
 Durée_Min: operational.durationMinutes,
 Charge_Terrain_Min: operational.engagementMinutes,
 Type_Lieu: operational.placeTypeLabel,
 Trajet: operational.routeStyleLabel,
 Ajustement_Trajet: operational.routeAdjustmentMessage ??"",
 Type: contract.type,
 Source: contract.source,
 };
}

export default async function ReportsPage() {
  const [{ userId, clerkReachable }, locale] = await Promise.all([
    getSafeAuthSession(),
    getServerLocale(),
  ]);
  const role =
  userId && clerkReachable
  ? await getCurrentUserRoleLabel().catch(() =>"anonymous" as const)
  : ("anonymous" as const);
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel =
  userId ? getProfileLabel(profile, locale) : locale ==="fr" ?"Visiteur" :"Visitor";
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  
  const [data, utils, cockpitModule] = await Promise.all([
    loadReportsData().catch(() => null),
    import("@/lib/pilotage/analytics-data-utils"),
    import("@/components/reports/analytics-cockpit"),
  ]);
  const { aggregateMonthlyAnalytics } = utils;
  const { AnalyticsCockpit } = cockpitModule;
  const overview = data?.overview ?? null;
  const contracts = data?.contracts ?? [];
  const monthlyData = aggregateMonthlyAnalytics(contracts);
  const reportsCue =
   locale === "fr"
    ? {
        question: "Quel indicateur mérite une relecture avant l'export ?",
        clue:
          "Le rapport sert à réactiver la preuve utile et à garder visible la prochaine révision.",
        actionLabel: "Lire la méthode",
      }
    : {
        question: "Which indicator deserves a review before exporting?",
        clue:
          "The report is here to reactivate the useful proof and keep the next review visible.",
        actionLabel: "Read the method",
      };
 const publicAccessBanner = !userId ? (
 <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 cmm-text-small text-emerald-900 shadow-sm">
 Lecture publique: parcourez les rapports et exportez un livrable sans
 compte. La connexion sert aux vues personnalisées et à la modération.
 </section>
 ) : null;
 const headerActions = userId
 ? [
 { href:"/profil", label:"Cockpit" },
 { href:"/learn/hub", label:"Apprendre" },
 ]
 : [
 { href:"/learn/hub", label:"Apprendre" },
 { href:"/sign-in", label:"Se connecter" },
 ];

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
 label:"Impact terrain",
 value:"n/a",
 previousValue:"n/a",
 deltaAbsolute:"n/a",
 deltaPercent:"n/a",
 interpretation:"neutral",
 },
 {
 label:"Mobilisation",
 value:"n/a",
 previousValue:"n/a",
 deltaAbsolute:"n/a",
 deltaPercent:"n/a",
 interpretation:"neutral",
 },
 {
 label:"Qualité data",
 value:"n/a",
 previousValue:"n/a",
 deltaAbsolute:"n/a",
 deltaPercent:"n/a",
 interpretation:"neutral",
 },
 ] as const);

 const navigationItems: NavigationGridItem[] = [
 {
  icon: BarChart3,
  title:"Comparaisons",
  desc:"Comparer 30j / 90j / 12m.",
 iconBg:"bg-blue-500/20",
 iconColor:"text-blue-400",
 accent:"from-blue-600/20 to-blue-900/40",
 ring:"ring-blue-500/30",
 dot:"bg-blue-400",
 href:"#comparisons",
 },
 {
  icon: Info,
  title:"Méthode KPI",
  desc:"Lire la méthode et les sources.",
 iconBg:"bg-emerald-500/20",
 iconColor:"text-emerald-400",
 accent:"from-emerald-600/20 to-emerald-900/40",
 ring:"ring-emerald-500/30",
 dot:"bg-emerald-400",
 href:"#method",
 },
 {
  icon: Layers,
  title:"Vue mensuelle",
  desc:"Consulter les agrégats et les tendances.",
 iconBg:"bg-purple-500/20",
 iconColor:"text-purple-400",
 accent:"from-purple-600/20 to-purple-900/40",
 ring:"ring-purple-500/30",
 dot:"bg-purple-400",
 href:"#cockpit",
 },
 {
  icon: DownloadCloud,
  title:"Exports",
  desc:"Exporter PDF, Excel et synthèse.",
 iconBg:"bg-amber-500/20",
 iconColor:"text-amber-400",
 accent:"from-amber-600/20 to-amber-900/40",
 ring:"ring-amber-500/30",
 dot:"bg-amber-400",
 href:"#exports",
 },
 ];

 if (pageTemplateV2Enabled) {
 return (
 <div className="space-y-4">
 {publicAccessBanner}

 <PageReadingTemplate
 context={`Profil ${roleLabel}`}
 title="Rapports d'impact"
 objective="Comparer les fenêtres utiles, lire la méthode KPI et exporter les livrables."
 summary={
 <div className="space-y-10">
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

 <AnimatedImpactMetrics kpis={summaryKpis} />

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
   <RadialProgressGauge 
     value={78} 
     label="Réduction Déchets" 
     subLabel="Objectif Q2 2026"
     color="emerald"
   />
   <RadialProgressGauge 
     value={45} 
     label="Mobilisation" 
     subLabel="Nouveaux bénévoles"
     color="blue"
   />
   <RadialProgressGauge 
     value={92} 
     label="Qualité Data" 
     subLabel="Précision GPS"
     color="violet"
   />
   <RadialProgressGauge 
     value={65} 
     label="Impact CO2" 
     subLabel="Émissions évitées"
     color="amber"
   />
 </div>

 <NavigationGrid items={navigationItems} columns={{ default: 1, sm: 2, md: 4, xl: 4 }} />
 </div>
 }
 primaryAction={{
 href: primaryAction.href,
 label: primaryAction.label[locale],
 }}
 secondaryAction={
 secondaryAction
 ? {
 href: secondaryAction.href,
 label: secondaryAction.label[locale],
 }
 : undefined
 }
 analysis={
 <div className="space-y-16">
 <div id="comparisons">
 {overview ? (
 <ReportsWindowComparisonsSection
 comparisonsByWindow={overview.comparisonsByWindow}
 />
 ) : (
 <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
 <p className="cmm-text-small text-amber-800">
 Données de comparaison temporairement indisponibles.
 Vérifier la source pilotage.
 </p>
 </section>
 )}
 </div>

 <div className="space-y-10">
   <div className="text-center">
     <h3 className="text-3xl font-black cmm-text-primary mb-2">Historique d&apos;impact</h3>
     <p className="cmm-text-secondary font-medium italic">Les actions les plus significatives sur le terrain</p>
   </div>
   <EcologicalTimeline 
     actions={contracts.map(c => ({
       id: c.id,
       date: c.dates.observedAt,
       label: c.location.label,
       wasteKg: c.metadata.wasteKg || 0,
       volunteers: getActionOperationalContext(c).volunteersCount,
       type: c.type
     }))} 
   />
 </div>
 </div>
 }
 trace={
 <div className="space-y-2 cmm-text-caption cmm-text-secondary">
 <p>
 Horodatage:{""}
 {overview
 ? new Date(overview.generatedAt).toLocaleString("fr-FR")
 :"indisponible"}{""}
 | Fiabilite:{""}
 {overview
 ?"badge par fenêtre 30/90/365 jours"
 :"faible (données absentes)"}
 </p>
 <p>
 Sources: module pilotage overview, actions normalisées,
 agrégations reporting.
 </p>
 <p>
 Méthode: comparatifs N vs N-1, priorisation automatique et
 limites documentées par KPI.
 </p>
 <p>
 Périmètre: espace Rapports d&apos;impact (exports + synthèse
 multi-horizon).
 </p>
 <div className="flex gap-2 pt-2">
 <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
 <RubriqueExcelExportButton
 rubriqueTitle="Reporting et pilotage"
 data={contracts.map(toReportsExportRow)}
 />
 </div>
 </div>
 }
 />

 <div className="space-y-8">
 {overview ? (
 <section id="method" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Méthode KPI
 </p>
 <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
 Lire la méthode KPI
 </h2>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 L&apos;explication détaillée reste disponible plus bas.
 </p>
 </div>
 <KpiMethodBlock methods={overview.methods} title="Méthode" />
 </section>
 ) : null}

 <section id="cockpit" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Analyse mensuelle
 </p>
 <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
 Vue mensuelle
 </h2>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Les comparatifs, les agrégats et les exports restent plus bas.
 </p>
 </div>
 <AnalyticsCockpit data={monthlyData} />
 </section>

 <section id="document" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
 <ReportsWebDocument />
 </section>

 <section id="kpi-summary" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
 <ReportsKpiSummary />
 </section>

 <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
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
 Tu vois la synthèse KPI, mais les exports CSV/JSON et la
 modération restent limités au rôle{""}
 <span className="font-semibold">admin</span> ou <span className="font-semibold">max</span>.
 </p>
 </section>
 )}
 </section>

 <section id="exports" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Exports
 </p>
 <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
 Livrables
 </h2>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Les exports sont regroupés plus bas pour alléger l&apos;ouverture.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
 <RubriqueExcelExportButton
 rubriqueTitle="Reporting et pilotage"
 data={contracts.map(toReportsExportRow)}
 />
 </div>
 </section>
 </div>
 </div>
 );
 }

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
 <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
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
