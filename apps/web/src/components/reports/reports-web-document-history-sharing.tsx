"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";

type HistoryRow = {
  id: string;
  report: string;
  period: string;
  perimeter: string;
  detail: string;
  generatedAt: string;
};

type SharePreview = {
  generationId: string;
  title: string;
  filename: string;
  generatedAt: string;
  period: string;
  scope: string;
  detailLevel: string;
  theme: ReportPdfTheme;
  rendererVersion: string;
  artifactStatus: string;
  artifactReady: boolean;
  communicatedContent: string;
};

type ShareItem = {
  id: string;
  theme: ReportPdfTheme;
  rendererVersion: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

type ShareResponse = {
  preview: SharePreview;
  shares: ShareItem[];
  expiryOptions: number[];
};

function expiryLabel(seconds: number): string {
  if (seconds === 60 * 60) return "1 heure";
  if (seconds === 24 * 60 * 60) return "24 heures";
  if (seconds === 7 * 24 * 60 * 60) return "7 jours";
  return "30 jours";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date)
    : value;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return new Error(typeof body?.error === "string" ? body.error : fallback);
}

export function ReportsWebDocumentHistorySharing({
  row,
  theme,
}: {
  row: HistoryRow;
  theme: ReportPdfTheme;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [shares, setShares] = useState<ShareItem[]>([]);
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
    void loadPreview();
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
      const body = await response.json() as { share: ShareItem; shareUrl: string; auditWarning?: boolean };
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
      <CmmButton
        disabled={loading}
        onClick={openPanel}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Créer un lien de partage
      </CmmButton>

      {open ? (
        <div className="mt-3 space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4" role="dialog" aria-label={`Partager ${row.report}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-950">Prévisualisation du partage</h4>
              <p className="mt-1 text-sm text-slate-600">Le lien sera révocable et expirera automatiquement.</p>
            </div>
            <CmmButton onClick={() => setOpen(false)} tone="tertiary" variant="ghost" size="sm">Fermer</CmmButton>
          </div>

          {message ? <CmmFeedback tone={message.tone}>{message.text}</CmmFeedback> : null}

          {loading && !preview ? <p className="text-sm text-slate-600">Vérification de la variante PDF…</p> : null}
          {preview ? (
            <>
              <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div><dt className="text-slate-500">Rapport</dt><dd className="font-medium">{preview.title}</dd></div>
                <div><dt className="text-slate-500">Généré le</dt><dd className="font-medium">{formatDate(preview.generatedAt)}</dd></div>
                <div><dt className="text-slate-500">Période</dt><dd className="font-medium">{row.period}</dd></div>
                <div><dt className="text-slate-500">Périmètre</dt><dd className="font-medium">{row.perimeter}</dd></div>
                <div><dt className="text-slate-500">Variante</dt><dd className="font-medium">{theme === "scientific" ? "Scientifique" : "Impact"} · {preview.rendererVersion}</dd></div>
                <div><dt className="text-slate-500">Détail</dt><dd className="font-medium">{row.detail}</dd></div>
              </dl>
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{preview.communicatedContent}</p>

              {!preview.artifactReady ? (
                <CmmFeedback tone="warning">Le PDF de cette variante n&apos;est pas encore livré. Utilisez d&apos;abord « Télécharger PDF », puis revenez créer le lien.</CmmFeedback>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-slate-500">Expiration</span>
                    <select
                      value={expiresInSeconds}
                      onChange={(event) => setExpiresInSeconds(Number(event.target.value))}
                      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                    >
                      {(expiryOptions.length > 0 ? expiryOptions : [60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60, 30 * 24 * 60 * 60]).map((seconds) => (
                        <option key={seconds} value={seconds}>{expiryLabel(seconds)}</option>
                      ))}
                    </select>
                  </label>
                  <CmmButton disabled={loading} onClick={() => void createShare()} tone="primary" size="md">
                    Créer le lien
                  </CmmButton>
                </div>
              )}

              {shareUrl ? (
                <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <label className="block text-sm font-medium text-slate-800" htmlFor={`report-share-url-${row.id}`}>Lien créé — copiez-le maintenant</label>
                  <div className="flex gap-2">
                    <input id={`report-share-url-${row.id}`} readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                    <CmmButton onClick={() => void copyShareUrl()} tone="tertiary" variant="ghost" size="md">Copier</CmmButton>
                  </div>
                </div>
              ) : null}

              {shares.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-slate-800">Liens de cette variante</h5>
                  {shares.map((share) => (
                    <div key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <span className="text-slate-700">Expire le {formatDate(share.expiresAt)} · {share.revokedAt ? "révoqué" : "actif"}</span>
                      {!share.revokedAt ? <CmmButton disabled={loading} onClick={() => void revokeShare(share.id)} tone="tertiary" variant="ghost" size="sm">Révoquer</CmmButton> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
