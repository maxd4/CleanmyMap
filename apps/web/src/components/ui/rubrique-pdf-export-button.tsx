"use client";

import React from "react";
import { FileText } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { type PdfReportData, type PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import { cn } from "@/lib/utils";
import { usePdfExport } from "./pdf-export/use-pdf-export";
import { PdfExportHistory } from "./pdf-export/pdf-export-history";

type RubriquePdfExportButtonProps = {
  rubrique: string;
  periode: string;
  organizationType: string;
  defaultTitle: string;
  data?: PdfReportData | null;
  disabled?: boolean;
  onGenerate?: (payload: PdfReportPayload) => void | Promise<void>;
  className?: string;
};

export function RubriquePdfExportButton({
  rubrique,
  periode,
  organizationType,
  defaultTitle,
  data,
  disabled,
  onGenerate,
  className,
}: RubriquePdfExportButtonProps) {
  const {
    state,
    message,
    customTitle,
    setCustomTitle,
    organizationName,
    setOrganizationName,
    history,
    filename,
    copy,
    hasData,
    isDisabled,
    exportRubriquePdf,
  } = usePdfExport({
    rubrique,
    periode,
    organizationType,
    defaultTitle,
    data,
    disabled,
    onGenerate,
  });

  return (
    <div data-print-ignore="true" className={cn("flex w-full flex-col gap-3", className)}>
      <section className="w-full rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)]/95 p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
              <FileText size={15} aria-hidden="true" className="text-emerald-600" />
              Export PDF
            </p>
            <h3 className="mt-1 cmm-text-small font-semibold cmm-text-primary">
              {defaultTitle}
            </h3>
            <p className="mt-1 truncate cmm-text-caption cmm-text-secondary">
              {filename}
            </p>
          </div>
          <CmmButton
            type="button"
            tone="primary"
            size="sm"
            disabled={isDisabled}
            onClick={() => void exportRubriquePdf()}
            ariaLabel={`Exporter le rapport PDF ${defaultTitle}`}
            className="shrink-0"
          >
            {state === "pending" ? copy.pendingLabel : copy.triggerLabel}
          </CmmButton>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 cmm-text-caption font-semibold cmm-text-secondary">
            Organisation
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder={organizationType}
              className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-canvas)] px-3 py-2 cmm-text-caption cmm-text-primary outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400/30"
            />
          </label>
          <label className="flex flex-col gap-1 cmm-text-caption font-semibold cmm-text-secondary">
            Titre optionnel
            <input
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder="Ex. Bilan mensuel"
              className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-canvas)] px-3 py-2 cmm-text-caption cmm-text-primary outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400/30"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption cmm-text-secondary">
          <span className="rounded-full border border-[color:var(--border-default)] px-2 py-1">
            {rubrique}
          </span>
          <span className="rounded-full border border-[color:var(--border-default)] px-2 py-1">
            {periode}
          </span>
          {!hasData ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
              Données insuffisantes
            </span>
          ) : null}
        </div>

        {message ? (
          <p
            role={state === "error" ? "alert" : "status"}
            className={`mt-3 rounded-xl border px-3 py-2 cmm-text-caption font-semibold ${
              state === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
          </p>
        ) : null}
      </section>

      <PdfExportHistory history={history} />
    </div>
  );
}
