import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ReportExportSmokeCard } from "@/components/dashboard/report-export-smoke-card";
import { SystemStatusPanel } from "@/components/dashboard/system-status-panel";
import { fetchActions } from "@/lib/actions/store";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function buildDateFloor(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

async function loadDashboardMetrics() {
  const supabase = getSupabaseServerClient();
  const items = await fetchActions(supabase, {
    limit: 400,
    status: "approved",
    floorDate: buildDateFloor(365),
  });

  const totalKg = items.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
  const totalButts = items.reduce((acc, item) => acc + Number(item.cigarette_butts || 0), 0);
  const totalVolunteers = items.reduce((acc, item) => acc + Number(item.volunteers_count || 0), 0);
  const totalMinutes = items.reduce((acc, item) => acc + Number(item.duration_minutes || 0), 0);
  const zones = new Set(items.map((item) => item.location_label.trim().toLowerCase())).size;

  return {
    count: items.length,
    totalKg,
    totalButts,
    totalVolunteers,
    totalHours: totalMinutes / 60,
    zones,
    source: "actions",
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const role = await getCurrentUserRoleLabel();
  const metrics = await loadDashboardMetrics().catch(() => null);

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espace applicatif</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Tableau de bord bénévole</h1>
        <p className="mt-2 text-sm text-slate-600">
          Session active avec Clerk. Cette zone centralise les workflows bénévoles web de CleanMyMap.
        </p>
        {metrics ? (
          <p className="mt-2 text-xs text-slate-500">
            Données consolidées depuis la source <code>{metrics.source}</code> (actions approuvées sur 12 mois glissants).
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-700">Métriques indisponibles temporairement, vérifier la connexion Supabase.</p>
        )}
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Identité</h2>
          <p className="mt-2 text-sm text-slate-600">
            Utilisateur connecté: <span className="font-mono">{userId}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Rôle: <span className="font-semibold text-emerald-700">{role === "admin" ? "Admin" : "Bénévole"}</span>
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Déchets retirés</h2>
          <p className="mt-2 text-sm text-slate-600">
            {metrics ? `${metrics.totalKg.toFixed(1)} kg et ${metrics.totalButts} mégots consolidés.` : "Données en chargement."}
          </p>
          <Link href="/actions/new" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Ouvrir la declaration
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Mobilisation</h2>
          <p className="mt-2 text-sm text-slate-600">
            {metrics
              ? `${metrics.totalVolunteers} participations, ${metrics.totalHours.toFixed(1)} heures bénévoles, ${metrics.zones} zones couvertes.`
              : "Historique filtrable et lecture cartographique des actions géolocalisées."}
          </p>
          <Link href="/actions/history" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Ouvrir l&apos;historique
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Reporting</h2>
          <p className="mt-2 text-sm text-slate-600">
            {metrics ? `${metrics.count} actions approuvées exploitables pour les exports et analyses.` : "Exports CSV et parcours reporting disponibles."}
          </p>
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
