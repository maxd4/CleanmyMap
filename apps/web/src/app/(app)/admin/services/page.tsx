import { AdminAccessState } from"@/components/ui/admin-access-state";
import { CodexUsagePanel } from"@/components/admin/codex-usage-panel";
import { EnvironmentalImpactCapturePanel } from"@/components/admin/environmental-impact-capture-panel";
import { FreePlanServicesPanel } from"@/components/admin/free-plan-services-panel";
import { StorageUsagePanel } from"@/components/dashboard/storage-usage-panel";
import { SystemStatusPanel } from"@/components/dashboard/system-status-panel";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { listGovernanceMonthlyReports } from"@/lib/governance/governance-monthly-report-store";
import { formatStorageBytes } from"@/lib/supabase/storage-usage";
import { resolvePageFamily } from "@/lib/ui/page-families";

export default async function AdminServicesPage() {
 const { userId } = await getSafeAuthSession();
 const pageFamily = resolvePageFamily("/admin/services");

 if (!userId) {
 return (
 <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
  <div className="mx-auto flex max-w-4xl items-center justify-center">
   <AdminAccessState className="w-full" />
  </div>
 </div>
 );
 }

 const role = await getCurrentUserRoleLabel();
 const governanceReports = await listGovernanceMonthlyReports(3).catch(() => []);
 const latestGovernanceReport = governanceReports[0] ?? null;

 if (role !=="admin") {
 return (
 <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
  <div className="mx-auto flex max-w-4xl items-center justify-center">
   <AdminAccessState className="w-full" />
  </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <PageHeader
  family={pageFamily}
  eyebrow="Supervision technique"
  title="Santé des services"
  subtitle="Visualisez l'état des intégrations critiques, optionnelles et externes de CleanMyMap, ainsi que la dérive du stockage Supabase et son historique mensuel."
  badges={
    <>
      <PageHeaderBadge family={pageFamily}>
        Services techniques
      </PageHeaderBadge>
      <PageHeaderBadge family={pageFamily} muted>
        Rapports et stockage
      </PageHeaderBadge>
    </>
  }
 />

 <div id="codex-usage">
 <CodexUsagePanel />
 </div>

 <div id="environmental-impact">
 <EnvironmentalImpactCapturePanel />
 </div>

 <div id="free-plans">
 <FreePlanServicesPanel />
 </div>

 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Supervision des intégrations
 </p>
 <h2 className="mt-2 text-3xl font-bold cmm-text-primary">
 Santé des services
 </h2>
 <p className="mt-3 max-w-2xl cmm-text-small leading-6 cmm-text-secondary">
 Visualisez l&apos;état des intégrations critiques, optionnelles et externes de
 CleanMyMap, ainsi que la dérive du stockage Supabase et son historique mensuel.
 Les données sont mises à jour en temps réel via l&apos;API
 <code className="rounded bg-slate-100 px-1 py-0.5 cmm-text-caption font-medium cmm-text-secondary">
  /api/services
 </code>.
 </p>
 </div>
 </div>
 </section>

 <div id="storage">
 <StorageUsagePanel />
 </div>

 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" id="governance-report">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Rapport mensuel de gouvernance interne
 </p>
 <h2 className="mt-2 text-2xl font-bold cmm-text-primary">
 {latestGovernanceReport
 ? `Archive ${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(latestGovernanceReport.reportMonth))}`
 : "Aucun rapport archivé"}
 </h2>
 <p className="mt-3 max-w-2xl cmm-text-small leading-6 cmm-text-secondary">
 Le PDF mensuel centralise l&apos;impact environnemental, la dérive des plans gratuits et le stockage Supabase pour la gouvernance interne. La vue publique reprend seulement une synthèse lisible; les détails techniques restent ici.
 </p>
 </div>

 {latestGovernanceReport ? (
 <a
 href={`/api/reports/governance-monthly?month=${latestGovernanceReport.reportMonth}`}
 target="_blank"
 className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
 >
 Télécharger le PDF
 </a>
 ) : null}
 </div>

 {latestGovernanceReport ? (
 <div className="mt-6 space-y-4">
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Impact mensuel
 </p>
 <p className="mt-2 text-2xl font-bold cmm-text-primary">
 {latestGovernanceReport.payload.impact.monthlyKgCo2eProxy?.toFixed(2) ?? "—"} kg
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Confiance {latestGovernanceReport.payload.impact.confidencePercent?.toFixed(0) ?? "—"}%
 </p>
 </div>

 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Stockage total
 </p>
 <p className="mt-2 text-2xl font-bold cmm-text-primary">
 {latestGovernanceReport.payload.storage.totalLabel}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Sur {latestGovernanceReport.payload.storage.quotaLabel}
 </p>
 </div>

 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Catégorie dominante
 </p>
 <p className="mt-2 text-2xl font-bold cmm-text-primary">
 {latestGovernanceReport.payload.storage.topContributionLabel ?? "n/a"}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {formatStorageBytes(latestGovernanceReport.payload.storage.topContributionBytes)}
 </p>
 </div>

 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Alertes actives
 </p>
 <p className="mt-2 text-2xl font-bold cmm-text-primary">
 {latestGovernanceReport.payload.storage.businessContributions.alerts.length}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {latestGovernanceReport.payload.storage.fastestGrowingLabel ?? "Pas de dérive critique"}
 </p>
 </div>
 </div>

 <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
 <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Lecture interne
 </p>
 <ul className="mt-3 space-y-2 cmm-text-small leading-6 cmm-text-secondary">
 {latestGovernanceReport.payload.summary.slice(0, 4).map((line) => (
 <li key={line}>• {line}</li>
 ))}
 </ul>
 <p className="mt-4 cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Détails métiers
 </p>
 <ul className="mt-3 space-y-2">
 {latestGovernanceReport.payload.storage.businessContributions.items.slice(0, 3).map((item) => (
 <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="text-sm font-semibold cmm-text-primary">{item.label}</p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {formatStorageBytes(item.currentBytes)} · {item.currentCount} fichier{item.currentCount > 1 ? "s" : ""} · {item.currentSharePercent.toFixed(1)}% du total
 </p>
 </div>
 <p className="text-right text-sm font-semibold cmm-text-primary">
 {item.deltaBytes > 0 ? "+" : ""}
 {formatStorageBytes(item.deltaBytes)}
 </p>
 </div>
 </li>
 ))}
 </ul>
 </section>

 <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Notes de gouvernance
 </p>
 <ul className="mt-3 space-y-2 cmm-text-small leading-6 cmm-text-secondary">
 {latestGovernanceReport.payload.notes.map((note) => (
 <li key={note}>• {note}</li>
 ))}
 </ul>
 <p className="mt-4 cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Référence archivistique
 </p>
 <p className="mt-2 cmm-text-small leading-6 cmm-text-secondary">
 {latestGovernanceReport.payload.storage.businessContributions.historyMonths.length} mois consolidés, {latestGovernanceReport.payload.storage.businessContributions.alerts.length} alerte{latestGovernanceReport.payload.storage.businessContributions.alerts.length > 1 ? "s" : ""} active{latestGovernanceReport.payload.storage.businessContributions.alerts.length > 1 ? "s" : ""}.
 </p>
 </section>
 </div>
 </div>
 ) : null}

 {governanceReports.length > 0 ? (
 <div className="mt-5 grid gap-3 md:grid-cols-4">
 {governanceReports.slice(0, 4).map((report) => (
 <a
 key={report.reportMonth}
 href={`/api/reports/governance-monthly?month=${report.reportMonth}`}
 target="_blank"
 className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
 >
 <p className="text-sm font-semibold cmm-text-primary">
 {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(report.reportMonth))}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(report.generatedAt))}
 </p>
 </a>
 ))}
 </div>
 ) : null}
 </section>

 <SystemStatusPanel />
 </div>
 );
}
