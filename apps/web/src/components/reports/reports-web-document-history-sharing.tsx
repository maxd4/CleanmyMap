"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";
import {
  ReportsWebDocumentHistorySharingPanel,
  type HistorySharingItem,
  type HistorySharingPreview,
  type HistorySharingRow,
} from "./reports-web-document-history-sharing-panel";

type ShareResponse = {
  preview: HistorySharingPreview;
  shares: HistorySharingItem[];
  expiryOptions: number[];
};

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return new Error(typeof body?.error === "string" ? body.error : fallback);
}

export function ReportsWebDocumentHistorySharing({
  row,
  theme,
}: {
  row: HistorySharingRow;
  theme: ReportPdfTheme;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<HistorySharingPreview | null>(null);
  const [shares, setShares] = useState<HistorySharingItem[]>([]);
  const [expiryOptions, setExpiryOptions] = useState<number[]>([]);
  const [expiresInSeconds, setExpiresInSeconds] = useState(24 * 60 * 60);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);

  async function loadPreview(): Promise<void> {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/reports/generations/${encodeURIComponent(row.id)}/share?theme=${theme}`,
        { method: "GET", cache: "no-store" },
      );
      if (!response.ok) throw await readError(response, "Le partage du PDF est indisponible.");
      const body = await response.json() as ShareResponse;
      setPreview(body.preview);
      setShares(body.shares.filter((share) => share.theme === theme));
      setExpiryOptions(body.expiryOptions);
      if (!body.expiryOptions.includes(expiresInSeconds)) {
        setExpiresInSeconds(body.expiryOptions[0] ?? 24 * 60 * 60);
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Le partage du PDF est indisponible." });
    } finally {
      setLoading(false);
    }
  }

  function openPanel(): void {
    setOpen(true);
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadPreview();
  }

  async function createShare(): Promise<void> {
    setLoading(true);
    setMessage(null);
    setShareUrl(null);
    try {
      const response = await fetch(`/api/reports/generations/${encodeURIComponent(row.id)}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, expiresInSeconds }),
      });
      if (!response.ok) throw await readError(response, "Le lien de partage n'a pas pu être créé.");
      const body = await response.json() as { share: HistorySharingItem; shareUrl: string; auditWarning?: boolean };
      setShares((current) => [body.share, ...current]);
      setShareUrl(body.shareUrl);
      setMessage({
        tone: body.auditWarning ? "info" : "success",
        text: body.auditWarning
          ? "Le lien est créé et utilisable, mais sa trace d'audit doit être régularisée."
          : "Lien créé. Copiez-le maintenant : il ne sera pas réaffiché ensuite.",
      });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Le lien de partage n'a pas pu être créé." });
    } finally {
      setLoading(false);
    }
  }

  async function revokeShare(shareId: string): Promise<void> {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/reports/generations/${encodeURIComponent(row.id)}/share/${encodeURIComponent(shareId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw await readError(response, "Le lien n'a pas pu être révoqué.");
      setShares((current) => current.map((share) => share.id === shareId ? { ...share, revokedAt: new Date().toISOString() } : share));
      setMessage({ tone: "success", text: "Lien révoqué. Tout nouvel accès avec ce lien est refusé." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Le lien n'a pas pu être révoqué." });
    } finally {
      setLoading(false);
    }
  }

  async function copyShareUrl(): Promise<void> {
    if (!shareUrl || !navigator.clipboard?.writeText) {
      setMessage({ tone: "error", text: "La copie automatique n'est pas disponible. Sélectionnez le lien manuellement." });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setMessage({ tone: "success", text: "Lien copié dans le presse-papiers." });
  }

  return (
    <div className="mt-2">
      <CmmButton disabled={loading} onClick={openPanel} tone="tertiary" variant="ghost" size="md" className="min-h-11">
        Créer un lien de partage
      </CmmButton>
      {open ? (
        <ReportsWebDocumentHistorySharingPanel
          row={row}
          theme={theme}
          loading={loading}
          preview={preview}
          shares={shares}
          expiryOptions={expiryOptions}
          expiresInSeconds={expiresInSeconds}
          shareUrl={shareUrl}
          message={message}
          onClose={() => setOpen(false)}
          onExpiryChange={setExpiresInSeconds}
          onCreateShare={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ createShare(); }}
          onCopyShareUrl={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ copyShareUrl(); }}
          onRevokeShare={(shareId) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ revokeShare(shareId); }}
        />
      ) : null}
    </div>
  );
}
