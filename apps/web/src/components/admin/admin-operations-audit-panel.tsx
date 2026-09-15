"use client";

import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { AdminPanelShell } from "./admin-panel-shell";

export function AdminOperationsAuditPanel({
  entries,
}: {
  entries: AdminOperationAuditEntry[];
}) {
  return (
    <AdminPanelShell
      title="Journal administrateurs"
      subtitle="Lecture seule des opérations administratives et de leurs cibles."
      variant="warm"
    >
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-600">
            Aucune opération administrative enregistrée.
          </p>
        ) : (
          entries.map((entry) => {
            const operation =
              typeof entry.details.operation === "string"
                ? entry.details.operation
                : entry.operationType;
            return (
              <article
                key={entry.operationId}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{operation}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      {entry.actorLabel ?? entry.actorUserId}
                      {entry.targetId ? ` · cible ${entry.targetId}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      entry.outcome === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {entry.outcome === "success" ? "Succès" : "Erreur"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {new Date(entry.at).toLocaleString("fr-FR")}
                </p>
              </article>
            );
          })
        )}
      </div>
    </AdminPanelShell>
  );
}
