"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmPopover } from "@/components/ui/cmm-popover";
import type { ReportGenerationRequest } from "@/lib/reports/report-generation-request";

type ExportState = "idle" | "pending" | "success" | "error";

export type AiMarkdownExportConfirmationProps = {
  request: ReportGenerationRequest;
  triggerLabel: string;
  fallbackFilename: string;
  disabled?: boolean;
  tone?: "primary" | "secondary";
  className?: string;
};

function getDownloadFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition");
  const filename = disposition?.match(/filename="([a-zA-Z0-9._-]+)"/i)?.[1];
  return filename ?? fallback;
}

async function downloadMarkdown(request: ReportGenerationRequest, fallbackFilename: string): Promise<void> {
  const response = await fetch("/api/reports/ai-export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(response.status === 413
      ? "Le fichier dépasse la taille maximale et n’a pas été tronqué."
      : response.status === 429
        ? "Trop de demandes. Réessayez dans un instant."
        : "L’export Markdown n’a pas pu être généré. Vérifiez les données et réessayez.");
  }
  const markdown = await response.blob();
  const url = URL.createObjectURL(markdown);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDownloadFilename(response, fallbackFilename);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function AiMarkdownExportConfirmation({
  request,
  triggerLabel,
  fallbackFilename,
  disabled = false,
  tone = "secondary",
  className,
}: AiMarkdownExportConfirmationProps) {
  const popoverId = `ai-export-${request.input.type}-${request.input.type === "single_action" ? request.input.actionId : request.input.scope.kind}`;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ExportState>("idle");
  const [error, setError] = useState<string | null>(null);

  function onOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) {
      setState("idle");
      setError(null);
    }
  }

  async function confirmDownload(): Promise<void> {
    setState("pending");
    setError(null);
    try {
      await downloadMarkdown(request, fallbackFilename);
      setState("success");
    } catch (caught) {
      setError(caught instanceof TypeError
        ? "Erreur réseau : l’export n’a pas pu être téléchargé. Vérifiez votre connexion puis réessayez."
        : caught instanceof Error
          ? caught.message
          : "Erreur réseau : l’export n’a pas pu être téléchargé.");
      setState("error");
    }
  }

  function cancel(): void {
    setOpen(false);
    setState("idle");
    setError(null);
  }

  return (
    <CmmPopover
      id={popoverId}
      ariaLabel="Confirmation de téléchargement pour export IA"
      ariaLabelledBy={`${popoverId}-title`}
      open={open}
      onOpenChange={onOpenChange}
      panelAlignment="start"
      wrapperClassName="max-w-full"
      panelClassName="w-[min(28rem,calc(100vw-1rem))] rounded-2xl border border-slate-300 bg-white p-4 text-slate-950 shadow-xl sm:p-5"
      renderTrigger={(triggerProps) => (
        <CmmButton asChild tone={tone} variant="pill" className={className} disabled={disabled}>
          <button {...triggerProps}>{triggerLabel}</button>
        </CmmButton>
      )}
    >
      <section className="space-y-3">
        <h3 id={`${popoverId}-title`} className="text-base font-semibold">Confirmer l’export IA</h3>
        <p className="cmm-text-body cmm-text-primary">
          Le fichier Markdown sera téléchargé sur cet appareil. CleanMyMap ne l’envoie pas à un service IA; si vous le transmettez ensuite à un service externe, celui-ci recevra les données du fichier selon ses propres conditions.
        </p>
        {state === "pending" ? <p className="text-sm" role="status" aria-live="polite">Préparation du téléchargement…</p> : null}
        {state === "success" ? <p className="text-sm text-green-800" role="status" aria-live="polite">Téléchargement confirmé.</p> : null}
        {error ? <p className="text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <CmmButton onClick={cancel} disabled={state === "pending"} tone="secondary" variant="pill" className="min-h-11">
            Annuler
          </CmmButton>
          <CmmButton onClick={() => void confirmDownload()} disabled={state === "pending" || state === "success"} loading={state === "pending"} tone="primary" variant="pill" className="min-h-11">
            Confirmer le téléchargement
          </CmmButton>
        </div>
      </section>
    </CmmPopover>
  );
}
