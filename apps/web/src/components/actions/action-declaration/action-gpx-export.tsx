"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  ACTION_ROUTE_GPX_FILENAME,
  buildActionRouteGpxDocument,
  type ActionRouteGpxInput,
} from "@/lib/actions/exports/action-route-gpx";

export function downloadGpxDocument(xml: string, filename = ACTION_ROUTE_GPX_FILENAME): void {
  const blob = new Blob([xml], { type: "application/gpx+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ActionGpxExportButton({
  input,
}: {
  input: ActionRouteGpxInput;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  let xml: string | null = null;
  try {
    xml = buildActionRouteGpxDocument(input);
  } catch {
    // Invalid user-facing labels must not break the itinerary surface.
    xml = null;
  }
  if (!xml) return null;
  const exportXml = xml;

  const estimated = xml.includes("Tracé estimé CleanMyMap");
  const imported = xml.includes("Tracé GPX importé");

  function handleExport(): void {
    try {
      downloadGpxDocument(exportXml);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-sky-200/80 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-sky-950">
            <Download size={16} aria-hidden="true" />
            Exporter en GPX
          </p>
          <p className="mt-1 text-xs text-sky-800/70">
            La géométrie finale actuelle est exportée telle quelle, sans reconstruction.
          </p>
          {estimated ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              Le fichier indiquera que le tracé est estimé.
            </p>
          ) : null}
          {imported ? (
            <p className="mt-1 text-xs font-semibold text-violet-700">
              Le tracé GPX importé est exporté sans reroutage.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
        >
          <Download size={14} aria-hidden="true" />
          Exporter en GPX
        </button>
      </div>
      {status === "success" ? (
        <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">
          Fichier GPX téléchargé.
        </p>
      ) : status === "error" ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
          Le téléchargement GPX n’a pas pu être lancé.
        </p>
      ) : null}
    </div>
  );
}
