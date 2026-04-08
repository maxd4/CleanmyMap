import { auth } from "@clerk/nextjs/server";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { ReportsKpiSummary } from "@/components/reports/reports-kpi-summary";
import { getCurrentUserRoleLabel } from "@/lib/authz";

export default async function ReportsPage() {
  const { userId } = await auth();
  const role = await getCurrentUserRoleLabel();

  if (!userId) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-900">Accès restreint</h1>
        <p className="mt-2 text-sm text-amber-800">Connecte-toi pour acceder au module de reporting.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rubrique finalisee</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Reporting et synthese PDF/exports</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cette page centralise les indicateurs de rapport scientifique et les exports operationnels de la plateforme.
        </p>
      </section>

      <ReportsKpiSummary />

      {role === "admin" ? (
        <ActionsReportPanel />
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Admin requis</p>
          <h2 className="mt-2 text-xl font-semibold text-amber-900">Exports et moderation reserves aux admins</h2>
          <p className="mt-2 text-sm text-amber-800">
            Tu vois la synthese KPI, mais les exports CSV/JSON et la moderation restent limites au role <span className="font-semibold">admin</span>.
          </p>
        </section>
      )}
    </div>
  );
}
