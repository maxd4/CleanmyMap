"use client";

import { useMemo } from "react";
import type { AdminOperationAuditEntry } from "@/lib/admin/operation-audit";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type OperationAuditTimelineProps = {
  title: string;
  scopeLabel: string;
  items: AdminOperationAuditEntry[];
  loading?: boolean;
  errorMessage?: string | null;
  emptyMessage: string;
};

function formatEditedFields(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const fields = value.filter((item): item is string => typeof item === "string");
  return fields.length > 0 ? fields.join(", ") : null;
}

export function OperationAuditTimeline({
  title,
  scopeLabel,
  items,
  loading = false,
  errorMessage = null,
  emptyMessage,
}: OperationAuditTimelineProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const normalizedItems = useMemo(() => items ?? [], [items]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
        {title}
      </p>
      <p className="mt-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
        {scopeLabel}
      </p>

      {loading ? (
        <p className="mt-2 cmm-text-caption cmm-text-muted">
          {fr ? "Chargement..." : "Loading..."}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {!loading && !errorMessage ? (
        <div className="mt-3">
          {normalizedItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-3 py-2 cmm-text-small cmm-text-secondary">
              {emptyMessage}
            </p>
          ) : (
            <ul className="space-y-2">
              {normalizedItems.map((entry) => {
                const editedFields = formatEditedFields(entry.details.editedFields);

                return (
                  <li
                    key={`${entry.operationId}-${entry.at}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 cmm-text-caption cmm-text-secondary"
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
                    <div className="mt-1 cmm-text-muted">
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
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
