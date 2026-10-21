"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";

export type HistorySharingRow = {
  id: string;
  report: string;
  period: string;
  perimeter: string;
  detail: string;
  generatedAt: string;
};

export type HistorySharingPreview = {
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

export type HistorySharingItem = {
  id: string;
  theme: ReportPdfTheme;
  rendererVersion: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export function formatHistorySharingDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date)
    : value;
}

function expiryLabel(seconds: number): string {
  if (seconds === 60 * 60) return "1 heure";
  if (seconds === 24 * 60 * 60) return "24 heures";
  if (seconds === 7 * 24 * 60 * 60) return "7 jours";
  return "30 jours";
}

type HistorySharingMessage = { tone: "error" | "success" | "info"; text: string };

export function ReportsWebDocumentHistorySharingPanel({
  row,
  theme,
  loading,
  preview,
  shares,
  expiryOptions,
  expiresInSeconds,
  shareUrl,
  message,
  onClose,
  onExpiryChange,
  onCreateShare,
  onCopyShareUrl,
  onRevokeShare,
}: {
  row: HistorySharingRow;
  theme: ReportPdfTheme;
  loading: boolean;
  preview: HistorySharingPreview | null;
  shares: HistorySharingItem[];
  expiryOptions: number[];
  expiresInSeconds: number;
  shareUrl: string | null;
  message: HistorySharingMessage | null;
  onClose: () => void;
  onExpiryChange: (value: number) => void;
  onCreateShare: () => void;
  onCopyShareUrl: () => void;
  onRevokeShare: (shareId: string) => void;
}) {
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4" role="dialog" aria-label={`Partager ${row.report}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">Prévisualisation du partage</h4>
          <p className="mt-1 text-sm text-slate-600">Le lien sera révocable et expirera automatiquement.</p>
        </div>
        <CmmButton onClick={onClose} tone="tertiary" variant="ghost" size="sm">Fermer</CmmButton>
      </div>

      {message ? <CmmFeedback tone={message.tone}>{message.text}</CmmFeedback> : null}
      {loading && !preview ? <p className="text-sm text-slate-600">Vérification de la variante PDF…</p> : null}
      {preview ? (
        <>
          <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div><dt className="text-slate-500">Rapport</dt><dd className="font-medium">{preview.title}</dd></div>
            <div><dt className="text-slate-500">Généré le</dt><dd className="font-medium">{formatHistorySharingDate(preview.generatedAt)}</dd></div>
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
                  onChange={(event) => onExpiryChange(Number(event.target.value))}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                >
                  {(expiryOptions.length > 0 ? expiryOptions : [60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60, 30 * 24 * 60 * 60]).map((seconds) => (
                    <option key={seconds} value={seconds}>{expiryLabel(seconds)}</option>
                  ))}
                </select>
              </label>
              <CmmButton disabled={loading} onClick={onCreateShare} tone="primary" size="md">Créer le lien</CmmButton>
            </div>
          )}

          {shareUrl ? (
            <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <label className="block text-sm font-medium text-slate-800" htmlFor={`report-share-url-${row.id}`}>Lien créé — copiez-le maintenant</label>
              <div className="flex gap-2">
                <input id={`report-share-url-${row.id}`} readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                <CmmButton onClick={onCopyShareUrl} tone="tertiary" variant="ghost" size="md">Copier</CmmButton>
              </div>
            </div>
          ) : null}

          {shares.length > 0 ? (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-slate-800">Liens de cette variante</h5>
              {shares.map((share) => (
                <div key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="text-slate-700">Expire le {formatHistorySharingDate(share.expiresAt)} · {share.revokedAt ? "révoqué" : "actif"}</span>
                  {!share.revokedAt ? <CmmButton disabled={loading} onClick={() => onRevokeShare(share.id)} tone="tertiary" variant="ghost" size="sm">Révoquer</CmmButton> : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
