import React from "react";
import type { ExportHistoryEntry } from "./use-pdf-export";

export function PdfExportHistory({ history }: { history: ExportHistoryEntry[] }) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-[1.5rem] border border-slate-200/60 bg-white/50 backdrop-blur-md p-4">
      <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted mb-3 ml-1">
        Historique 
      </p>
      <ul className="space-y-2">
        {history.slice(0, 4).map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5 cmm-text-caption bg-white p-2 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors">
            <span className="font-mono font-bold cmm-text-secondary truncate">{item.filename}</span>
            <div className="flex justify-between cmm-text-muted">
              <span className="uppercase tracking-wide">{item.rubrique}</span>
              <span>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.generatedAt))}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
