import type { AdminWorkflowController } from"./types";

type StepJournalProps = {
 workflow: AdminWorkflowController;
};

export function StepJournal({ workflow }: StepJournalProps) {
 return (
 <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Etape 4 - Journaliser
 </p>
 <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
 {workflow.moderationJournal.length === 0 ? (
 <p className="cmm-text-caption cmm-text-muted">
 Aucune action de moderation sur cette session.
 </p>
 ) : (
 <ul className="space-y-2">
 {workflow.moderationJournal.map((entry, index) => (
 <li
 key={`${entry.at}-${entry.id}-${index}`}
 className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 cmm-text-caption cmm-text-secondary"
 >
 <span className="font-mono">
 {new Date(entry.at).toLocaleString("fr-FR")}
 </span>{""}
 <span
 className={`font-semibold ${entry.outcome ==="success" ?"text-emerald-700" :"text-rose-700"}`}
 >
 {entry.outcome ==="success" ?"OK" :"ERREUR"}
 </span>{""}
 {entry.entityType}#{entry.id} -&gt; {entry.targetStatus}
 {entry.sourceTable ? ` (table: ${entry.sourceTable})` :""}
 {typeof entry.copiedToLocalValidatedStore ==="boolean"
 ? entry.copiedToLocalValidatedStore
 ?" [copie local validated: oui]"
 :" [copie local validated: non]"
 :""}
 <div className="cmm-text-muted">{entry.message}</div>
 </li>
 ))}
 </ul>
 )}
 </div>
 <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Journal persistant (audit)
 </p>
 {workflow.auditLoading ? (
 <p className="mt-2 cmm-text-caption cmm-text-muted">Chargement...</p>
 ) : null}
 {workflow.auditError ? (
 <p className="mt-2 cmm-text-caption text-rose-700">Audit indisponible.</p>
 ) : null}
 {!workflow.auditLoading && !workflow.auditError ? (
 <ul className="mt-2 space-y-2">
 {workflow.auditItems.map((entry) => (
 <li
 key={`${entry.operationId}-${entry.at}`}
 className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 cmm-text-caption cmm-text-secondary"
 >
 <span className="font-mono">
 {new Date(entry.at).toLocaleString("fr-FR")}
 </span>{""}
 <span
 className={`font-semibold ${entry.outcome ==="success" ?"text-emerald-700" :"text-rose-700"}`}
 >
 {entry.outcome ==="success" ?"OK" :"ERREUR"}
 </span>{""}
 {entry.operationType}
 {entry.targetId ? ` #${entry.targetId}` :""}
 <div className="cmm-text-muted">Op: {entry.operationId}</div>
 </li>
 ))}
 {workflow.auditItems.length === 0 ? (
 <li className="cmm-text-caption cmm-text-muted">
 Aucune operation enregistree.
 </li>
 ) : null}
 </ul>
 ) : null}
 </div>
 </div>
 );
}
