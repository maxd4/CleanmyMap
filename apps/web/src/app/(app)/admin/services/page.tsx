import { auth } from "@clerk/nextjs/server";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { SystemStatusPanel } from "@/components/dashboard/system-status-panel";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getServerLocale } from "@/lib/server-preferences";

export default async function AdminServicesPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Supervision des services"
        description="Accès réservé aux administrateurs connectés."
        lockedPreview={
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Supervision des services</h2>
            <p className="mt-3 text-sm text-slate-600">
              Connectez-vous avec un compte admin pour afficher l'état des intégrations et des services.
            </p>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const role = await getCurrentUserRoleLabel();
  const locale = await getServerLocale();

  if (role !== "admin") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Accès admin requis
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-amber-900">
          Supervision des services réservée aux admins
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Vous devez disposer du rôle <span className="font-semibold">admin</span> pour voir cette page.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Supervision des intégrations
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Tableau de bord des services
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Visualisez l'état des intégrations critiques, optionnelles et externes de
              CleanMyMap. Les données sont mises à jour en temps réel via l'API
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-medium text-slate-700">
                /api/services
              </code>.
            </p>
          </div>
        </div>
      </section>

      <SystemStatusPanel />
    </div>
  );
}
