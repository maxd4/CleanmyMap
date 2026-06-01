"use client";

import type { ActionStatus } from"@/lib/actions/types";
import type { AdminWorkflowController } from"./types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type StepFilterProps = {
  workflow: AdminWorkflowController;
};

export function StepFilter({ workflow }: StepFilterProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const scopeItems =
  workflow.scopeKind ==="account"
  ? workflow.scopeOptions.accounts
  : workflow.scopeKind ==="association"
  ? workflow.scopeOptions.associations
  : workflow.scopeOptions.arrondissements;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
    {fr ? "Étape 1 - Filtrer" : "Step 1 - Filter"}
    </p>
    <div className="mt-3 grid gap-3 md:grid-cols-5">
    <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
    {fr ? "Statut" : "Status"}
    <select
      value={workflow.status}
      onChange={(event) =>
        workflow.setStatus(event.target.value as ActionStatus |"all")
      }
      className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
    >
      <option value="all">{fr ? "Tous" : "All"}</option>
      <option value="pending">{fr ? "En attente de validation" : "Awaiting validation"}</option>
      <option value="approved">{fr ? "Approuvée" : "Approved"}</option>
      <option value="rejected">{fr ? "Refusée" : "Rejected"}</option>
    </select>
    </label>
    <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
    {fr ? "Fenêtre temporelle" : "Time window"}
 <select
 value={String(workflow.days)}
 onChange={(event) => workflow.setDays(Number(event.target.value))}
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
<option value="30">{fr ? "30 jours" : "30 days"}</option>
  <option value="90">{fr ? "90 jours" : "90 days"}</option>
  <option value="180">{fr ? "180 jours" : "180 days"}</option>
  <option value="365">{fr ? "365 jours" : "365 days"}</option>
  </select>
  </label>
  <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
  {fr ? "Volume max" : "Max volume"}
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
<label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
  {fr ? "Périmètre" : "Scope"}
  <select
    value={workflow.scopeKind}
    onChange={(event) =>
      workflow.setScopeKind(
        event.target.value as typeof workflow.scopeKind,
      )
    }
    className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
  >
    <option value="global">{fr ? "Global" : "Global"}</option>
    <option value="account">{fr ? "Compte" : "Account"}</option>
    <option value="association">{fr ? "Association" : "Association"}</option>
    <option value="arrondissement">{fr ? "Arrondissement" : "Arrondissement"}</option>
  </select>
  </label>
  <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
  {fr ? "Valeur" : "Value"}
 <select
 value={workflow.scopeValue}
 onChange={(event) => workflow.setScopeValue(event.target.value)}
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
{workflow.scopeKind ==="global" ? (
  <option value="">{fr ? "Aucun filtre" : "No filter"}</option>
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
