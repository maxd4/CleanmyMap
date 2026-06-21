"use client";

import { useMemo } from "react";
import type { AdminWorkflowController } from "./types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type StepJournalProps = {
  workflow: AdminWorkflowController;
};

function formatEditedFields(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return value.filter((item): item is string => typeof item === "string").join(", ");
}

export function StepJournal({ workflow }: StepJournalProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const selectedAuditLabel = useMemo(() => {
    if (workflow.moderationEntityType === "action" && workflow.moderationId.trim().length > 0) {
      return fr
        ? `Historique pour ${workflow.moderationId.trim().slice(0, 8)}…`
        : `History for ${workflow.moderationId.trim().slice(0, 8)}…`;
    }

    return fr ? "Historique global" : "Global history";
  }, [fr, workflow.moderationEntityType, workflow.moderationId]);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
        {fr ? "Étape 4 - Journaliser" : "Step 4 - Log"}
      </p>

      <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
        <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
          {selectedAuditLabel}
        </p>
        {workflow.moderationJournal.length === 0 ? (
          <p className="mt-2 cmm-text-caption cmm-text-muted">
            {fr
              ? "Aucune action de modération n'a encore été enregistrée sur cette session."
              : "No moderation action has been recorded on this session yet."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {workflow.moderationJournal.map((entry, index) => (
              <li
                key={`${entry.at}-${entry.id}-${index}`}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 cmm-text-caption cmm-text-secondary"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono">
                    {new Date(entry.at).toLocaleString(fr ? "fr-FR" : "en-GB")}
                  </span>
                  <span
                    className={`font-semibold ${entry.outcome === "success" ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {entry.outcome === "success"
                      ? fr
                        ? "OK"
                        : "OK"
                      : fr
                        ? "ERREUR"
                        : "ERROR"}
                  </span>
                  <span>
                    {entry.entityType}#{entry.id} -&gt; {entry.targetStatus}
                  </span>
                </div>
                {entry.sourceTable ? (
                  <div className="cmm-text-muted">{entry.sourceTable}</div>
                ) : null}
                {typeof entry.copiedToLocalValidatedStore === "boolean" ? (
                  <div className="cmm-text-muted">
                    {fr ? "Copie locale validée" : "Local copy validated"}:{" "}
                    {entry.copiedToLocalValidatedStore
                      ? fr
                        ? "oui"
                        : "yes"
                      : fr
                        ? "non"
                        : "no"}
                  </div>
                ) : null}
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
          <p className="mt-2 cmm-text-caption cmm-text-muted">
            {fr ? "Chargement..." : "Loading..."}
          </p>
        ) : null}
        {workflow.auditError ? (
          <p className="mt-2 cmm-text-caption text-red-700">
            {fr ? "Audit indisponible." : "Audit unavailable."}
          </p>
        ) : null}
        {!workflow.auditLoading && !workflow.auditError ? (
          <ul className="mt-2 space-y-2">
            {workflow.auditItems.map((entry) => {
              const editedFields = formatEditedFields(entry.details.editedFields);

              return (
                <li
                  key={`${entry.operationId}-${entry.at}`}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 cmm-text-caption cmm-text-secondary"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono">
                      {new Date(entry.at).toLocaleString(fr ? "fr-FR" : "en-GB")}
                    </span>
                    <span
                      className={`font-semibold ${entry.outcome === "success" ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {entry.outcome === "success"
                        ? fr
                          ? "OK"
                          : "OK"
                        : fr
                          ? "ERREUR"
                          : "ERROR"}
                    </span>
                    <span>{entry.operationType}</span>
                    {entry.targetId ? <span>#{entry.targetId}</span> : null}
                  </div>
                  <div className="cmm-text-muted">
                    {fr ? "Admin" : "Admin"}: {entry.actorLabel ?? entry.actorUserId}
                  </div>
                  <div className="cmm-text-muted">Op: {entry.operationId}</div>
                  {editedFields ? (
                    <div className="cmm-text-muted">
                      {fr ? "Champs modifiés" : "Edited fields"}: {editedFields}
                    </div>
                  ) : null}
                </li>
              );
            })}
            {workflow.auditItems.length === 0 ? (
              <li className="cmm-text-caption cmm-text-muted">
                {fr
                  ? "Aucune opération d'audit n'est disponible pour le moment."
                  : "No audit operation is available at the moment."}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
