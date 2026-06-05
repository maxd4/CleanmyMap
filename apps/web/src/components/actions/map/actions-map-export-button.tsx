"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FileSpreadsheet } from "lucide-react";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionsCsv, buildActionsCsvFilename } from "@/lib/reports/csv";
import type { MapViewportState } from "./map-export.types";
import {
  buildActionsMapGeoJsonFilename,
  buildActionsMapGeoJsonString,
  buildActionsMapPngFilename,
  downloadBlob,
  toActionsMapCsvRows,
} from "./actions-map-export.utils";

type ActionsMapExportContext = {
  zoneQuery?: string;
  visibleCount?: number;
  loadedCount?: number;
  freshnessLabel?: string | null;
  viewport?: MapViewportState | null;
};

type ActionsMapExportButtonProps = {
  items: ActionMapItem[];
  mapCaptureTargetRef?: RefObject<HTMLDivElement | null>;
  exportContext?: ActionsMapExportContext;
  className?: string;
};

type ExportActionId = "csv" | "png" | "geojson";

const EXPORT_ACTIONS: Array<{
  id: ExportActionId;
  label: string;
  description: string;
}> = [
  {
    id: "csv",
    label: "CSV",
    description: "Tableau des actions filtrées",
  },
  {
    id: "png",
    label: "PNG",
    description: "Capture de la vue carte",
  },
  {
    id: "geojson",
    label: "GeoJSON",
    description: "Géométrie et métadonnées",
  },
];

function triggerDownloadUrl(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function ActionsMapExportButton({
  items,
  mapCaptureTargetRef,
  exportContext,
  className,
}: ActionsMapExportButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportActionId | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const canExport = items.length > 0;
  const csvFilename = useMemo(() => buildActionsCsvFilename(), []);
  const geoJsonFilename = useMemo(() => buildActionsMapGeoJsonFilename(), []);
  const pngFilename = useMemo(() => buildActionsMapPngFilename(), []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuOpen) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleExport(format: ExportActionId) {
    if (!canExport || isExporting) {
      return;
    }

    setIsExporting(format);
    setMenuOpen(false);

    try {
      if (format === "csv") {
        const csv = buildActionsCsv(toActionsMapCsvRows(items));
        if (!csv.trim()) {
          throw new Error("Aucune ligne exportable");
        }

        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, csvFilename);
        return;
      }

      if (format === "geojson") {
        const geojson = buildActionsMapGeoJsonString(items, {
          zoneQuery: exportContext?.zoneQuery,
          visibleCount: exportContext?.visibleCount ?? items.length,
          loadedCount: exportContext?.loadedCount ?? items.length,
          freshnessLabel: exportContext?.freshnessLabel ?? null,
          viewport: exportContext?.viewport ?? null,
        });

        if (!geojson.trim()) {
          throw new Error("Aucune géométrie exportable");
        }

        const blob = new Blob([geojson], { type: "application/geo+json;charset=utf-8;" });
        downloadBlob(blob, geoJsonFilename);
        return;
      }

      if (format === "png") {
        const target = mapCaptureTargetRef?.current;
        if (!target) {
          throw new Error("La vue carte n'est pas prête pour l'export image.");
        }

        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(target, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#ddf3fd",
        });
        triggerDownloadUrl(dataUrl, pngFilename);
      }
    } catch (error) {
      console.error("Erreur export carte:", error);
      alert(
        format === "png"
          ? "Impossible de générer l'image PNG de la carte."
          : format === "geojson"
            ? "Impossible de générer le GeoJSON de la carte."
            : "Impossible de générer l'export CSV de la carte.",
      );
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        disabled={!canExport || Boolean(isExporting)}
        title={csvFilename}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-100 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:border-sky-300 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50",
          className ?? "",
        ].join(" ")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Exporter la vue de la carte"
      >
        <FileSpreadsheet size={16} aria-hidden="true" />
        {isExporting ? "Export..." : "Exporter la vue"}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label="Formats d'export"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[18rem] overflow-hidden rounded-3xl border border-sky-200/90 bg-white p-2 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.22)]"
        >
          {EXPORT_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={() => void handleExport(action.id)}
              disabled={!canExport || Boolean(isExporting)}
              className="flex w-full items-start justify-between gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="space-y-0.5">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-950">
                  {action.label}
                </span>
                <span className="block text-xs leading-relaxed text-slate-600">
                  {action.description}
                </span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                {action.id === "csv"
                  ? csvFilename
                  : action.id === "geojson"
                    ? geoJsonFilename
                    : pngFilename}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
