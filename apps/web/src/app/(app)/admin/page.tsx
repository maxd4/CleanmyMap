import { auth } from "@clerk/nextjs/server";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { SystemStatusPanel } from "@/components/dashboard/system-status-panel";
import { getCurrentUserRoleLabel } from "@/lib/authz";

export default async function AdminPage() {
  const { userId } = await auth();
  const role = await getCurrentUserRoleLabel();

  if (!userId) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-900">Acces restreint</h1>
        <p className="mt-2 text-sm text-amber-800">Connecte-toi pour acceder a l&apos;administration.</p>
      </section>
    );
  }

  if (role !== "admin") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Admin requis</p>
        <h1 className="mt-2 text-2xl font-semibold text-amber-900">Administration reservee aux admins</h1>
        <p className="mt-2 text-sm text-amber-800">
          Demande l&apos;attribution du role <span className="font-semibold">admin</span> dans Clerk.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rubrique migree</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Administration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Moderation des donnees, supervision des integrations et operations critiques depuis l&apos;UI Next.js.
        </p>
      </section>
      <ActionsReportPanel />
      <SystemStatusPanel />
    </div>
  );
}
