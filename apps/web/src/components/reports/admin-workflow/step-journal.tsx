import type { AdminWorkflowController } from"./types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type StepJournalProps = {
  workflow: AdminWorkflowController;
};

export function StepJournal({ workflow }: StepJournalProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
    {fr ? "Étape 4 - Journaliser" : "Step 4 - Log"}
    </p>
    <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
{workflow.moderationJournal.length === 0 ? (
  <p className="cmm-text-caption cmm-text-muted">
  {fr ? "Aucune action de modération n'a encore été enregistrée sur cette session." : "No moderation action has been recorded on this session yet."}
  </p>
) : (
  <ul className="space-y-2">
  {workflow.moderationJournal.map((entry, index) => (
  <li
    key={`${entry.at}-${entry.id}-${index}`}
    className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 cmm-text-caption cmm-text-secondary"
  >
  <span className="font-mono">
  {new Date(entry.at).toLocaleString(fr ? "fr-FR" : "en-GB")}
  </span>{""}
  <span
    className={`font-semibold ${entry.outcome ==="success" ?"text-emerald-700" :"text-rose-700"}`}
  >
  {entry.outcome ==="success" ? (fr ? "OK" : "OK") : (fr ? "ERREUR" : "ERROR")}
  </span>{""}
  {entry.entityType}#{entry.id} -&gt; {entry.targetStatus}
  {entry.sourceTable ? ` (table: ${entry.sourceTable})` :""}
  {typeof entry.copiedToLocalValidatedStore ==="boolean"
  ? entry.copiedToLocalValidatedStore
  ? ` [${fr ? "copie locale validée" : "local copy validated"}: ${fr ? "oui" : "yes"}]`
  : ` [${fr ? "copie locale validée" : "local copy validated"}: ${fr ? "non" : "no"}]`
  :""}
  <div className="cmm-text-muted">{entry.message}</div>
  </li>
  ))}
  </ul>
  )}
  </div>
  <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
  <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
  {fr ? "Journal persistant (audit)" : "Persistent log (audit)"}
  </p>
{workflow.auditLoading ? (
  <p className="mt-2 cmm-text-caption cmm-text-muted">{fr ? "Chargement..." : "Loading..."}</p>
  ) : null}
  {workflow.auditError ? (
  <p className="mt-2 cmm-text-caption text-rose-700">{fr ? "Audit indisponible." : "Audit unavailable."}</p>
  ) : null}
  {!workflow.auditLoading && !workflow.auditError ? (
  <ul className="mt-2 space-y-2">
  {workflow.auditItems.map((entry) => (
  <li
    key={`${entry.operationId}-${entry.at}`}
    className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 cmm-text-caption cmm-text-secondary"
  >
  <span className="font-mono">
  {new Date(entry.at).toLocaleString(fr ? "fr-FR" : "en-GB")}
  </span>{""}
  <span
    className={`font-semibold ${entry.outcome ==="success" ?"text-emerald-700" :"text-rose-700"}`}
  >
  {entry.outcome ==="success" ? (fr ? "OK" : "OK") : (fr ? "ERREUR" : "ERROR")}
  </span>{""}
  {entry.operationType}
  {entry.targetId ? ` #${entry.targetId}` :""}
  <div className="cmm-text-muted">Op: {entry.operationId}</div>
  </li>
  ))}
{workflow.auditItems.length === 0 ? (
  <li className="cmm-text-caption cmm-text-muted">
  {fr ? "Aucune opération d'audit n'est disponible pour le moment." : "No audit operation is available at the moment."}
  </li>
) : null}
  </ul>
  ) : null}
 </div>
 </div>
 );
}
