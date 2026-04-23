import type { ActionStatus } from "@/lib/actions/types";
import type { AdminWorkflowController } from "./types";

type StepFilterProps = {
  workflow: AdminWorkflowController;
};

export function StepFilter({ workflow }: StepFilterProps) {
  const scopeItems =
    workflow.scopeKind === "account"
      ? workflow.scopeOptions.accounts
      : workflow.scopeKind === "association"
        ? workflow.scopeOptions.associations
        : workflow.scopeOptions.arrondissements;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Etape 1 - Filtrer
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-5">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Statut
          <select
            value={workflow.status}
            onChange={(event) =>
              workflow.setStatus(event.target.value as ActionStatus | "all")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Fenetre temporelle
          <select
            value={String(workflow.days)}
            onChange={(event) => workflow.setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="180">180 jours</option>
            <option value="365">365 jours</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Volume max
          <select
            value={String(workflow.limit)}
            onChange={(event) => workflow.setLimit(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Périmètre
          <select
            value={workflow.scopeKind}
            onChange={(event) =>
              workflow.setScopeKind(
                event.target.value as typeof workflow.scopeKind,
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="global">Global</option>
            <option value="account">Compte</option>
            <option value="association">Association</option>
            <option value="arrondissement">Arrondissement</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Valeur
          <select
            value={workflow.scopeValue}
            onChange={(event) => workflow.setScopeValue(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            {workflow.scopeKind === "global" ? (
              <option value="">Aucun filtre</option>
            ) : (
              scopeItems.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </label>
      </div>
    </div>
  );
}
