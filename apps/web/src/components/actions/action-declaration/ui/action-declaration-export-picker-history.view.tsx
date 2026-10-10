import { CmmButton } from "@/components/ui/cmm-button";
import type { ActionDeclarationExportHistoryEntry } from "@/lib/actions/exports/export-form-history";

type ActionDeclarationExportPickerHistoryProps = {
  isCompactViewport: boolean;
  history: ActionDeclarationExportHistoryEntry[];
  handleReplayHistoryEntry: (entry: ActionDeclarationExportHistoryEntry) => Promise<void>;
};

export function ActionDeclarationExportPickerHistory({
  isCompactViewport,
  history,
  handleReplayHistoryEntry,
}: ActionDeclarationExportPickerHistoryProps) {
  return (
    <details
      className="rounded-[1.5rem] border border-slate-200 bg-white p-3"
      open={!isCompactViewport}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            Historique des exports
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Retéléchargez rapidement un fichier déjà produit
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          {history.length}
        </span>
      </summary>

      {history.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {history.slice(0, isCompactViewport ? 2 : 4).map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 sm:px-3 sm:py-3"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {entry.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                    {entry.filename}
                  </p>
                  <p className="mt-1 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                    {entry.sourceLabel}
                  </p>
                </div>

                <CmmButton
                  type="button"
                  tone="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void handleReplayHistoryEntry(entry)}
                >
                  Retélécharger
                </CmmButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Aucun export n’a encore été généré dans cette session.
        </p>
      )}
    </details>
  );
}
