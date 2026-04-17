"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildDeliverableBaseName,
  normalizeDeliverableRubrique,
} from "@/lib/reports/deliverable-name";

type RubriquePdfExportButtonProps = {
  rubriqueTitle: string;
  targetSelector?: string;
};

type ExportHistoryEntry = {
  id: string;
  rubrique: string;
  filename: string;
  generatedAt: string;
};

const STORAGE_KEY = "cleanmymap.rubrique_export_history.v1";
const MAX_HISTORY = 12;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function collectHeadStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
}

function readHistoryFromStorage(): ExportHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ExportHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && typeof item === "object")
      .filter(
        (item) =>
          typeof item.id === "string" &&
          typeof item.rubrique === "string" &&
          typeof item.filename === "string" &&
          typeof item.generatedAt === "string",
      )
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function writeHistoryToStorage(entries: ExportHistoryEntry[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY)),
    );
  } catch {
    // ignore storage errors
  }
}

export function RubriquePdfExportButton({
  rubriqueTitle,
  targetSelector = "[data-rubrique-report-root]",
}: RubriquePdfExportButtonProps) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [customRubrique, setCustomRubrique] = useState<string>("");
  const [history, setHistory] = useState<ExportHistoryEntry[]>(() =>
    readHistoryFromStorage(),
  );

  const rubriqueSlug = useMemo(
    () => normalizeDeliverableRubrique(customRubrique.trim() || rubriqueTitle),
    [customRubrique, rubriqueTitle],
  );
  const filename = useMemo(
    () => `${buildDeliverableBaseName({ rubrique: rubriqueSlug })}.pdf`,
    [rubriqueSlug],
  );

  useEffect(() => {
    writeHistoryToStorage(history);
  }, [history]);

  function exportRubriquePdf() {
    setState("pending");
    setMessage(null);

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setState("error");
      setMessage("Autorise les popups pour generer le PDF.");
      return;
    }

    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) {
      printWindow.close();
      setState("error");
      setMessage("Contenu de rubrique introuvable.");
      return;
    }

    const clonedTarget = target.cloneNode(true) as HTMLElement;
    clonedTarget
      .querySelectorAll('[data-print-ignore="true"]')
      .forEach((node) => node.remove());

    const safeTitle = escapeHtml(rubriqueTitle);
    const generatedAt = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
    const styles = collectHeadStyles();
    const fullFilename = filename.toLowerCase();

    const createdAtIso = new Date().toISOString();
    setHistory((previous) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          rubrique: rubriqueSlug,
          filename: fullFilename,
          generatedAt: createdAtIso,
        },
        ...previous,
      ].slice(0, MAX_HISTORY),
    );

    const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(fullFilename)}</title>
    ${styles}
    <style>
      @page { size: A4; margin: 14mm; }
      body { background: #ffffff; color: #0f172a; }
      .rubrique-print-header { margin-bottom: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
      .rubrique-print-header h1 { margin: 0; font-size: 20px; line-height: 1.2; }
      .rubrique-print-header p { margin: 4px 0 0; color: #475569; font-size: 12px; }
      [data-print-ignore="true"] { display: none !important; }
    </style>
  </head>
  <body>
    <header class="rubrique-print-header">
      <h1>${safeTitle}</h1>
      <p>Generation: ${escapeHtml(generatedAt)} | Rubrique: ${escapeHtml(rubriqueSlug)} | Fichier suggere: ${escapeHtml(fullFilename)}</p>
    </header>
    ${clonedTarget.outerHTML}
    <script>
      window.addEventListener("afterprint", () => window.close());
      window.addEventListener("load", () => {
        setTimeout(() => window.print(), 180);
      });
    </script>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setState("idle");
  }

  return (
    <div data-print-ignore="true" className="flex flex-col items-end gap-1">
      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Generation 1 clic
        </p>
        <p className="mt-1 text-xs text-slate-700">
          Rubrique associee:{" "}
          <span className="font-semibold">{rubriqueSlug}</span>
        </p>
        <p className="mt-1 text-xs text-slate-700">
          Nom par defaut:{" "}
          <span className="font-mono">{filename.toLowerCase()}</span>
        </p>
        <label className="mt-2 block text-xs text-slate-600">
          Renommage optionnel (rubrique personnalisee)
          <input
            type="text"
            value={customRubrique}
            onChange={(event) => setCustomRubrique(event.target.value)}
            placeholder="ex: reports, audit, analytics"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-emerald-500"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={exportRubriquePdf}
        disabled={state === "pending"}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-200"
      >
        {state === "pending"
          ? "Preparation PDF..."
          : "Generer le livrable (1 clic)"}
      </button>
      {message ? <p className="text-xs text-rose-700">{message}</p> : null}
      {history.length > 0 ? (
        <div className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Historique livrables
          </p>
          <ul className="mt-2 space-y-1">
            {history.slice(0, 6).map((item) => (
              <li key={item.id} className="text-xs text-slate-700">
                <span className="font-mono">{item.filename}</span> - rubrique{" "}
                {item.rubrique} -{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(item.generatedAt))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
