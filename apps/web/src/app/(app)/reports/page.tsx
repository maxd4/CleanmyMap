import { ActionsReportPanel } from "@/components/reports/actions-report-panel";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Parcours prioritaire</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Reporting & exports</h1>
        <p className="mt-2 text-sm text-slate-600">
          Migration du chemin critique de reporting avec un export CSV natif côté Next.js.
        </p>
      </section>

      <ActionsReportPanel />
    </div>
  );
}
