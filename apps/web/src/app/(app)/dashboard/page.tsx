import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ReportExportSmokeCard } from "@/components/dashboard/report-export-smoke-card";
import { SystemStatusPanel } from "@/components/dashboard/system-status-panel";

export default async function DashboardPage() {
  const { userId } = await auth();

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espace applicatif</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Tableau de bord bénévole</h1>
        <p className="mt-2 text-sm text-slate-600">
          Session active avec Clerk. Cette zone pilote la migration des workflows Streamlit vers une architecture Next.js.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Identité</h2>
          <p className="mt-2 text-sm text-slate-600">
            Utilisateur connecté: <span className="font-mono">{userId}</span>
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Déclaration</h2>
          <p className="mt-2 text-sm text-slate-600">Formulaire Next.js branché sur l&apos;API `/api/actions`.</p>
          <Link href="/actions/new" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Ouvrir la déclaration
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Suivi</h2>
          <p className="mt-2 text-sm text-slate-600">
            Historique filtrable et lecture cartographique des actions géolocalisées.
          </p>
          <Link href="/actions/history" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Ouvrir l&apos;historique
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Reporting</h2>
          <p className="mt-2 text-sm text-slate-600">Exports CSV et parcours reporting disponibles sur le module dédié.</p>
          <Link href="/reports" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Ouvrir le reporting
          </Link>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ReportExportSmokeCard />
        <SystemStatusPanel />
      </section>
    </div>
  );
}
