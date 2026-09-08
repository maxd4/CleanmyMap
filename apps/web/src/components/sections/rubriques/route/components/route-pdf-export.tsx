"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { openPrintableHtmlWindow } from "@/lib/pdf-export/browser-report";
import type {
  RouteMultiRouteDisplayMode,
  RouteResponse,
} from "../route-types";
import { buildRoutePdfHtml } from "../route-pdf-export";

export function RoutePdfExport({
  data,
  displayMode,
  onUsePatterns,
}: {
  data: RouteResponse;
  displayMode: RouteMultiRouteDisplayMode;
  onUsePatterns: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const hasMultipleRoutes = data.groupRoutes.length > 1;

  function handleExport() {
    setStatus("idle");
    const html = buildRoutePdfHtml(data, displayMode);
    setStatus(openPrintableHtmlWindow(html) ? "success" : "error");
  }

  return (
    <section
      data-print-ignore="true"
      className="rounded-[1.75rem] border border-sky-300/20 bg-sky-500/10 p-5"
      aria-label="Imprimer ou exporter l’itinéraire"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-sky-100/80">
            <FileDown size={15} aria-hidden="true" />
            Export terrain
          </p>
          <h3 className="mt-2 text-base font-black text-white">Imprimer / exporter en PDF</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sky-50/80">
            Ouvre la fiche terrain prête à imprimer ou à enregistrer en PDF.
          </p>
          <p className="mt-1 text-[11px] font-semibold text-sky-50/70">
            A4 paysage · échelle 100 % · arrière-plans activés pour la couleur
          </p>
        </div>
        <CmmButton
          type="button"
          tone="primary"
          size="sm"
          onClick={handleExport}
          ariaLabel="Imprimer ou exporter l’itinéraire en PDF"
        >
          Imprimer / exporter en PDF
        </CmmButton>
      </div>

      {hasMultipleRoutes && displayMode === "colors" ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-50"
        >
          <span>
            Vous prévoyez une impression en noir et blanc ? Choisissez « Formes différentes » pour distinguer facilement les itinéraires.
          </span>
          <button
            type="button"
            onClick={onUsePatterns}
            className="rounded-xl border border-amber-200/40 px-3 py-2 font-bold text-amber-50 transition hover:bg-amber-200/10"
          >
            Utiliser des formes différentes
          </button>
        </div>
      ) : null}

      {status === "success" ? (
        <p role="status" className="mt-3 text-xs font-semibold text-emerald-100">
          Aperçu PDF ouvert. Vérifiez la pagination puis choisissez l’impression ou « Enregistrer en PDF ».
        </p>
      ) : status === "error" ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-amber-100">
          La fenêtre d’impression a été bloquée. Autorisez les fenêtres contextuelles puis relancez l’export.
        </p>
      ) : null}
    </section>
  );
}
